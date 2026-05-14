import type {
	IHookFunctions,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { SubscriptionFilter } from '../shared/constants';
import * as actionItemCreated from './actionItemCreated.event';
import * as actionItemDeleted from './actionItemDeleted.event';
import * as actionItemStatusChanged from './actionItemStatusChanged.event';
import * as actionItemUpdated from './actionItemUpdated.event';
import * as aiResponseGenerated from './aiResponseGenerated.event';
import * as aiSystemResponseGenerated from './aiSystemResponseGenerated.event';
import * as labelAddedToMessage from './labelAddedToMessage.event';
import * as messagePostedToChannel from './messagePostedToChannel.event';
import * as messagePostedToConversation from './messagePostedToConversation.event';
import * as messageVoicememoCreated from './messageVoicememoCreated.event';

type EventModule = {
	EVENT_VALUE: string;
	// When the n8n-side event value doesn't match the server-side subscription
	// string (e.g. "Message Posted to Conversation" is delivered as
	// "message.posted.to.channel" with a conversation_id filter), the module
	// exports SUBSCRIPTION_EVENT_OVERRIDE with the wire-level event name.
	SUBSCRIPTION_EVENT_OVERRIDE?: string;
	eventOption: INodePropertyOptions;
	description: INodeProperties[];
	buildFilters: (this: IHookFunctions) => Promise<SubscriptionFilter[]>;
};

const events: EventModule[] = [
	messagePostedToChannel,
	messageVoicememoCreated,
	messagePostedToConversation,
	labelAddedToMessage,
	aiResponseGenerated,
	aiSystemResponseGenerated,
	actionItemCreated,
	actionItemUpdated,
	actionItemDeleted,
	actionItemStatusChanged,
];

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

function resolveEvent(this: IHookFunctions): EventModule {
	const eventValue = this.getNodeParameter('event') as string;
	const event = events.find((e) => e.EVENT_VALUE === eventValue);
	if (!event) {
		throw new NodeOperationError(
			this.getNode(),
			`Unsupported event: ${eventValue}`,
		);
	}
	return event;
}

export async function buildFiltersForEvent(
	this: IHookFunctions,
): Promise<SubscriptionFilter[]> {
	return await resolveEvent.call(this).buildFilters.call(this);
}

/** Wire-level subscription event string to pass to /subscribe. */
export function subscriptionEventForCurrent(this: IHookFunctions): string {
	const event = resolveEvent.call(this);
	return event.SUBSCRIPTION_EVENT_OVERRIDE ?? event.EVENT_VALUE;
}
