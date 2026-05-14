import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	carbonVoiceApiRequest,
	carbonVoiceFormDataRequest,
} from '../../shared/transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		required: true,
		default: '',
		description:
			'Target workspace. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getWorkspaces' },
		displayOptions: {
			show: { resource: ['voiceMemo'], operation: ['create'] },
		},
	},
	{
		displayName: 'Folder Name or ID',
		name: 'folderId',
		type: 'options',
		default: '',
		description:
			'Optional. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getVoiceMemoFolders',
			loadOptionsDependsOn: ['workspaceId'],
		},
		displayOptions: {
			show: { resource: ['voiceMemo'], operation: ['create'] },
		},
	},
	{
		displayName: 'Source',
		name: 'source',
		type: 'options',
		default: 'text',
		description: 'Where the voice memo content comes from',
		options: [
			{ name: 'Text (Server Reads It Aloud)', value: 'text' },
			{ name: 'Audio File (Uploaded From Previous Node)', value: 'audio' },
		],
		displayOptions: {
			show: { resource: ['voiceMemo'], operation: ['create'] },
		},
	},
	{
		displayName: 'Transcript',
		name: 'transcript',
		type: 'string',
		required: true,
		default: '',
		typeOptions: { rows: 4 },
		description: 'Text to be converted to a voice memo',
		displayOptions: {
			show: {
				resource: ['voiceMemo'],
				operation: ['create'],
				source: ['text'],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'audioBinaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		description:
			'Name of the binary property on the input item that contains the audio file (mp3, wav, m4a, ogg, etc.)',
		displayOptions: {
			show: {
				resource: ['voiceMemo'],
				operation: ['create'],
				source: ['audio'],
			},
		},
	},
	{
		displayName: 'Links',
		name: 'links',
		type: 'string',
		default: '',
		placeholder: 'https://example.com, https://docs.example.com',
		description: 'Optional. Comma-separated URLs to attach.',
		displayOptions: {
			show: { resource: ['voiceMemo'], operation: ['create'] },
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<INodeExecutionData> {
	const workspaceId = this.getNodeParameter('workspaceId', i) as string;
	if (!workspaceId) {
		throw new NodeOperationError(this.getNode(), 'Workspace is required.', {
			itemIndex: i,
		});
	}
	const folderId = this.getNodeParameter('folderId', i, '') as string;
	const source = this.getNodeParameter('source', i) as 'text' | 'audio';

	const linksRaw = this.getNodeParameter('links', i, '') as string;
	const links = linksRaw
		.split(',')
		.map((l) => l.trim())
		.filter(Boolean);

	if (source === 'audio') {
		const propertyName = this.getNodeParameter(
			'audioBinaryPropertyName',
			i,
		) as string;
		const binaryData = this.helpers.assertBinaryData(i, propertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(i, propertyName);

		const formData: IDataObject = {
			workspace_id: workspaceId,
			audio_file: {
				value: buffer,
				options: {
					filename: binaryData.fileName ?? 'voicememo',
					contentType: binaryData.mimeType,
				},
			},
		};
		if (folderId) formData.folder_id = folderId;
		if (links.length) formData['links[]'] = links;

		const response = (await carbonVoiceFormDataRequest.call(
			this,
			'/simplified/messages/voicememo',
			formData,
		)) as IDataObject;

		return { json: response, pairedItem: { item: i } };
	}

	// source === 'text'
	const transcript = this.getNodeParameter('transcript', i) as string;
	if (!transcript) {
		throw new NodeOperationError(
			this.getNode(),
			'Transcript is required when Source is "Text".',
			{ itemIndex: i },
		);
	}

	const body: IDataObject = {
		workspace_id: workspaceId,
		transcript,
	};
	if (folderId) body.folder_id = folderId;
	if (links.length) body.links = links;

	const response = (await carbonVoiceApiRequest.call(
		this,
		'POST',
		'/simplified/messages/voicememo',
		body,
	)) as IDataObject;

	return { json: response, pairedItem: { item: i } };
}
