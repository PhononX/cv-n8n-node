import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class CarbonVoiceOAuth2Api implements ICredentialType {
	name = 'carbonVoiceOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Carbon Voice OAuth2 API';

	icon: Icon = {
		light: 'file:../icons/carbonvoice.svg',
		dark: 'file:../icons/carbonvoice.dark.svg',
	};

	documentationUrl = 'https://carbonvoice.app';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://api.carbonvoice.app/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.carbonvoice.app/oauth/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
