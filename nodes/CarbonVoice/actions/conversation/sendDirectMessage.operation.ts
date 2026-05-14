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
		required: true,
		default: '',
		description:
			'Workspace the direct conversation will be created in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getWorkspaces' },
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['sendDirectMessage'],
			},
		},
	},
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
				operation: ['sendDirectMessage'],
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
				operation: ['sendDirectMessage'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<INodeExecutionData> {
	const workspaceId = this.getNodeParameter('workspaceId', i, '') as string;
	const userIds = this.getNodeParameter('userIds', i, []) as string[];
	const emailsRaw = this.getNodeParameter('userEmails', i, '') as string;
	const emails = emailsRaw
		.split(',')
		.map((e) => e.trim())
		.filter(Boolean);

	if (!workspaceId) {
		throw new NodeOperationError(
			this.getNode(),
			'Workspace is required for Send Direct Message.',
			{ itemIndex: i },
		);
	}
	if (!userIds.length && !emails.length) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one recipient (user or email) is required for Send Direct Message.',
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
		workspace_id: workspaceId,
		to: {
			user_ids: userIds.length ? userIds : undefined,
			emails: emails.length ? emails : undefined,
		},
	};
	if (links.length) body.links = links;

	const response = (await carbonVoiceApiRequest.call(
		this,
		'POST',
		'/simplified/messages/direct',
		body,
	)) as IDataObject;

	return { json: response, pairedItem: { item: i } };
}
