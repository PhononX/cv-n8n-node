# n8n Custom Node Development Plan
## Trigger + App Plugin Implementation

---

## Overview

Nodes are the building blocks of workflows in n8n. They're an entry point for retrieving data, a function to process data, or an exit for sending data. There can be one or several nodes for your API, service, or app. A full integration typically involves two node types: an **app/action node** (does something) and a **trigger node** (starts the workflow when an event fires).

---

## Phase 1 — Prerequisites & Setup

**Required skills:**
- JavaScript/TypeScript expertise — for implementing node logic
- REST API knowledge — to handle authentication, requests, and responses
- Git and npm proficiency — for packaging and publishing nodes

**Required tools:**
- Node.js 18+ — ensures compatibility with the latest n8n versions
- TypeScript 5.x — improves type safety and maintainability
- VS Code (or any IDE) — for efficient code editing
- n8n CLI — to test custom nodes locally

**Bootstrap your project:**

```bash
git clone https://github.com/n8n-io/n8n-nodes-starter.git
cd n8n-nodes-starter
npm install
```

n8n provides a starter repository for node development. Using the starter ensures you have all necessary dependencies and a linter.

---

## Phase 2 — Node Architecture

Every node has a core structure consisting of a **description object** (defining fields, display options, and credentials), an **execute method** (synchronous or asynchronous), and optional lifecycle hooks.

**Key files to create:**

| File | Purpose |
|------|---------|
| `MyApp.node.ts` | Action node (declarative or programmatic) |
| `MyAppTrigger.node.ts` | Trigger node |
| `MyAppApi.credentials.ts` | Auth credentials |
| `package.json` | npm metadata + n8n registration |

---

## Phase 3 — Build the App (Action) Node

n8n supports two styles:

### Declarative Style
Simpler, API-description-driven, good for CRUD operations:

```typescript
description: INodeTypeDescription = {
  displayName: 'My App',
  name: 'myApp',
  group: ['output'],
  version: 1,
  description: 'Interact with My App API',
  defaults: { name: 'My App' },
  inputs: ['main'],
  outputs: ['main'],
  credentials: [{ name: 'myAppApi', required: true }],
  properties: [
    {
      displayName: 'Resource',
      name: 'resource',
      type: 'options',
      options: [{ name: 'Message', value: 'message' }],
      default: 'message',
    },
  ],
  routing: {
    request: {
      baseURL: 'https://api.myapp.com',
      url: '/messages',
      method: 'POST',
    },
  },
};
```

### Programmatic Style
More control, required for complex logic:

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const results = [];
  for (let i = 0; i < items.length; i++) {
    const resource = this.getNodeParameter('resource', i) as string;
    const response = await this.helpers.request({
      method: 'POST',
      url: 'https://api.myapp.com/messages',
      json: true,
      body: { text: this.getNodeParameter('text', i) },
    });
    results.push({ json: response });
  }
  return [results];
}
```

---

## Phase 4 — Build the Trigger Node

Trigger nodes enable n8n workflows to respond to external events — e.g., a new message received on a WebSocket, or a specific condition met within an application.

Trigger nodes use a `trigger()` method instead of `execute()`. The three key components are:

```typescript
description: INodeTypeDescription = {
  displayName: 'My App - Trigger',
  name: 'myAppTrigger',
  group: ['trigger'],
  version: 1,
  inputs: [],       // ← triggers have NO inputs
  outputs: ['main'],
  // ...
};

async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
  const startConsumer = async () => {
    // Set up webhook listener, WebSocket, or polling
    // When event fires:
    this.emit([this.helpers.returnJsonArray(eventData)]);
  };

  const closeFunction = async () => {
    // Teardown: close connections, clear intervals
  };

  const manualTriggerFunction = async () => {
    // Called when user manually tests the node
    await startConsumer();
  };

  startConsumer();
  return { closeFunction, manualTriggerFunction };
}
```

**Two common trigger patterns:**

- **Webhook-based** — n8n registers a URL, your app calls it. Use `this.getNodeWebhookUrl('default')` and implement `webhook()` method.
- **Polling** — n8n polls your API on a schedule. Check for new data, emit if found.

---

## Phase 5 — Credentials

```typescript
// MyAppApi.credentials.ts
export class MyAppApi implements ICredentialType {
  name = 'myAppApi';
  displayName = 'My App API';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
    },
  ];
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: { Authorization: '=Bearer {{$credentials.apiKey}}' },
    },
  };
}
```

---

## Phase 6 — Register in `package.json`

```json
{
  "name": "n8n-nodes-myapp",
  "n8n": {
    "nodes": [
      "dist/nodes/MyApp/MyApp.node.js",
      "dist/nodes/MyApp/MyAppTrigger.node.js"
    ],
    "credentials": [
      "dist/credentials/MyAppApi.credentials.js"
    ]
  }
}
```

---

## Phase 7 — Test Locally

For local development, run n8n in development mode and mount the custom node directory. This enables rapid iteration with hot-reload and the UI inspector to examine node outputs in real workflows.

```bash
# Build TypeScript
npm run build

# Link to local n8n
npm link
cd ~/.n8n
npm link n8n-nodes-myapp

# Start n8n
npx n8n start
```

Open n8n in your browser. You should see your nodes when you search for them in the nodes panel.

---

## Phase 8 — Publish

```bash
npm publish
```

Good documentation increases adoption. For each node, include a description of the use case, parameter explanations, and example workflows. Provide JSON exports of example workflows that use the node in realistic scenarios.

Once published to npm, users can install via **Settings → Community Nodes** in their n8n instance.

---

## Quick Reference: Action Node vs. Trigger Node

| | App/Action Node | Trigger Node |
|---|---|---|
| **Method** | `execute()` | `trigger()` or `webhook()` |
| **Inputs** | `['main']` | `[]` (none) |
| **Group** | `['transform']` / `['output']` | `['trigger']` |
| **Starts workflow?** | No | Yes |
| **Activation needed?** | No | Yes (for production) |

---

## Trigger: New Message Received (Carbon Voice)

This trigger fires whenever a new message is received in Carbon Voice. It uses polling to detect new messages since the last check.

### Credentials

| Field | Type | Notes |
|-------|------|-------|
| Personal Access Token (PAT) | `string` (password) | Used as `Bearer` token in `Authorization` header |

```typescript
// CarbonVoiceApi.credentials.ts
export class CarbonVoiceApi implements ICredentialType {
  name = 'carbonVoiceApi';
  displayName = 'Carbon Voice API';
  properties: INodeProperties[] = [
    {
      displayName: 'Personal Access Token',
      name: 'pat',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
    },
  ];
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: { Authorization: '=Bearer {{$credentials.pat}}' },
    },
  };
}
```

### Node Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| Workspace | `options` (dynamic) | Filter to a specific workspace; loads available workspaces from the API |
| Conversation ID | `string` | Optional — restrict trigger to a single conversation |
| Hide My Messages | `boolean` (checkbox) | When enabled, suppress messages sent by the authenticated user |
| Receive Messages From | `options` | Who to accept messages from (see values below) |
| Allowed Senders | `string[]` (multiOptions / tags) | Shown when **Receive Messages From = Only from certain people** |
| Blocked Senders | `string[]` (multiOptions / tags) | Shown when **Receive Messages From = Not certain people** |

**Receive Messages From values:**

| Display Name | Value |
|---|---|
| Everyone | `everyone` |
| Only from certain people | `allowlist` |
| Not certain people | `blocklist` |

### Properties Definition (abbreviated)

```typescript
properties: [
  {
    displayName: 'Workspace',
    name: 'workspaceId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getWorkspaces' },
    default: '',
    description: 'Restrict trigger to this workspace',
  },
  {
    displayName: 'Conversation ID',
    name: 'conversationId',
    type: 'string',
    default: '',
    description: 'Leave blank to watch all conversations in the workspace',
  },
  {
    displayName: 'Hide My Messages',
    name: 'hideMyMessages',
    type: 'boolean',
    default: true,
    description: 'Whether to suppress messages sent by the authenticated user',
  },
  {
    displayName: 'Receive Messages From',
    name: 'receiveFrom',
    type: 'options',
    options: [
      { name: 'Everyone',              value: 'everyone'  },
      { name: 'Only from certain people', value: 'allowlist' },
      { name: 'Not certain people',    value: 'blocklist' },
    ],
    default: 'everyone',
  },
  {
    displayName: 'Allowed Senders',
    name: 'allowedSenders',
    type: 'multiOptions',
    typeOptions: { loadOptionsMethod: 'getWorkspaceUsers' },
    default: [],
    displayOptions: { show: { receiveFrom: ['allowlist'] } },
    description: 'Only emit messages from these users',
  },
  {
    displayName: 'Blocked Senders',
    name: 'blockedSenders',
    type: 'multiOptions',
    typeOptions: { loadOptionsMethod: 'getWorkspaceUsers' },
    default: [],
    displayOptions: { show: { receiveFrom: ['blocklist'] } },
    description: 'Never emit messages from these users',
  },
]
```

### Polling Logic (trigger method)

```typescript
async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
  const workspaceId   = this.getNodeParameter('workspaceId', '')   as string;
  const conversationId = this.getNodeParameter('conversationId', '') as string;
  const hideMyMessages = this.getNodeParameter('hideMyMessages', true) as boolean;
  const receiveFrom   = this.getNodeParameter('receiveFrom', 'everyone') as string;
  const allowedSenders = this.getNodeParameter('allowedSenders', []) as string[];
  const blockedSenders = this.getNodeParameter('blockedSenders', []) as string[];

  // Fetch the authenticated user's ID once (for hideMyMessages filter)
  const me = await this.helpers.request({ url: '/users/me', method: 'GET' });
  const myUserId = me.id;

  const pollForMessages = async () => {
    const since = this.getWorkflowStaticData('node').lastChecked as string | undefined;
    const params: Record<string, string> = { workspaceId };
    if (conversationId) params.conversationId = conversationId;
    if (since)          params.since = since;

    const messages: IMessage[] = await fetchMessages(this, params);

    const filtered = messages.filter((msg) => {
      if (hideMyMessages && msg.senderId === myUserId) return false;
      if (receiveFrom === 'allowlist' && !allowedSenders.includes(msg.senderId)) return false;
      if (receiveFrom === 'blocklist' &&  blockedSenders.includes(msg.senderId)) return false;
      return true;
    });

    if (filtered.length) {
      this.emit([this.helpers.returnJsonArray(filtered)]);
    }

    this.getWorkflowStaticData('node').lastChecked = new Date().toISOString();
  };

  const intervalId = setInterval(pollForMessages, 60_000);

  const closeFunction = async () => clearInterval(intervalId);
  const manualTriggerFunction = async () => pollForMessages();

  return { closeFunction, manualTriggerFunction };
}
```

### Output Fields (per emitted message)

| Field | Description |
|-------|-------------|
| `id` | Unique message ID |
| `conversationId` | Conversation the message belongs to |
| `workspaceId` | Workspace the message belongs to |
| `senderId` | User ID of the sender |
| `senderName` | Display name of the sender |
| `body` | Message text content |
| `createdAt` | ISO timestamp of when the message was sent |
| `attachments` | Array of attachment objects (if any) |

---

## Trigger: New Voice Message Posted (Carbon Voice)

This trigger fires whenever a new voice memo message is posted in Carbon Voice. It uses polling to detect new voice messages since the last check, optionally scoped to a specific workspace and folder.

### Credentials

Same `CarbonVoiceApi` credentials as above (PAT → Bearer token).

### Node Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| Workspace | `options` (dynamic) | Filter to a specific workspace; loads available workspaces from the API |
| Folder | `options` (dynamic) | Optional — restrict trigger to a specific folder within the selected workspace; loads folders from the API after a workspace is chosen |

> **Note:** Folder options are loaded dynamically and depend on the selected Workspace. If no folder is selected, all folders in the workspace are watched.

### Properties Definition (abbreviated)

```typescript
properties: [
  {
    displayName: 'Workspace',
    name: 'workspaceId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getWorkspaces' },
    default: '',
    required: true,
    description: 'Restrict trigger to this workspace',
  },
  {
    displayName: 'Folder',
    name: 'folderId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getFolders' },  // passes workspaceId as context
    default: '',
    description: 'Leave blank to watch all folders in the workspace',
    displayOptions: { show: { workspaceId: ['*'] } },  // only show once workspace chosen
  },
]
```

### `loadOptions` Methods

```typescript
methods = {
  loadOptions: {
    async getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
      const workspaces = await this.helpers.request({ method: 'GET', url: '/workspaces' });
      return workspaces.map((ws: IWorkspace) => ({ name: ws.name, value: ws.id }));
    },

    async getFolders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
      const workspaceId = this.getCurrentNodeParameter('workspaceId') as string;
      if (!workspaceId) return [];
      const folders = await this.helpers.request({
        method: 'GET',
        url: `/workspaces/${workspaceId}/folders`,
      });
      return [
        { name: 'All Folders', value: '' },
        ...folders.map((f: IFolder) => ({ name: f.name, value: f.id })),
      ];
    },
  },
};
```

### Polling Logic (trigger method)

```typescript
async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
  const workspaceId = this.getNodeParameter('workspaceId', '') as string;
  const folderId    = this.getNodeParameter('folderId', '')    as string;

  const pollForVoiceMessages = async () => {
    const since = this.getWorkflowStaticData('node').lastChecked as string | undefined;

    const params: Record<string, string> = { workspaceId, type: 'voicememo' };
    if (folderId) params.folderId = folderId;
    if (since)    params.since    = since;

    const messages: IVoiceMessage[] = await fetchMessages(this, params);

    if (messages.length) {
      this.emit([this.helpers.returnJsonArray(messages)]);
    }

    this.getWorkflowStaticData('node').lastChecked = new Date().toISOString();
  };

  const intervalId = setInterval(pollForVoiceMessages, 60_000);

  const closeFunction        = async () => clearInterval(intervalId);
  const manualTriggerFunction = async () => pollForVoiceMessages();

  return { closeFunction, manualTriggerFunction };
}
```

### Output Fields (per emitted voice message)

| Field | Description |
|-------|-------------|
| `id` | Unique message ID |
| `workspaceId` | Workspace the message belongs to |
| `folderId` | Folder the message is stored in |
| `senderId` | User ID of the sender |
| `senderName` | Display name of the sender |
| `duration` | Length of the voice memo in seconds |
| `audioUrl` | URL to the voice memo audio file |
| `transcript` | Text transcript of the voice memo (if available) |
| `createdAt` | ISO timestamp of when the voice memo was posted |

---

## Action: Send Text Message (Carbon Voice)

Sends a text message to either a conversation or a direct message thread with a user. Optionally attaches links or binary files.

### Credentials

Same `CarbonVoiceApi` credentials (PAT → Bearer token).

### Node Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| Send To | `options` | `Conversation` or `User` |
| Conversation ID | `string` | Shown when **Send To = Conversation** |
| Workspace | `options` (dynamic) | Shown when **Send To = User**; scopes the user search |
| User | `options` (dynamic) | Shown when **Send To = User**; loads workspace members after workspace is chosen |
| Message Text | `string` (large text) | The body of the message |
| Attachments | `fixedCollection` (array) | Zero or more attachments; each is a **Link** or **File** (see below) |

**Send To values:**

| Display Name | Value |
|---|---|
| Conversation | `conversation` |
| User | `user` |

**Attachment item fields:**

| Field | Type | Notes |
|-------|------|-------|
| Type | `options` | `Link` or `File` |
| URL | `string` | Shown when Type = Link |
| Input Field Name | `string` | Shown when Type = File; name of the binary property on the input item |

### Properties Definition (abbreviated)

```typescript
properties: [
  {
    displayName: 'Send To',
    name: 'sendTo',
    type: 'options',
    options: [
      { name: 'Conversation', value: 'conversation' },
      { name: 'User',         value: 'user' },
    ],
    default: 'conversation',
  },
  // --- Conversation branch ---
  {
    displayName: 'Conversation ID',
    name: 'conversationId',
    type: 'string',
    default: '',
    required: true,
    displayOptions: { show: { sendTo: ['conversation'] } },
  },
  // --- User branch ---
  {
    displayName: 'Workspace',
    name: 'workspaceId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getWorkspaces' },
    default: '',
    required: true,
    displayOptions: { show: { sendTo: ['user'] } },
  },
  {
    displayName: 'User',
    name: 'userId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getWorkspaceUsers' },
    default: '',
    required: true,
    displayOptions: { show: { sendTo: ['user'] } },
    description: 'Opens or reuses the direct-message conversation with this user',
  },
  // --- Message ---
  {
    displayName: 'Message Text',
    name: 'text',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    required: true,
  },
  // --- Attachments ---
  {
    displayName: 'Attachments',
    name: 'attachments',
    type: 'fixedCollection',
    typeOptions: { multipleValues: true },
    default: {},
    options: [
      {
        displayName: 'Attachment',
        name: 'attachment',
        values: [
          {
            displayName: 'Type',
            name: 'type',
            type: 'options',
            options: [
              { name: 'Link', value: 'link' },
              { name: 'File', value: 'file' },
            ],
            default: 'link',
          },
          {
            displayName: 'URL',
            name: 'url',
            type: 'string',
            default: '',
            displayOptions: { show: { type: ['link'] } },
            description: 'The URL to attach',
          },
          {
            displayName: 'Input Field Name',
            name: 'binaryPropertyName',
            type: 'string',
            default: 'data',
            displayOptions: { show: { type: ['file'] } },
            description: 'Name of the binary property on the input item containing the file',
          },
        ],
      },
    ],
  },
]
```

### Execute Logic

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const results: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    const sendTo         = this.getNodeParameter('sendTo', i)   as string;
    const text           = this.getNodeParameter('text', i)      as string;
    const attachmentDefs = (this.getNodeParameter('attachments', i) as IDataObject)
      .attachment as IDataObject[] ?? [];

    // Resolve the target conversation ID
    let conversationId: string;
    if (sendTo === 'conversation') {
      conversationId = this.getNodeParameter('conversationId', i) as string;
    } else {
      const workspaceId = this.getNodeParameter('workspaceId', i) as string;
      const userId      = this.getNodeParameter('userId', i)      as string;
      // Open or retrieve the existing DM conversation with this user
      const dm = await this.helpers.request({
        method: 'POST',
        url: '/conversations/direct',
        body: { workspaceId, userId },
        json: true,
      });
      conversationId = dm.id;
    }

    // Build attachment payloads
    const attachments = await Promise.all(
      attachmentDefs.map(async (att) => {
        if (att.type === 'link') {
          return { type: 'link', url: att.url };
        }
        // Upload binary file, get back an attachment reference
        const binaryData = this.helpers.assertBinaryData(i, att.binaryPropertyName as string);
        const buffer     = await this.helpers.getBinaryDataBuffer(i, att.binaryPropertyName as string);
        const uploaded   = await this.helpers.request({
          method: 'POST',
          url: '/attachments',
          formData: {
            file: { value: buffer, options: { filename: binaryData.fileName, contentType: binaryData.mimeType } },
          },
        });
        return { type: 'file', attachmentId: uploaded.id };
      }),
    );

    const response = await this.helpers.request({
      method: 'POST',
      url: `/conversations/${conversationId}/messages`,
      body: { text, attachments },
      json: true,
    });

    results.push({ json: response });
  }

  return [results];
}
```

### Output Fields

| Field | Description |
|-------|-------------|
| `id` | ID of the newly created message |
| `conversationId` | Conversation the message was sent to |
| `senderId` | Authenticated user's ID |
| `text` | Message body that was sent |
| `attachments` | Array of attachment objects returned by the API |
| `createdAt` | ISO timestamp of the sent message |

---

## Action: Post Voice Memo with Text (Carbon Voice)

Posts a voice memo composed of a text body to a workspace folder destination. The text is converted to a voice memo by the API. Optionally attaches links or binary files.

### Credentials

Same `CarbonVoiceApi` credentials (PAT → Bearer token).

### Node Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| Workspace | `options` (dynamic) | Target workspace |
| Folder | `options` (dynamic) | Target folder within the workspace |
| Message Text | `string` (large text) | The text content to post as a voice memo |
| Attachments | `fixedCollection` (array) | Zero or more attachments; each is a **Link** or **File** |

### Properties Definition (abbreviated)

```typescript
properties: [
  {
    displayName: 'Workspace',
    name: 'workspaceId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getWorkspaces' },
    default: '',
    required: true,
  },
  {
    displayName: 'Folder',
    name: 'folderId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getFolders' },
    default: '',
    required: true,
    description: 'Target folder for the voice memo',
  },
  {
    displayName: 'Message Text',
    name: 'text',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    required: true,
  },
  // Attachments — same fixedCollection shape as Send Text Message (Link / File)
  attachmentsProperty,
]
```

### Execute Logic

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const results: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    const workspaceId    = this.getNodeParameter('workspaceId', i) as string;
    const folderId       = this.getNodeParameter('folderId', i)    as string;
    const text           = this.getNodeParameter('text', i)         as string;
    const attachmentDefs = (this.getNodeParameter('attachments', i) as IDataObject)
      .attachment as IDataObject[] ?? [];

    const attachments = await resolveAttachments(this, i, attachmentDefs);

    const response = await this.helpers.request({
      method: 'POST',
      url: `/workspaces/${workspaceId}/folders/${folderId}/messages`,
      body: { type: 'voicememo', text, attachments },
      json: true,
    });

    results.push({ json: response });
  }

  return [results];
}
```

### Output Fields

| Field | Description |
|-------|-------------|
| `id` | ID of the newly created voice memo |
| `workspaceId` | Destination workspace |
| `folderId` | Destination folder |
| `senderId` | Authenticated user's ID |
| `text` | Text body that was posted |
| `attachments` | Array of attachment objects returned by the API |
| `createdAt` | ISO timestamp of the posted message |

---

## Action: Post Voice Memo (Carbon Voice)

Uploads and posts an audio file as a voice memo to a workspace folder. Takes a binary audio input from the workflow. Optionally attaches links or binary files alongside the audio.

### Credentials

Same `CarbonVoiceApi` credentials (PAT → Bearer token).

### Node Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| Workspace | `options` (dynamic) | Target workspace |
| Folder | `options` (dynamic) | Target folder within the workspace |
| Audio Input Field | `string` | Name of the binary property on the input item containing the audio file (default: `data`) |
| Attachments | `fixedCollection` (array) | Zero or more additional attachments; each is a **Link** or **File** |

### Properties Definition (abbreviated)

```typescript
properties: [
  {
    displayName: 'Workspace',
    name: 'workspaceId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getWorkspaces' },
    default: '',
    required: true,
  },
  {
    displayName: 'Folder',
    name: 'folderId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getFolders' },
    default: '',
    required: true,
    description: 'Target folder for the voice memo',
  },
  {
    displayName: 'Audio Input Field',
    name: 'audioBinaryPropertyName',
    type: 'string',
    default: 'data',
    required: true,
    description: 'Name of the binary property on the input item containing the audio file (mp3, m4a, wav, ogg)',
  },
  // Attachments — same fixedCollection shape as Send Text Message (Link / File)
  attachmentsProperty,
]
```

### Execute Logic

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const results: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    const workspaceId             = this.getNodeParameter('workspaceId', i)             as string;
    const folderId                = this.getNodeParameter('folderId', i)                as string;
    const audioBinaryPropertyName = this.getNodeParameter('audioBinaryPropertyName', i) as string;
    const attachmentDefs          = (this.getNodeParameter('attachments', i) as IDataObject)
      .attachment as IDataObject[] ?? [];

    // Upload the audio file
    const audioBinary = this.helpers.assertBinaryData(i, audioBinaryPropertyName);
    const audioBuffer = await this.helpers.getBinaryDataBuffer(i, audioBinaryPropertyName);
    const uploaded    = await this.helpers.request({
      method: 'POST',
      url: `/workspaces/${workspaceId}/folders/${folderId}/voicememos`,
      formData: {
        audio: {
          value: audioBuffer,
          options: { filename: audioBinary.fileName ?? 'voice.m4a', contentType: audioBinary.mimeType },
        },
      },
    });

    // Resolve any additional attachments
    const attachments = await resolveAttachments(this, i, attachmentDefs);

    // If attachments present, patch the created memo
    if (attachments.length) {
      await this.helpers.request({
        method: 'PATCH',
        url: `/messages/${uploaded.id}`,
        body: { attachments },
        json: true,
      });
    }

    results.push({ json: { ...uploaded, attachments } });
  }

  return [results];
}
```

### Output Fields

| Field | Description |
|-------|-------------|
| `id` | ID of the newly created voice memo |
| `workspaceId` | Destination workspace |
| `folderId` | Destination folder |
| `senderId` | Authenticated user's ID |
| `audioUrl` | URL to the uploaded audio file |
| `duration` | Length of the audio in seconds (set by the API after processing) |
| `transcript` | Auto-generated transcript (populated asynchronously by the API) |
| `attachments` | Array of additional attachment objects |
| `createdAt` | ISO timestamp of the posted voice memo |
