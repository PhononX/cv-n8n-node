import type {
	IHookFunctions,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { SubscriptionFilter } from '../shared/constants';
import * as messagePostedToChannel from './messagePostedToChannel.event';

type EventModule = {
	EVENT_VALUE: string;
	eventOption: INodePropertyOptions;
	description: INodeProperties[];
	buildFilters: (this: IHookFunctions) => Promise<SubscriptionFilter[]>;
};

// One entry per event. Adding a new trigger event = drop a new event file
// and register it here.
const events: EventModule[] = [messagePostedToChannel];

const eventProperty: INodeProperties = {
	displayName: 'Event',
	name: 'event',
	type: 'options',
	required: true,
	default: 'message.posted.to.channel',
	options: events.map((e) => e.eventOption),
};

export const triggerProperties: INodeProperties[] = [
	eventProperty,
	...events.flatMap((e) => e.description),
];

export async function buildFiltersForEvent(
	this: IHookFunctions,
): Promise<SubscriptionFilter[]> {
	const eventValue = this.getNodeParameter('event') as string;
	const event = events.find((e) => e.EVENT_VALUE === eventValue);
	if (!event) {
		throw new NodeOperationError(
			this.getNode(),
			`Unsupported event: ${eventValue}`,
		);
	}
	return await event.buildFilters.call(this);
}
