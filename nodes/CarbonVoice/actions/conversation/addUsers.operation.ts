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
			'Workspace of the target conversation. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getWorkspaces' },
		displayOptions: {
			show: { resource: ['conversation'], operation: ['addUsers'] },
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
			show: { resource: ['conversation'], operation: ['addUsers'] },
		},
	},
	{
		displayName: 'User Names or IDs',
		name: 'userIds',
		type: 'multiOptions',
		default: [],
		description:
			'Users to add. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getContacts' },
		displayOptions: {
			show: { resource: ['conversation'], operation: ['addUsers'] },
		},
	},
	{
		displayName: 'User Emails',
		name: 'userEmails',
		type: 'string',
		default: '',
		placeholder: 'alice@example.com, bob@example.com',
		description:
			'Comma-separated emails. Use for users not yet in your contacts.',
		displayOptions: {
			show: { resource: ['conversation'], operation: ['addUsers'] },
		},
	},
	{
		displayName: 'Role',
		name: 'role',
		type: 'options',
		default: 'member',
		description: 'Role to assign to the added users',
		options: [
			{ name: 'Member', value: 'member' },
			{ name: 'Admin', value: 'admin' },
		],
		displayOptions: {
			show: { resource: ['conversation'], operation: ['addUsers'] },
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
			'Conversation is required for Add Users.',
			{ itemIndex: i },
		);
	}

	const userIds = this.getNodeParameter('userIds', i, []) as string[];
	const emailsRaw = this.getNodeParameter('userEmails', i, '') as string;
	const emails = emailsRaw
		.split(',')
		.map((e) => e.trim())
		.filter(Boolean);

	if (!userIds.length && !emails.length) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one user (ID or email) is required.',
			{ itemIndex: i },
		);
	}

	const role = this.getNodeParameter('role', i) as string;

	const body: IDataObject = {
		users: {
			ids: userIds.length ? userIds : undefined,
			emails: emails.length ? emails : undefined,
		},
		role,
	};

	const response = (await carbonVoiceApiRequest.call(
		this,
		'POST',
		`/simplified/conversations/${conversationId}/users`,
		body,
	)) as IDataObject;

	return { json: response, pairedItem: { item: i } };
}
