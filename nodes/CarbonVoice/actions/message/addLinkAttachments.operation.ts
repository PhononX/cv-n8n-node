import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { carbonVoiceApiRequest } from '../../shared/transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		description:
			'ID of the message to attach links to. Usually comes from a previous step or a trigger.',
		displayOptions: {
			show: { resource: ['message'], operation: ['addLinkAttachments'] },
		},
	},
	{
		displayName: 'Links',
		name: 'links',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com/file.pdf, https://docs.example.com',
		description: 'Comma-separated list of URLs to attach',
		displayOptions: {
			show: { resource: ['message'], operation: ['addLinkAttachments'] },
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<INodeExecutionData> {
	const messageId = this.getNodeParameter('messageId', i) as string;
	if (!messageId) {
		throw new NodeOperationError(this.getNode(), 'Message ID is required.', {
			itemIndex: i,
		});
	}

	const linksRaw = this.getNodeParameter('links', i) as string;
	const links = linksRaw
		.split(',')
		.map((l) => l.trim())
		.filter(Boolean);
	if (!links.length) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one link is required.',
			{ itemIndex: i },
		);
	}

	const body: IDataObject = { links };

	const response = (await carbonVoiceApiRequest.call(
		this,
		'POST',
		`/simplified/messages/${messageId}/attachments/bulk/link`,
		body,
	)) as IDataObject;

	return { json: response, pairedItem: { item: i } };
}
