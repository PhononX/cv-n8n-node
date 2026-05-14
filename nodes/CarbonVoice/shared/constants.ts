export const BASE_API_URL = 'https://api.carbonvoice.app';

export const SubscriptionEvents = {
	MESSAGE_POSTED_TO_CHANNEL: 'message.posted.to.channel',
	MESSAGE_VOICEMEMO_CREATED: 'message.voicememo.created',
	MESSAGE_LABEL_ADDED: 'message.label.added',
	AI_PROMPT_RESPONSE_GENERATED: 'ai.prompt.response.generated',
	ACTION_ITEM_CREATED: 'action-item.created',
	ACTION_ITEM_UPDATED: 'action-item.updated',
	ACTION_ITEM_DELETED: 'action-item.deleted',
	ACTION_ITEM_STATUS_CHANGED: 'action-item.status.changed',
} as const;

export type SubscriptionEvent = (typeof SubscriptionEvents)[keyof typeof SubscriptionEvents];

export const Operator = {
	EQUALS: 'eq',
	NOT_EQUALS: 'ne',
	IN: 'in',
} as const;

export type SubscriptionFilter = {
	key: string;
	value: string | number | string[];
	operator: (typeof Operator)[keyof typeof Operator];
};
