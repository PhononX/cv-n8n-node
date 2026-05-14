import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as createActionItem from './actionItem/create.operation';
import * as updateActionItem from './actionItem/update.operation';
import * as createAIResponse from './aiPrompt/createResponse.operation';
import * as addUsers from './conversation/addUsers.operation';
import * as sendDirectMessage from './conversation/sendDirectMessage.operation';
import * as sendMessage from './conversation/sendMessage.operation';
import * as addLinkAttachments from './message/addLinkAttachments.operation';
import * as createShareLink from './message/createShareLink.operation';
import * as removeLabel from './message/removeLabel.operation';
import * as createVoiceMemo from './voiceMemo/create.operation';

type OperationModule = {
	description: INodeProperties[];
	execute: (
		this: IExecuteFunctions,
		i: number,
	) => Promise<INodeExecutionData>;
};

const operations: Record<string, Record<string, OperationModule>> = {
	conversation: {
		sendMessage,
		sendDirectMessage,
		addUsers,
	},
	message: {
		addLinkAttachments,
		removeLabel,
		createShareLink,
	},
	voiceMemo: {
		create: createVoiceMemo,
	},
	actionItem: {
		create: createActionItem,
		update: updateActionItem,
	},
	aiPrompt: {
		createResponse: createAIResponse,
	},
};

const resourceOptions: INodePropertyOptions[] = [
	{ name: 'AI Prompt', value: 'aiPrompt' },
	{ name: 'Action Item', value: 'actionItem' },
	{ name: 'Conversation', value: 'conversation' },
	{ name: 'Message', value: 'message' },
	{ name: 'Voice Memo', value: 'voiceMemo' },
];

const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	default: 'conversation',
	options: resourceOptions,
};

// Operation dropdowns — one per resource, gated by displayOptions.show.resource.
// Options within each must be sorted alphabetically by name (lint requirement).
const operationProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'sendMessage',
		displayOptions: { show: { resource: ['conversation'] } },
		options: [
			{
				name: 'Add Users',
				value: 'addUsers',
				action: 'Add users to a conversation',
				description: 'Add one or more users to an existing conversation',
			},
			{
				name: 'Send Direct Message',
				value: 'sendDirectMessage',
				action: 'Send a direct message to one or more users',
				description:
					'Open or reuse a direct conversation with one or more users and post a message',
			},
			{
				name: 'Send Message',
				value: 'sendMessage',
				action: 'Send a message to a conversation',
				description: 'Post a text message to an existing conversation',
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'addLinkAttachments',
		displayOptions: { show: { resource: ['message'] } },
		options: [
			{
				name: 'Add Link Attachments',
				value: 'addLinkAttachments',
				action: 'Add link attachments to a message',
				description: 'Append one or more URL attachments to an existing message',
			},
			{
				name: 'Create Share Link',
				value: 'createShareLink',
				action: 'Create a share link for a message',
				description: 'Generate a public or specified-access share link',
			},
			{
				name: 'Remove Label',
				value: 'removeLabel',
				action: 'Remove a label from a message',
				description: 'Remove a specific label from a message',
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		displayOptions: { show: { resource: ['voiceMemo'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a voice memo',
				description:
					'Post a voice memo from text or an uploaded audio file',
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		displayOptions: { show: { resource: ['actionItem'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an action item',
				description: 'Create a new action item attached to a conversation or folder',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an action item',
				description: 'Update fields and/or status of an existing action item',
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'createResponse',
		displayOptions: { show: { resource: ['aiPrompt'] } },
		options: [
			{
				name: 'Create Response',
				value: 'createResponse',
				action: 'Create an AI prompt response',
				description: 'Run an AI prompt against one or more messages',
			},
		],
	},
];

export const actionProperties: INodeProperties[] = [
	resourceProperty,
	...operationProperties,
	...Object.values(operations).flatMap((ops) =>
		Object.values(ops).flatMap((op) => op.description),
	),
];

export async function executeAction(
	this: IExecuteFunctions,
	i: number,
): Promise<INodeExecutionData> {
	const resource = this.getNodeParameter('resource', i) as string;
	const operation = this.getNodeParameter('operation', i) as string;

	const op = operations[resource]?.[operation];
	if (!op) {
		throw new NodeOperationError(
			this.getNode(),
			`Unsupported resource/operation: ${resource}/${operation}`,
			{ itemIndex: i },
		);
	}

	return await op.execute.call(this, i);
}
