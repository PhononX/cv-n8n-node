import type { IHookFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { Operator, type SubscriptionFilter } from '../shared/constants';

export const EVENT_VALUE = 'ai.system.prompt.response.generated';

export const eventOption = {
	name: 'AI System Response Generated',
	value: EVENT_VALUE,
	description:
		'Triggers when an AI response is generated for a curated system prompt',
};

export const description: INodeProperties[] = [
	{
		displayName: 'System Prompt Name or ID',
		name: 'systemPromptId',
		type: 'options',
		required: true,
		default: '',
		description:
			'Which curated system prompt to watch. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getAIPrompts' },
		displayOptions: { show: { event: [EVENT_VALUE] } },
	},
];

export async function buildFilters(
	this: IHookFunctions,
): Promise<SubscriptionFilter[]> {
	const systemPromptId = this.getNodeParameter('systemPromptId') as string;
	if (!systemPromptId) {
		throw new NodeOperationError(
			this.getNode(),
			'System Prompt is required for "AI System Response Generated".',
		);
	}

	return [
		{
			key: 'system_prompt_id',
			value: systemPromptId,
			operator: Operator.EQUALS,
		},
	];
}

// The backend delivers this under the same subscription string as
// "AI Response Generated"; the system_prompt_id filter narrows it.
export const SUBSCRIPTION_EVENT_OVERRIDE = 'ai.prompt.response.generated';
