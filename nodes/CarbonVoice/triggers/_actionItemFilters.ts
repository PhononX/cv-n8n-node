/**
 * Shared filter properties + builder for the four action-item trigger events.
 * Inlined into each event file via spread (not imported as displayOptions show
 * targets), so the linter can still statically resolve `event` per-event.
 */

import type { IHookFunctions, INodeProperties } from 'n8n-workflow';

import { Operator, type SubscriptionFilter } from '../shared/constants';

export function actionItemFilterProperties(
	eventValue: string,
	options: { includeStatusFilter?: boolean } = {},
): INodeProperties[] {
	const base: INodeProperties[] = [
		{
			displayName: 'Workspace Name or ID',
			name: 'workspaceId',
			type: 'options',
			default: '',
			description:
				'Optional. Restrict to a single workspace. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			typeOptions: { loadOptionsMethod: 'getWorkspaces' },
			displayOptions: { show: { event: [eventValue] } },
		},
		{
			displayName: 'Container Type',
			name: 'containerType',
			type: 'options',
			default: '',
			description: 'Optional. Restrict by where the action item lives.',
			options: [
				{ name: 'Any', value: '' },
				{ name: 'Conversation', value: 'channel' },
				{ name: 'Folder', value: 'folder' },
			],
			displayOptions: { show: { event: [eventValue] } },
		},
		{
			displayName: 'Conversation Name or ID',
			name: 'conversationId',
			type: 'options',
			default: '',
			description:
				'Optional. Restrict to action items inside this conversation. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			typeOptions: {
				loadOptionsMethod: 'getConversations',
				loadOptionsDependsOn: ['workspaceId'],
			},
			displayOptions: {
				show: { event: [eventValue], containerType: ['channel'] },
			},
		},
		{
			displayName: 'Folder Name or ID',
			name: 'folderId',
			type: 'options',
			default: '',
			description:
				'Optional. Restrict to action items inside this folder. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			typeOptions: {
				loadOptionsMethod: 'getVoiceMemoFolders',
				loadOptionsDependsOn: ['workspaceId'],
			},
			displayOptions: {
				show: { event: [eventValue], containerType: ['folder'] },
			},
		},
		{
			displayName: 'Assigned To Name or ID',
			name: 'assignedTo',
			type: 'options',
			default: '',
			description:
				'Optional. Only action items assigned to this user. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			typeOptions: { loadOptionsMethod: 'getContacts' },
			displayOptions: { show: { event: [eventValue] } },
		},
		{
			displayName: 'Creator Name or ID',
			name: 'creatorId',
			type: 'options',
			default: '',
			description:
				'Optional. Only action items created by this user. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			typeOptions: { loadOptionsMethod: 'getContacts' },
			displayOptions: { show: { event: [eventValue] } },
		},
	];

	if (options.includeStatusFilter) {
		base.push({
			displayName: 'Status',
			name: 'status',
			type: 'options',
			default: '',
			description: 'Optional. Only fire when the status changes to this value.',
			options: [
				{ name: 'Any', value: '' },
				{ name: 'Suggested', value: 'suggested' },
				{ name: 'To Do', value: 'todo' },
				{ name: 'Done', value: 'done' },
			],
			displayOptions: { show: { event: [eventValue] } },
		});
	}

	return base;
}

export async function buildActionItemFilters(
	this: IHookFunctions,
): Promise<SubscriptionFilter[]> {
	const filters: SubscriptionFilter[] = [];

	const workspaceId = this.getNodeParameter('workspaceId', '') as string;
	if (workspaceId) {
		filters.push({
			key: 'workspace_ids',
			value: [workspaceId],
			operator: Operator.IN,
		});
	}

	const containerType = this.getNodeParameter('containerType', '') as string;
	if (containerType) {
		filters.push({
			key: 'container_type',
			value: containerType,
			operator: Operator.EQUALS,
		});

		const containerId =
			containerType === 'channel'
				? (this.getNodeParameter('conversationId', '') as string)
				: (this.getNodeParameter('folderId', '') as string);
		if (containerId) {
			filters.push({
				key: 'container_id',
				value: containerId,
				operator: Operator.EQUALS,
			});
		}
	}

	const assignedTo = this.getNodeParameter('assignedTo', '') as string;
	if (assignedTo) {
		filters.push({
			key: 'assigned_to',
			value: assignedTo,
			operator: Operator.EQUALS,
		});
	}

	const creatorId = this.getNodeParameter('creatorId', '') as string;
	if (creatorId) {
		filters.push({
			key: 'creator_id',
			value: creatorId,
			operator: Operator.EQUALS,
		});
	}

	// Optional — only present on status-changed event
	try {
		const status = this.getNodeParameter('status', '') as string;
		if (status) {
			filters.push({
				key: 'status',
				value: status,
				operator: Operator.EQUALS,
			});
		}
	} catch {
		// Property not defined on this event; ignore
	}

	return filters;
}
