import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as sendDirectMessage from './conversation/sendDirectMessage.operation';
import * as sendMessage from './conversation/sendMessage.operation';

type OperationModule = {
	description: INodeProperties[];
	execute: (
		this: IExecuteFunctions,
		i: number,
	) => Promise<INodeExecutionData>;
};

// One entry per (resource, operation). Adding a new action = drop a new
// operation file under actions/<resource>/ and register it here.
const operations: Record<string, Record<string, OperationModule>> = {
	conversation: {
		sendMessage,
		sendDirectMessage,
	},
};

// Resource dropdown — derived from the keys of `operations`.
const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	default: 'conversation',
	options: [{ name: 'Conversation', value: 'conversation' }],
};

// Operation dropdown — one set of options per resource, gated by displayOptions.
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
