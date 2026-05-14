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
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'Short title of the action item',
		displayOptions: {
			show: { resource: ['actionItem'], operation: ['create'] },
		},
	},
	{
		displayName: 'Notes',
		name: 'notesText',
		type: 'string',
		default: '',
		typeOptions: { rows: 3 },
		description: 'Optional. Body / details of the action item.',
		displayOptions: {
			show: { resource: ['actionItem'], operation: ['create'] },
		},
	},
	{
		displayName: 'Container Type',
		name: 'containerType',
		type: 'options',
		required: true,
		default: 'channel',
		description: 'Where to attach the action item',
		options: [
			{ name: 'Conversation', value: 'channel' },
			{ name: 'Folder', value: 'folder' },
		],
		displayOptions: {
			show: { resource: ['actionItem'], operation: ['create'] },
		},
	},
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		default: '',
		description:
			'Workspace the container belongs to (filters the next dropdown). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getWorkspaces' },
		displayOptions: {
			show: { resource: ['actionItem'], operation: ['create'] },
		},
	},
	{
		displayName: 'Conversation Name or ID',
		name: 'conversationId',
		type: 'options',
		required: true,
		default: '',
		description:
			'Conversation to attach this action item to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getConversations',
			loadOptionsDependsOn: ['workspaceId'],
		},
		displayOptions: {
			show: {
				resource: ['actionItem'],
				operation: ['create'],
				containerType: ['channel'],
			},
		},
	},
	{
		displayName: 'Folder Name or ID',
		name: 'folderId',
		type: 'options',
		required: true,
		default: '',
		description:
			'Folder to attach this action item to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getVoiceMemoFolders',
			loadOptionsDependsOn: ['workspaceId'],
		},
		displayOptions: {
			show: {
				resource: ['actionItem'],
				operation: ['create'],
				containerType: ['folder'],
			},
		},
	},
	{
		displayName: 'Assigned To Name or ID',
		name: 'assignedTo',
		type: 'options',
		default: '',
		description:
			'Optional. Who is responsible for the action item. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getContacts' },
		displayOptions: {
			show: { resource: ['actionItem'], operation: ['create'] },
		},
	},
	{
		displayName: 'Due Date',
		name: 'dueDate',
		type: 'string',
		default: '',
		placeholder: '2026-12-31',
		description: 'Optional. ISO 8601 date.',
		displayOptions: {
			show: { resource: ['actionItem'], operation: ['create'] },
		},
	},
	{
		displayName: 'Source Message ID',
		name: 'sourceMessageId',
		type: 'string',
		default: '',
		description:
			'Optional. ID of the message that the action item was derived from.',
		displayOptions: {
			show: { resource: ['actionItem'], operation: ['create'] },
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<INodeExecutionData> {
	const title = this.getNodeParameter('title', i) as string;
	const notesText = this.getNodeParameter('notesText', i, '') as string;
	const containerType = this.getNodeParameter('containerType', i) as
		| 'channel'
		| 'folder';
	const containerId =
		containerType === 'channel'
			? (this.getNodeParameter('conversationId', i) as string)
			: (this.getNodeParameter('folderId', i) as string);

	if (!title) {
		throw new NodeOperationError(this.getNode(), 'Title is required.', {
			itemIndex: i,
		});
	}
	if (!containerId) {
		throw new NodeOperationError(
			this.getNode(),
			'A conversation or folder is required.',
			{ itemIndex: i },
		);
	}

	const body: IDataObject = {
		title,
		container_type: containerType,
		container_id: containerId,
	};
	if (notesText) body.notes_text = notesText;

	const assignedTo = this.getNodeParameter('assignedTo', i, '') as string;
	if (assignedTo) body.assigned_to = assignedTo;

	const dueDate = this.getNodeParameter('dueDate', i, '') as string;
	if (dueDate) body.due_date = dueDate;

	const sourceMessageId = this.getNodeParameter(
		'sourceMessageId',
		i,
		'',
	) as string;
	if (sourceMessageId) body.source_message_id = sourceMessageId;

	const response = (await carbonVoiceApiRequest.call(
		this,
		'POST',
		'/action-items',
		body,
	)) as IDataObject;

	return { json: response, pairedItem: { item: i } };
}
