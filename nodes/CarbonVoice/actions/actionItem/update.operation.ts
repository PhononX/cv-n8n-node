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
		displayName: 'Action Item ID',
		name: 'actionItemId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the action item to update',
		displayOptions: {
			show: { resource: ['actionItem'], operation: ['update'] },
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'Leave blank to keep the existing title',
		displayOptions: {
			show: { resource: ['actionItem'], operation: ['update'] },
		},
	},
	{
		displayName: 'Notes',
		name: 'notesText',
		type: 'string',
		default: '',
		typeOptions: { rows: 3 },
		description: 'Leave blank to keep the existing notes',
		displayOptions: {
			show: { resource: ['actionItem'], operation: ['update'] },
		},
	},
	{
		displayName: 'Assigned To Name or ID',
		name: 'assignedTo',
		type: 'options',
		default: '',
		description:
			'Leave blank to keep the existing assignee. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getContacts' },
		displayOptions: {
			show: { resource: ['actionItem'], operation: ['update'] },
		},
	},
	{
		displayName: 'Due Date',
		name: 'dueDate',
		type: 'string',
		default: '',
		placeholder: '2026-12-31',
		description: 'ISO 8601 date. Leave blank to keep the existing due date.',
		displayOptions: {
			show: { resource: ['actionItem'], operation: ['update'] },
		},
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: '',
		description: 'Leave blank to keep the existing status',
		options: [
			{ name: '(Keep Current)', value: '' },
			{ name: 'Suggested', value: 'suggested' },
			{ name: 'To Do', value: 'todo' },
			{ name: 'Done', value: 'done' },
		],
		displayOptions: {
			show: { resource: ['actionItem'], operation: ['update'] },
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<INodeExecutionData> {
	const id = this.getNodeParameter('actionItemId', i) as string;
	if (!id) {
		throw new NodeOperationError(
			this.getNode(),
			'Action Item ID is required.',
			{ itemIndex: i },
		);
	}

	const body: IDataObject = {};
	const title = this.getNodeParameter('title', i, '') as string;
	if (title) body.title = title;
	const notesText = this.getNodeParameter('notesText', i, '') as string;
	if (notesText) body.notes_text = notesText;
	const assignedTo = this.getNodeParameter('assignedTo', i, '') as string;
	if (assignedTo) body.assigned_to = assignedTo;
	const dueDate = this.getNodeParameter('dueDate', i, '') as string;
	if (dueDate) body.due_date = dueDate;

	// Status uses a separate endpoint
	const status = this.getNodeParameter('status', i, '') as string;

	let response: IDataObject = {};
	if (Object.keys(body).length) {
		response = (await carbonVoiceApiRequest.call(
			this,
			'PUT',
			`/action-items/${id}`,
			body,
		)) as IDataObject;
	}

	if (status) {
		response = (await carbonVoiceApiRequest.call(
			this,
			'PATCH',
			`/action-items/${id}/status`,
			{ status },
		)) as IDataObject;
	}

	return { json: response, pairedItem: { item: i } };
}
