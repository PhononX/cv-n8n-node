import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import {
	getAIPrompts,
	getContacts,
	getConversations,
	getLabels,
	getVoiceMemoFolders,
	getWorkspaces,
} from './shared/loadOptions';
import { carbonVoiceApiRequest } from './shared/transport';
import {
	buildFiltersForEvent,
	subscriptionEventForCurrent,
	triggerProperties,
} from './triggers/router';

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
		defaults: { name: 'Carbon Voice Trigger' },
		usableAsTool: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'carbonVoiceApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: triggerProperties,
	};

	methods = {
		loadOptions: {
			getWorkspaces,
			getConversations,
			getContacts,
			getVoiceMemoFolders,
			getLabels,
			getAIPrompts,
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				return Boolean(webhookData.subscriptionId);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const subscriptionEvent = subscriptionEventForCurrent.call(this);
				const subscription_filters = await buildFiltersForEvent.call(this);

				const body: IDataObject = {
					webhookURL: webhookUrl,
					subscriptions: [subscriptionEvent],
					subscription_filters,
				};

				const response = (await carbonVoiceApiRequest.call(
					this,
					'POST',
					'/apps/subscribe',
					body,
				)) as IDataObject;

				const subscriptionId =
					(response?.id as string | undefined) ??
					((response?.data as IDataObject | undefined)?.id as
						| string
						| undefined);

				if (!subscriptionId) {
					throw new NodeOperationError(
						this.getNode(),
						`Subscribe succeeded but response did not contain a subscription id. Response was: ${JSON.stringify(
							response,
						)}`,
					);
				}

				// The subscribe response carries the client_id the backend bound
				// this subscription to. We stash it so delete() can target the
				// correct /apps/{client_id}/unsubscribe/{id} path later.
				const clientIdFromResponse =
					(response?.client_id as string | undefined) ??
					((response?.data as IDataObject | undefined)?.client_id as
						| string
						| undefined);

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.subscriptionId = subscriptionId;
				if (clientIdFromResponse) {
					webhookData.clientId = clientIdFromResponse;
				}
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const subscriptionId = webhookData.subscriptionId as string | undefined;
				const clientId = webhookData.clientId as string | undefined;

				if (!subscriptionId || !clientId) {
					// Nothing registered, or we never captured the client_id —
					// nothing safe to delete.
					delete webhookData.subscriptionId;
					delete webhookData.clientId;
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
