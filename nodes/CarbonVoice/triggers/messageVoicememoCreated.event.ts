import type { IHookFunctions, INodeProperties } from 'n8n-workflow';

import { Operator, type SubscriptionFilter } from '../shared/constants';

export const EVENT_VALUE = 'message.voicememo.created';

export const eventOption = {
	name: 'New Voice Memo Posted',
	value: EVENT_VALUE,
	description: 'Triggers when a new voice memo is posted to a folder',
};

export const description: INodeProperties[] = [
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		default: '',
		description:
			'Restrict to a single workspace. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getWorkspaces' },
		displayOptions: { show: { event: [EVENT_VALUE] } },
	},
	{
		displayName: 'Folder Names or IDs',
		name: 'folderIds',
		type: 'multiOptions',
		default: [],
		description:
			'Restrict to one or more folders. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getVoiceMemoFolders',
			loadOptionsDependsOn: ['workspaceId'],
		},
		displayOptions: { show: { event: [EVENT_VALUE] } },
	},
];

export async function buildFilters(
	this: IHookFunctions,
): Promise<SubscriptionFilter[]> {
	const filters: SubscriptionFilter[] = [];

	const workspaceId = this.getNodeParameter('workspaceId', '') as string;
	if (workspaceId) {
		filters.push({
			key: 'workspace_id',
			value: workspaceId,
			operator: Operator.EQUALS,
		});
	}

	const folderIds = this.getNodeParameter('folderIds', []) as string[];
	if (folderIds.length) {
		filters.push({
			key: 'folder_id',
			value: folderIds,
			operator: Operator.IN,
		});
	}

	return filters;
}
