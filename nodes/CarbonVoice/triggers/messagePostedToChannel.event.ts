import type { IHookFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { Operator, type SubscriptionFilter } from '../shared/constants';
import { getWhoAmI } from '../shared/transport';

export const EVENT_VALUE = 'message.posted.to.channel';

export const eventOption = {
	name: 'New Message Received',
	value: EVENT_VALUE,
	description:
		'Triggers when a new message is posted in any conversation (excludes your own messages)',
};

export const description: INodeProperties[] = [
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		default: '',
		description:
			'Restrict to a single workspace. Choose "All Workspaces" to receive events from everywhere. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getWorkspaces' },
		displayOptions: { show: { event: [EVENT_VALUE] } },
	},
];

export async function buildFilters(
	this: IHookFunctions,
): Promise<SubscriptionFilter[]> {
	const me = await getWhoAmI.call(this);
	if (!me?.user_guid) {
		throw new NodeOperationError(
			this.getNode(),
			'Unable to resolve authenticated user — cannot subscribe.',
		);
	}

	const filters: SubscriptionFilter[] = [
		{
			key: 'creator_id',
			value: me.user_guid,
			operator: Operator.NOT_EQUALS,
		},
	];

	const workspaceId = this.getNodeParameter('workspaceId', '') as string;
	if (workspaceId) {
		filters.push({
			key: 'workspace_ids',
			value: [workspaceId],
			operator: Operator.IN,
		});
	}

	return filters;
}
