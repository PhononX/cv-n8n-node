import type { IHookFunctions, INodeProperties } from 'n8n-workflow';

import type { SubscriptionFilter } from '../shared/constants';
import {
	actionItemFilterProperties,
	buildActionItemFilters,
} from './_actionItemFilters';

export const EVENT_VALUE = 'action-item.created';

export const eventOption = {
	name: 'Action Item Created',
	value: EVENT_VALUE,
	description: 'Triggers when a new action item is created',
};

export const description: INodeProperties[] = actionItemFilterProperties(
	EVENT_VALUE,
);

export async function buildFilters(
	this: IHookFunctions,
): Promise<SubscriptionFilter[]> {
	return await buildActionItemFilters.call(this);
}
