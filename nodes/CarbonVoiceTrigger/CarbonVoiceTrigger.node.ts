import {
	NodeConnectionTypes,
	NodeOperationError,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type IDataObject,
} from 'n8n-workflow';

import { Operator, type SubscriptionFilter } from './shared/constants';
import { carbonVoiceApiRequest, getWhoAmI } from './shared/transport';

export class CarbonVoiceTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Carbon Voice Trigger',
		name: 'carbonVoiceTrigger',
		icon: {
			light: 'file:../../icons/carbonvoice.svg',
			dark: 'file:../../icons/carbonvoice.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when a Carbon Voice event fires',
		defaults: {
			name: 'Carbon Voice Trigger',
		},
		usableAsTool: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'carbonVoiceOAuth2Api',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: 'message.posted.to.channel',
				options: [
					{
						name: 'New Message Received',
						value: 'message.posted.to.channel',
						description: 'Triggers when a new message is posted in any conversation (excludes your own messages)',
					},
				],
			},
			{
				displayName: 'Workspace ID',
				name: 'workspaceId',
				type: 'string',
				default: '',
				description: 'Optional. Restrict to a single workspace.',
				displayOptions: {
					show: {
						event: ['message.posted.to.channel'],
					},
				},
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				return Boolean(webhookData.subscriptionId);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;
				const workspaceId = this.getNodeParameter('workspaceId', '') as string;

				const me = await getWhoAmI.call(this);
				if (!me?.user_guid) {
					throw new NodeOperationError(
						this.getNode(),
						'Unable to resolve authenticated user — cannot subscribe.',
					);
				}

				const subscription_filters: SubscriptionFilter[] = [
					{
						key: 'creator_id',
						value: me.user_guid,
						operator: Operator.NOT_EQUALS,
					},
				];

				if (workspaceId) {
					subscription_filters.push({
						key: 'workspace_id',
						value: workspaceId,
						operator: Operator.EQUALS,
					});
				}

				const credentials = await this.getCredentials('carbonVoiceOAuth2Api');
				const clientId = credentials.clientId as string;

				const body: IDataObject = {
					webhookURL: webhookUrl,
					subscriptions: [event],
					subscription_filters,
				};

				const response = (await carbonVoiceApiRequest.call(
					this,
					'POST',
					`/apps/${clientId}/subscribe`,
					body,
				)) as { id?: string; data?: { id?: string } };

				const subscriptionId = response?.id ?? response?.data?.id;
				if (!subscriptionId) {
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.subscriptionId = subscriptionId;
				webhookData.clientId = clientId;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const subscriptionId = webhookData.subscriptionId as string | undefined;
				const clientId = webhookData.clientId as string | undefined;

				if (!subscriptionId || !clientId) {
					return true;
				}

				try {
					await carbonVoiceApiRequest.call(
						this,
						'DELETE',
						`/apps/${clientId}/unsubscribe/${subscriptionId}`,
					);
				} catch {
					return false;
				}

				delete webhookData.subscriptionId;
				delete webhookData.clientId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as IDataObject;

		return {
			workflowData: [this.helpers.returnJsonArray([bodyData])],
		};
	}
}
