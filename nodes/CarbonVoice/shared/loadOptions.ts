import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import { carbonVoiceApiRequest } from './transport';

type Workspace = { id: string; name: string };
type Conversation = { id: string; name: string; workspace_id?: string };
type Contact = {
	user_guid: string;
	first_name?: string;
	last_name?: string;
	image_url?: string;
};
type Folder = {
	id: string;
	name: string;
	path?: string[];
	parent_folder_id?: string | null;
	deleted_at?: string | null;
};
type Label = { id: string; name: string };
type AIPrompt = { id: string; name: string };

export async function getWorkspaces(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const workspaces = (await carbonVoiceApiRequest.call(
		this,
		'GET',
		'/simplified/workspaces/basic-info',
	)) as Workspace[];

	return [
		{ name: 'All Workspaces', value: '' },
		...workspaces.map((ws) => ({ name: ws.name, value: ws.id })),
	];
}

export async function getConversations(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const response = (await carbonVoiceApiRequest.call(
		this,
		'GET',
		'/simplified/conversations/all',
	)) as { results?: Conversation[] };

	const conversations = response.results ?? [];
	const workspaceId = this.getCurrentNodeParameter('workspaceId') as
		| string
		| undefined;

	const filtered = workspaceId
		? conversations.filter((c) => c.workspace_id === workspaceId)
		: conversations;

	return filtered.map((c) => ({ name: c.name, value: c.id }));
}

export async function getContacts(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const contacts = (await carbonVoiceApiRequest.call(
		this,
		'POST',
		'/contacts',
	)) as Contact[];

	return contacts.map((c) => ({
		name:
			[c.first_name, c.last_name].filter(Boolean).join(' ').trim() ||
			c.user_guid,
		value: c.user_guid,
	}));
}

async function fetchFolders(
	this: ILoadOptionsFunctions,
	type: 'voicememo' | 'prerecorded',
): Promise<INodePropertyOptions[]> {
	const workspaceId = this.getCurrentNodeParameter('workspaceId') as
		| string
		| undefined;

	const qs: IDataObject = { include_all_tree: true, type };
	if (workspaceId) qs.workspace_id = workspaceId;

	const response = (await carbonVoiceApiRequest.call(
		this,
		'GET',
		'/simplified/folders',
		{},
		qs,
	)) as { results?: Folder[] };

	const folders = (response.results ?? []).filter((f) => !f.deleted_at);

	// Build "Parent / Child" name paths so nested folders are readable
	const byId = new Map(folders.map((f) => [f.id, f]));
	const renderName = (f: Folder) => {
		const pathNames = (f.path ?? [])
			.map((id) => byId.get(id)?.name)
			.filter(Boolean)
			.reverse();
		return [...pathNames, f.name].join(' / ');
	};

	return folders.map((f) => ({ name: renderName(f), value: f.id }));
}

export async function getVoiceMemoFolders(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await fetchFolders.call(this, 'voicememo');
}

export async function getPrerecordedFolders(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await fetchFolders.call(this, 'prerecorded');
}

export async function getLabels(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const labels = (await carbonVoiceApiRequest.call(
		this,
		'GET',
		'/labels',
	)) as Label[];

	return labels.map((l) => ({ name: l.name, value: l.id }));
}

export async function getAIPrompts(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const workspaceId = this.getCurrentNodeParameter('workspaceId') as
		| string
		| undefined;

	const qs: IDataObject = { owner_type: 'system' };
	if (workspaceId) qs.workspace_id = workspaceId;

	const prompts = (await carbonVoiceApiRequest.call(
		this,
		'GET',
		'/prompts',
		{},
		qs,
	)) as AIPrompt[];

	return prompts.map((p) => ({ name: p.name, value: p.id }));
}

export async function getWorkspaceUsers(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	// Reuses /contacts since there is no per-workspace listing endpoint
	return await getContacts.call(this);
}
