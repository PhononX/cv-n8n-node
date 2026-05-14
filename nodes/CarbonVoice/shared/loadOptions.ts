import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { carbonVoiceApiRequest } from './transport';

type Workspace = { id: string; name: string };
type Conversation = { id: string; name: string; workspace_id?: string };
type Contact = {
	user_guid: string;
	first_name?: string;
	last_name?: string;
	image_url?: string;
};

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
