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
		displayName: 'Message ID',
		name: 'sharedMessageId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the message to share',
		displayOptions: {
			show: { resource: ['message'], operation: ['createShareLink'] },
		},
	},
	{
		displayName: 'Access Type',
		name: 'accessType',
		type: 'options',
		default: 'public',
		description: 'Who can access this share link',
		options: [
			{ name: 'Public (Anyone with the Link)', value: 'public' },
			{
				name: 'Specified (Limited to Certain Users/Workspaces/Conversations)',
				value: 'specified',
			},
		],
		displayOptions: {
			show: { resource: ['message'], operation: ['createShareLink'] },
		},
	},
	{
		displayName: 'Expires At',
		name: 'endAccessAt',
		type: 'string',
		default: '',
		placeholder: '2026-12-31T23:59:59Z',
		description: 'Optional. ISO 8601 datetime when the share link expires.',
		displayOptions: {
			show: { resource: ['message'], operation: ['createShareLink'] },
		},
	},
	{
		displayName: 'Allowed Conversation Names or IDs',
		name: 'allowedConversationIds',
		type: 'multiOptions',
		default: [],
		description:
			'Only used when Access Type is "Specified". Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getConversations' },
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createShareLink'],
				accessType: ['specified'],
			},
		},
	},
	{
		displayName: 'Allowed Workspace Names or IDs',
		name: 'allowedWorkspaceIds',
		type: 'multiOptions',
		default: [],
		description:
			'Only used when Access Type is "Specified". Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getWorkspaces' },
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createShareLink'],
				accessType: ['specified'],
			},
		},
	},
	{
		displayName: 'Allowed User Names or IDs',
		name: 'allowedUserIds',
		type: 'multiOptions',
		default: [],
		description:
			'Only used when Access Type is "Specified". Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getContacts' },
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createShareLink'],
				accessType: ['specified'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<INodeExecutionData> {
	const sharedMessageId = this.getNodeParameter('sharedMessageId', i) as string;
	const accessType = this.getNodeParameter('accessType', i) as
		| 'public'
		| 'specified';

	if (!sharedMessageId) {
		throw new NodeOperationError(this.getNode(), 'Message ID is required.', {
			itemIndex: i,
		});
	}

	const body: IDataObject = {
		shared_message_id: sharedMessageId,
		share_type: 'link',
		access_type: accessType,
	};

	const endAccessAt = this.getNodeParameter('endAccessAt', i, '') as string;
	if (endAccessAt) body.end_access_at = endAccessAt;

	if (accessType === 'specified') {
		const specifiedAccess: Array<{ type: string; ids: string[] }> = [];
		const conversationIds = this.getNodeParameter(
			'allowedConversationIds',
			i,
			[],
		) as string[];
		const workspaceIds = this.getNodeParameter(
			'allowedWorkspaceIds',
			i,
			[],
		) as string[];
		const userIds = this.getNodeParameter(
			'allowedUserIds',
			i,
			[],
		) as string[];

		if (conversationIds.length)
			specifiedAccess.push({ type: 'channel', ids: conversationIds });
		if (workspaceIds.length)
			specifiedAccess.push({ type: 'workspace', ids: workspaceIds });
		if (userIds.length)
			specifiedAccess.push({ type: 'user', ids: userIds });

		if (!specifiedAccess.length) {
			throw new NodeOperationError(
				this.getNode(),
				'At least one allowed conversation, workspace, or user is required when Access Type is "Specified".',
				{ itemIndex: i },
			);
		}

		body.specified_access = specifiedAccess;
	}

	const response = (await carbonVoiceApiRequest.call(
		this,
		'POST',
		'/simplified/message-sharelinks',
		body,
	)) as IDataObject;

	return { json: response, pairedItem: { item: i } };
}
