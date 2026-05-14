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
			'Optional. Used to scope the AI Prompt list below. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getWorkspaces' },
		displayOptions: {
			show: { resource: ['aiPrompt'], operation: ['createResponse'] },
		},
	},
	{
		displayName: 'AI Prompt Name or ID',
		name: 'promptId',
		type: 'options',
		required: true,
		default: '',
		description:
			'Which AI prompt to run. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getAIPrompts',
			loadOptionsDependsOn: ['workspaceId'],
		},
		displayOptions: {
			show: { resource: ['aiPrompt'], operation: ['createResponse'] },
		},
	},
	{
		displayName: 'Message IDs',
		name: 'messageIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'msg_123, msg_456',
		description:
			'Comma-separated list of message IDs to feed into the prompt',
		displayOptions: {
			show: { resource: ['aiPrompt'], operation: ['createResponse'] },
		},
	},
	{
		displayName: 'Language',
		name: 'language',
		type: 'string',
		required: true,
		default: 'english',
		description:
			'Output language for the response (e.g. english, spanish, french)',
		displayOptions: {
			show: { resource: ['aiPrompt'], operation: ['createResponse'] },
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<INodeExecutionData> {
	const promptId = this.getNodeParameter('promptId', i) as string;
	if (!promptId) {
		throw new NodeOperationError(this.getNode(), 'AI Prompt is required.', {
			itemIndex: i,
		});
	}

	const messageIdsRaw = this.getNodeParameter('messageIds', i) as string;
	const messageIds = messageIdsRaw
		.split(',')
		.map((m) => m.trim())
		.filter(Boolean);
	if (!messageIds.length) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one Message ID is required.',
			{ itemIndex: i },
		);
	}

	const language = this.getNodeParameter('language', i) as string;

	const body: IDataObject = {
		prompt_id: promptId,
		message_ids: messageIds,
		language,
	};

	const response = (await carbonVoiceApiRequest.call(
		this,
		'POST',
		'/responses',
		body,
	)) as IDataObject;

	return { json: response, pairedItem: { item: i } };
}
