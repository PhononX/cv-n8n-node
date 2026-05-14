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
			'Workspace the message belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getWorkspaces' },
		displayOptions: {
			show: { resource: ['message'], operation: ['removeLabel'] },
		},
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the message',
		displayOptions: {
			show: { resource: ['message'], operation: ['removeLabel'] },
		},
	},
	{
		displayName: 'Label Name or ID',
		name: 'labelId',
		type: 'options',
		required: true,
		default: '',
		description:
			'Label to remove. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getLabels' },
		displayOptions: {
			show: { resource: ['message'], operation: ['removeLabel'] },
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<INodeExecutionData> {
	const workspaceId = this.getNodeParameter('workspaceId', i) as string;
	const messageId = this.getNodeParameter('messageId', i) as string;
	const labelId = this.getNodeParameter('labelId', i) as string;

	if (!workspaceId || !messageId || !labelId) {
		throw new NodeOperationError(
			this.getNode(),
			'Workspace, Message ID, and Label are all required.',
			{ itemIndex: i },
		);
	}

	const response = (await carbonVoiceApiRequest.call(
		this,
		'DELETE',
		`/labels/${labelId}/message/${workspaceId}/${messageId}`,
	)) as IDataObject;

	return { json: response, pairedItem: { item: i } };
}
