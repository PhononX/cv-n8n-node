import type { IHookFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { Operator, type SubscriptionFilter } from '../shared/constants';

export const EVENT_VALUE = 'message.posted.to.conversation';

export const eventOption = {
	name: 'Message Posted to Conversation',
	value: EVENT_VALUE,
	description:
		'Triggers when a message is posted to a specific conversation (includes your own)',
};

export const description: INodeProperties[] = [
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		default: '',
		description:
			'Workspace the conversation belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getWorkspaces' },
		displayOptions: { show: { event: [EVENT_VALUE] } },
	},
	{
		displayName: 'Conversation Name or ID',
		name: 'conversationId',
		type: 'options',
		required: true,
		default: '',
		description:
			'Conversation to watch. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getConversations',
			loadOptionsDependsOn: ['workspaceId'],
		},
		displayOptions: { show: { event: [EVENT_VALUE] } },
	},
];

export async function buildFilters(
	this: IHookFunctions,
): Promise<SubscriptionFilter[]> {
	const conversationId = this.getNodeParameter('conversationId') as string;
	if (!conversationId) {
		throw new NodeOperationError(
			this.getNode(),
			'Conversation is required for "Message Posted to Conversation".',
		);
	}

	// Backend uses the underlying "message.posted.to.channel" event but
	// scopes to a single conversation via the _id filter on the channel.
	return [
		{
			key: '_id',
			value: conversationId,
			operator: Operator.EQUALS,
		},
	];
}

// This event is delivered under the same subscription string as
// "New Message Received"; the difference is only the filter scope.
export const SUBSCRIPTION_EVENT_OVERRIDE = 'message.posted.to.channel';
