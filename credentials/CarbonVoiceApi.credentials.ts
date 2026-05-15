import type {
	Icon,
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CarbonVoiceApi implements ICredentialType {
	name = 'carbonVoiceApi';

	displayName = 'Carbon Voice API';

	icon: Icon = {
		light: 'file:../icons/carbonvoice.svg',
		dark: 'file:../icons/carbonvoice.dark.svg',
	};

	documentationUrl = 'https://developer.carbonvoice.app/personal-access-tokens';

	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Generate one at developer.carbonvoice.app → Personal Access Tokens. Used as the Authorization Bearer token for all API calls.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.carbonvoice.app',
			url: '/whoami',
			method: 'GET',
		},
	};
}
