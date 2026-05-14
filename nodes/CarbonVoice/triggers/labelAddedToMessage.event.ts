import type { IHookFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { Operator, type SubscriptionFilter } from '../shared/constants';

export const EVENT_VALUE = 'message.label.added';

export const eventOption = {
	name: 'Label Added to Message',
	value: EVENT_VALUE,
	description: 'Triggers when a specific label is applied to any message',
};

export const description: INodeProperties[] = [
	{
		displayName: 'Label Name or ID',
		name: 'labelId',
		type: 'options',
		required: true,
		default: '',
		description:
			'Which label to watch for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getLabels' },
		displayOptions: { show: { event: [EVENT_VALUE] } },
	},
];

export async function buildFilters(
	this: IHookFunctions,
): Promise<SubscriptionFilter[]> {
	const labelId = this.getNodeParameter('labelId') as string;
	if (!labelId) {
		throw new NodeOperationError(
			this.getNode(),
			'Label is required for "Label Added to Message".',
		);
	}

	return [
		{
			key: '_id',
			value: labelId,
			operator: Operator.EQUALS,
		},
	];
}
