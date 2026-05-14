import {
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { actionProperties, executeAction } from './actions/router';
import {
	getAIPrompts,
	getContacts,
	getConversations,
	getLabels,
	getVoiceMemoFolders,
	getWorkspaces,
} from './shared/loadOptions';

export class CarbonVoice implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Carbon Voice',
		name: 'carbonVoice',
		icon: {
			light: 'file:../../icons/carbonvoice.svg',
			dark: 'file:../../icons/carbonvoice.dark.svg',
		},
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Send messages, voice memos, and manage Carbon Voice resources',
		defaults: { name: 'Carbon Voice' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'carbonVoiceOAuth2Api', required: true }],
		properties: actionProperties,
	};

	methods = {
		loadOptions: {
			getWorkspaces,
			getConversations,
			getContacts,
			getVoiceMemoFolders,
			getLabels,
			getAIPrompts,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				results.push(await executeAction.call(this, i));
			} catch (error) {
				if (this.continueOnFail()) {
					results.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex: i,
				});
			}
		}

		return [results];
	}
}
