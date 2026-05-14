import type { IHookFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { Operator, type SubscriptionFilter } from '../shared/constants';

export const EVENT_VALUE = 'ai.prompt.response.generated';

export const eventOption = {
	name: 'AI Response Generated',
	value: EVENT_VALUE,
	description:
		'Triggers when an AI response is generated for a specific prompt',
};

export const description: INodeProperties[] = [
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		default: '',
		description:
			'Optional. Restrict prompts to a single workspace. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getWorkspaces' },
		displayOptions: { show: { event: [EVENT_VALUE] } },
	},
	{
		displayName: 'AI Prompt Name or ID',
		name: 'promptId',
		type: 'options',
		required: true,
		default: '',
		description:
			'Which AI prompt to watch for responses on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getAIPrompts',
			loadOptionsDependsOn: ['workspaceId'],
		},
		displayOptions: { show: { event: [EVENT_VALUE] } },
	},
];

export async function buildFilters(
	this: IHookFunctions,
): Promise<SubscriptionFilter[]> {
	const promptId = this.getNodeParameter('promptId') as string;
	if (!promptId) {
		throw new NodeOperationError(
			this.getNode(),
			'AI Prompt is required for "AI Response Generated".',
		);
	}

	return [
		{
			key: '_id',
			value: promptId,
			operator: Operator.EQUALS,
		},
	];
}
