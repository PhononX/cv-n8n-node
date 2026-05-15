import type {
	IExecuteFunctions,
	IHookFunctions,
	IWebhookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { BASE_API_URL } from './constants';

export type CarbonVoiceRequestContext =
	| IExecuteFunctions
	| IHookFunctions
	| IWebhookFunctions
	| ILoadOptionsFunctions;

export async function carbonVoiceApiRequest<T = IDataObject>(
	this: CarbonVoiceRequestContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<T> {
	const options = {
		method,
		body,
		qs,
		url: `${BASE_API_URL}${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete (options as IDataObject).body;
	}
	if (Object.keys(qs).length === 0) {
		delete (options as IDataObject).qs;
	}

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'carbonVoiceApi',
			options,
		)) as T;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export type WhoAmI = {
	user_guid: string;
	first_name?: string;
	last_name?: string;
};

type WhoAmIResponse = {
	success: boolean;
	user: WhoAmI;
};

export async function getWhoAmI(
	this: IHookFunctions | ILoadOptionsFunctions,
): Promise<WhoAmI> {
	const response = (await carbonVoiceApiRequest.call(
		this,
		'GET',
		'/whoami',
	)) as WhoAmIResponse;
	return response.user;
}

/**
 * Multipart/form-data POST. Use when uploading binary files (e.g. audio for
 * voice memos). Fields can be strings or { value: Buffer, options: { filename,
 * contentType } } entries.
 */
export async function carbonVoiceFormDataRequest<T = IDataObject>(
	this: CarbonVoiceRequestContext,
	endpoint: string,
	formData: IDataObject,
): Promise<T> {
	const options = {
		method: 'POST' as IHttpRequestMethods,
		url: `${BASE_API_URL}${endpoint}`,
		formData,
	};

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'carbonVoiceApi',
			options,
		)) as T;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
