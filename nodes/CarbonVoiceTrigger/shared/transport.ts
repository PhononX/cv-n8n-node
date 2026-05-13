import type {
	IHookFunctions,
	IWebhookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { BASE_API_URL } from './constants';

export async function carbonVoiceApiRequest<T = IDataObject>(
	this: IHookFunctions | IWebhookFunctions | ILoadOptionsFunctions,
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
			'carbonVoiceOAuth2Api',
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

export async function getWhoAmI(
	this: IHookFunctions | ILoadOptionsFunctions,
): Promise<WhoAmI> {
	return (await carbonVoiceApiRequest.call(this, 'GET', '/whoami')) as WhoAmI;
}
