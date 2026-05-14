import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	getContacts,
	getConversations,
	getWorkspaces,
} from './shared/loadOptions';
import { carbonVoiceApiRequest } from './shared/transport';

export class CarbonVoice implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Carbon Voice',
		name: 'carbonVoice',
		icon: {
			light: 'file:../../icons/carbonvoice.svg',
			dark: 'file:../../icons/carbonvoice.dark.svg',
		},
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send messages, voice memos, and manage Carbon Voice resources',
		defaults: {
			name: 'Carbon Voice',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'carbonVoiceOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'conversation',
				options: [
					{
						name: 'Conversation',
						value: 'conversation',
					},
				],
			},
			// ────────────────────────────────────────────────
			// Conversation operations
			// ────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'sendMessage',
				displayOptions: {
					show: { resource: ['conversation'] },
				},
				options: [
					{
						name: 'Send Direct Message',
						value: 'sendDirectMessage',
						action: 'Send a direct message to one or more users',
						description:
							'Open or reuse a direct conversation with one or more users and post a message',
					},
					{
						name: 'Send Message',
						value: 'sendMessage',
						action: 'Send a message to a conversation',
						description: 'Post a text message to an existing conversation',
					},
				],
			},
			// ── Send Message ────────────────────────────────
			{
				displayName: 'Workspace Name or ID',
				name: 'workspaceId',
				type: 'options',
				default: '',
				description:
					'Workspace the conversation belongs to (used to filter the list below). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: { loadOptionsMethod: 'getWorkspaces' },
				displayOptions: {
					show: {
						resource: ['conversation'],
						operation: ['sendMessage', 'sendDirectMessage'],
					},
				},
			},
			{
				displayName: 'Conversation Name or ID',
				name: 'conversationId',
				type: 'options',
				required: true,
				default: '',
				description:
					'Target conversation. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getConversations',
					loadOptionsDependsOn: ['workspaceId'],
				},
				displayOptions: {
					show: {
						resource: ['conversation'],
						operation: ['sendMessage'],
					},
				},
			},
			// ── Send Direct Message ─────────────────────────
			{
				displayName: 'Recipient Names or IDs',
				name: 'userIds',
				type: 'multiOptions',
				default: [],
				description:
					'One or more users to send to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: { loadOptionsMethod: 'getContacts' },
				displayOptions: {
					show: {
						resource: ['conversation'],
						operation: ['sendDirectMessage'],
					},
				},
			},
			{
				displayName: 'Recipient Emails',
				name: 'userEmails',
				type: 'string',
				default: '',
				placeholder: 'alice@example.com, bob@example.com',
				description:
					'Comma-separated list of emails. Alternative to selecting users from the dropdown — useful for invitees who are not yet in your contacts.',
				displayOptions: {
					show: {
						resource: ['conversation'],
						operation: ['sendDirectMessage'],
					},
				},
			},
			// ── Shared body ─────────────────────────────────
			{
				displayName: 'Message Text',
				name: 'transcript',
				type: 'string',
				required: true,
				typeOptions: { rows: 4 },
				default: '',
				description: 'The text body of the message',
				displayOptions: {
					show: {
						resource: ['conversation'],
						operation: ['sendMessage', 'sendDirectMessage'],
					},
				},
			},
			{
				displayName: 'Link Attachments',
				name: 'links',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/file.pdf, https://docs.example.com',
				description:
					'Optional. Comma-separated list of URLs to attach to the message.',
				displayOptions: {
					show: {
						resource: ['conversation'],
						operation: ['sendMessage', 'sendDirectMessage'],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			getWorkspaces,
			getConversations,
			getContacts,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				if (resource !== 'conversation') {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported resource: ${resource}`,
						{ itemIndex: i },
					);
				}

				const transcript = this.getNodeParameter('transcript', i) as string;
				const linksRaw = this.getNodeParameter('links', i, '') as string;
				const links = linksRaw
					.split(',')
					.map((l) => l.trim())
					.filter(Boolean);

				const body: IDataObject = {
					from_message_type: 'NewMessage',
					body_type: 'TextMessage',
					transcript,
				};
				if (links.length) body.links = links;

				let response: IDataObject;

				if (operation === 'sendMessage') {
					const conversationId = this.getNodeParameter(
						'conversationId',
						i,
					) as string;
					if (!conversationId) {
						throw new NodeOperationError(
							this.getNode(),
							'Conversation is required for Send Message.',
							{ itemIndex: i },
						);
					}

					response = (await carbonVoiceApiRequest.call(
						this,
						'POST',
						`/simplified/messages/conversation/${conversationId}`,
						body,
					)) as IDataObject;
				} else if (operation === 'sendDirectMessage') {
					const workspaceId = this.getNodeParameter(
						'workspaceId',
						i,
						'',
					) as string;
					const userIds = this.getNodeParameter('userIds', i, []) as string[];
					const emailsRaw = this.getNodeParameter(
						'userEmails',
						i,
						'',
					) as string;
					const emails = emailsRaw
						.split(',')
						.map((e) => e.trim())
						.filter(Boolean);

					if (!userIds.length && !emails.length) {
						throw new NodeOperationError(
							this.getNode(),
							'At least one recipient (user or email) is required for Send Direct Message.',
							{ itemIndex: i },
						);
					}
					if (!workspaceId) {
						throw new NodeOperationError(
							this.getNode(),
							'Workspace is required for Send Direct Message.',
							{ itemIndex: i },
						);
					}

					body.workspace_id = workspaceId;
					body.to = {
						user_ids: userIds.length ? userIds : undefined,
						emails: emails.length ? emails : undefined,
					};

					response = (await carbonVoiceApiRequest.call(
						this,
						'POST',
						'/simplified/messages/direct',
						body,
					)) as IDataObject;
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation: ${operation}`,
						{ itemIndex: i },
					);
				}

				results.push({ json: response, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					results.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex: i,
				});
			}
		}

		return [results];
	}
}
