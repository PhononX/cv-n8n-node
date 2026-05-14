import type { IHookFunctions, INodeProperties } from 'n8n-workflow';

import type { SubscriptionFilter } from '../shared/constants';
import {
	actionItemFilterProperties,
	buildActionItemFilters,
} from './_actionItemFilters';

export const EVENT_VALUE = 'action-item.deleted';

export const eventOption = {
	name: 'Action Item Deleted',
	value: EVENT_VALUE,
	description: 'Triggers when an action item is deleted',
};

export const description: INodeProperties[] = actionItemFilterProperties(
	EVENT_VALUE,
);

export async function buildFilters(
	this: IHookFunctions,
): Promise<SubscriptionFilter[]> {
	return await buildActionItemFilters.call(this);
}
