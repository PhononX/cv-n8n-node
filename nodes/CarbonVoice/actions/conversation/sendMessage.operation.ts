import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { carbonVoiceApiRequest } from '../../shared/transport';

export const description: INodeProperties[] = [
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
				operation: ['sendMessage'],
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
				operation: ['sendMessage'],
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
				operation: ['sendMessage'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<INodeExecutionData> {
	const conversationId = this.getNodeParameter('conversationId', i) as string;
	if (!conversationId) {
		throw new NodeOperationError(
			this.getNode(),
			'Conversation is required for Send Message.',
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

	const response = (await carbonVoiceApiRequest.call(
		this,
		'POST',
		`/simplified/messages/conversation/${conversationId}`,
		body,
	)) as IDataObject;

	return { json: response, pairedItem: { item: i } };
}
