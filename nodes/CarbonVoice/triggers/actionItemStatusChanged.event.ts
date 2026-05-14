import type { IHookFunctions, INodeProperties } from 'n8n-workflow';

import type { SubscriptionFilter } from '../shared/constants';
import {
	actionItemFilterProperties,
	buildActionItemFilters,
} from './_actionItemFilters';

export const EVENT_VALUE = 'action-item.status.changed';

export const eventOption = {
	name: 'Action Item Status Changed',
	value: EVENT_VALUE,
	description: 'Triggers when an action item changes status',
};

export const description: INodeProperties[] = actionItemFilterProperties(
	EVENT_VALUE,
	{ includeStatusFilter: true },
);

export async function buildFilters(
	this: IHookFunctions,
): Promise<SubscriptionFilter[]> {
	return await buildActionItemFilters.call(this);
}
