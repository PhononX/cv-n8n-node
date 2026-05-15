# Carbon Voice — n8n Community Node (Implementation Plan)

> Companion to `plan.md` — that doc captures the original generic n8n development guide. This doc captures the **actual implementation decisions** for `n8n-nodes-carbonvoice`, derived from auditing `cv-zapier` and validating end-to-end against the Carbon Voice public API.

---

## Goal

Ship a published n8n community node package (`n8n-nodes-carbonvoice`) that gives n8n users the same surface area Carbon Voice already exposes through its Zapier integration: webhook-driven triggers + action nodes for messaging, voice memos, action items, AI prompts, and labels.

End state: a user installs the package via **Settings → Community Nodes**, connects with a Personal Access Token, and drags `Carbon Voice Trigger` or `Carbon Voice` action nodes into workflows.

---

## Design decisions (and the path we took to land on them)

| Decision | Final choice | Notes |
|---|---|---|
| Auth | **Personal Access Token (PAT)** as a `Bearer` header | Originally targeted OAuth2 for parity with `cv-zapier`, but the public `/apps/subscribe` endpoint rejects external OAuth-app tokens with a `client_id from request is different from the authorization token` error (the implicit endpoint requires the token's `client_id` to match the user's default client). PATs are user-scoped (no `client_id` in the token) so they pass the check and the backend delivers events. Bonus: simpler UX — one field instead of an OAuth dance, no per-user OAuth-app registration. |
| Trigger style | **Webhook subscriptions** via `POST /apps/subscribe` | Reuses the same backend that powers the in-app Webhook Setup UI. No 60-second polling lag, no wasted API calls, server-side filtering via `subscription_filters`. |
| Coverage | **10 triggers + 10 actions**, matching `cv-zapier` | One-for-one parity. |
| Architecture | **One file per operation / event** | Adding the next action is one new file + one line in a router. Mirrors `cv-zapier/src/creates/*` and `cv-zapier/src/triggers/*` so porting is mechanical. |
| Package name | `n8n-nodes-carbonvoice` | Unscoped — convention for n8n community node packages. |

---

## Current state — what's scaffolded

The repo is bootstrapped from `n8n-io/n8n-nodes-starter`. Build + lint are clean. End-to-end flows verified against the real Carbon Voice API:

- ✅ Authentication via PAT
- ✅ Subscribe / unsubscribe lifecycle
- ✅ Webhook delivery into n8n (both Test mode and Published)
- ✅ Action node — Send Message + Send Direct Message tested live, the remaining eight ported from `cv-zapier`

```
cv-n8n-node/
├── credentials/
│   └── CarbonVoiceApi.credentials.ts      # PAT credential (Bearer header, /whoami test)
├── icons/
│   ├── carbonvoice.svg                    # Light-mode icon
│   └── carbonvoice.dark.svg               # Dark-mode icon
├── nodes/
│   └── CarbonVoice/
│       ├── CarbonVoice.node.ts            # Action node (thin class + dispatcher)
│       ├── CarbonVoiceTrigger.node.ts     # Trigger node (webhook subscribe/unsubscribe)
│       ├── CarbonVoice.node.json          # n8n marketplace metadata
│       ├── CarbonVoiceTrigger.node.json
│       ├── actions/
│       │   ├── router.ts                  # Resource + Operation dispatch
│       │   ├── conversation/
│       │   │   ├── sendMessage.operation.ts
│       │   │   ├── sendDirectMessage.operation.ts
│       │   │   └── addUsers.operation.ts
│       │   ├── message/
│       │   │   ├── addLinkAttachments.operation.ts
│       │   │   ├── removeLabel.operation.ts
│       │   │   └── createShareLink.operation.ts
│       │   ├── voiceMemo/
│       │   │   └── create.operation.ts    # text-to-voice + audio binary upload
│       │   ├── actionItem/
│       │   │   ├── create.operation.ts
│       │   │   └── update.operation.ts
│       │   └── aiPrompt/
│       │       └── createResponse.operation.ts
│       ├── triggers/
│       │   ├── router.ts                  # Event dispatch + properties aggregation
│       │   ├── _actionItemFilters.ts      # Shared filter properties for the 4 AI events
│       │   ├── messagePostedToChannel.event.ts
│       │   ├── messageVoicememoCreated.event.ts
│       │   ├── messagePostedToConversation.event.ts
│       │   ├── labelAddedToMessage.event.ts
│       │   ├── aiResponseGenerated.event.ts
│       │   ├── aiSystemResponseGenerated.event.ts
│       │   ├── actionItemCreated.event.ts
│       │   ├── actionItemUpdated.event.ts
│       │   ├── actionItemDeleted.event.ts
│       │   └── actionItemStatusChanged.event.ts
│       └── shared/
│           ├── constants.ts               # BASE_API_URL, event names, operators
│           ├── transport.ts               # carbonVoiceApiRequest, carbonVoiceFormDataRequest, getWhoAmI
│           └── loadOptions.ts             # workspaces, conversations, contacts, folders, labels, prompts
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── README.md                              # public-facing — appears on the n8n marketplace
├── plan.md                                # original generic guide
└── implementation-plan.md                 # this file
```

---

## Architecture

### Single node per role, many operations / events

- **Action node** (`Carbon Voice`) has a Resource dropdown (Conversation, Message, Voice Memo, Action Item, AI Prompt) and an Operation dropdown gated by resource. Operations are individual files with their own `description` (properties) and `execute` function; the router flattens them all into one properties array and dispatches at execute time.
- **Trigger node** (`Carbon Voice Trigger`) has an Event dropdown that surfaces all 10 events. Each event file exports `EVENT_VALUE`, an option entry, its filter properties, and a `buildFilters` function. The router flattens, dispatches, and surfaces them as one webhook node.

Adding the eleventh trigger event or eleventh operation = drop one file in the right subfolder, append one line to the router. The main node classes stay thin.

### Webhook subscription lifecycle

`webhookMethods.default` on the trigger node maps to three Carbon Voice endpoints:

| n8n hook | Carbon Voice call | When |
|---|---|---|
| `checkExists` | (state lookup on `workflowStaticData`) | Before activation, to detect already-subscribed state |
| `create` | `POST /apps/subscribe` | On workflow activation / test. Stores both the returned `subscriptionId` and the `client_id` the backend bound the subscription to. |
| `delete` | `DELETE /apps/{client_id}/unsubscribe/{id}` | On workflow deactivation / test teardown |
| `webhook` | (no Carbon Voice call) | Fires when Carbon Voice POSTs to the n8n URL. Emits the payload as the trigger output. |

The subscribe call carries `subscription_filters` (server-side filtering) so n8n never receives events that don't match.

### Filter shape — the bit that took several iterations to land

The public subscribe endpoint validates filters strictly:

- **`eq` / `ne` operators** — `value` must be a **single string or number**.
- **`in` operator** — `value` must be an **array of strings**.
- **Recognized keys** (per backend validator):
  - `creator_id` (singular) — single value with `eq` or `ne`
  - `workspace_ids` (plural) — array with `in`
  - `channel_ids` (plural) — array with `in`
  - `folder_ids` (plural) — array with `in`
  - `container_type`, `container_id`, `assigned_to`, `status` etc. for action-item events — single value with `eq`

Sending a singular key (`workspace_id`) or a plural key with `eq`+single-value returns 400. The trigger event files in this repo are aligned to those rules.

---

## Trigger coverage (10 events, all wired)

| n8n Event option | Wire-level subscription event | Filter fields |
|---|---|---|
| New Message Received | `message.posted.to.channel` | `workspace_ids` (optional); server-side `creator_id != me` to suppress self-loops |
| New Voice Memo Posted | `message.voicememo.created` | `workspace_ids`, `folder_ids` |
| Message Posted to Conversation | `message.posted.to.channel` | `channel_ids` (required) |
| Label Added to Message | `message.label.added` | Label ID (required, single-value) |
| AI Response Generated | `ai.prompt.response.generated` | Prompt ID (required) |
| AI System Response Generated | `ai.prompt.response.generated` | System prompt ID (required, narrower filter via `system_prompt_id`) |
| Action Item Created | `action-item.created` | `workspace_ids`, container_type / container_id, `assigned_to`, `creator_id` |
| Action Item Updated | `action-item.updated` | same as Created |
| Action Item Deleted | `action-item.deleted` | same as Created |
| Action Item Status Changed | `action-item.status.changed` | same as Created + `status` |

Two events (`Message Posted to Conversation`, `AI System Response Generated`) ride the same wire-level subscription string as another event but use a narrower filter — the router handles this via `SUBSCRIPTION_EVENT_OVERRIDE` on those modules.

---

## Action coverage (10 operations, all wired)

| Resource | Operation | HTTP |
|---|---|---|
| Conversation | Send Message | `POST /simplified/messages/conversation/{id}` |
| Conversation | Send Direct Message | `POST /simplified/messages/direct` |
| Conversation | Add Users | `POST /simplified/conversations/{id}/users` |
| Message | Add Link Attachments | `POST /simplified/messages/{id}/attachments/bulk/link` |
| Message | Remove Label | `DELETE /labels/{labelId}/message/{workspaceId}/{messageId}` |
| Message | Create Share Link | `POST /simplified/message-sharelinks` |
| Voice Memo | Create (text or audio) | `POST /simplified/messages/voicememo` — JSON when text, multipart when binary audio |
| Action Item | Create | `POST /action-items` |
| Action Item | Update | `PUT /action-items/{id}` (fields) + `PATCH /action-items/{id}/status` (status, if provided) |
| AI Prompt | Create Response | `POST /responses` |

Action implementations port directly from `cv-zapier/src/creates/*.create.ts`. Dynamic dropdowns translate cleanly from Zapier `dynamic` fields to n8n `loadOptionsMethod`.

---

## Shared layer

| File | Purpose | Maps to in `cv-zapier` |
|---|---|---|
| `shared/transport.ts` | `carbonVoiceApiRequest` (JSON), `carbonVoiceFormDataRequest` (multipart upload), `getWhoAmI` | `cv-zapier/src/helpers/` |
| `shared/constants.ts` | `BASE_API_URL`, event names, operator enum, filter typedef | `cv-zapier/src/constants.ts` + `cv-zapier/src/entities.ts` |
| `shared/loadOptions.ts` | `getWorkspaces`, `getConversations` (filtered by workspace), `getContacts`, `getVoiceMemoFolders`, `getPrerecordedFolders`, `getLabels`, `getAIPrompts` | `cv-zapier/src/resources/*.resource.ts` |

---

## Building / testing locally

```bash
# Install
npm install

# Build
npm run build

# Lint
npm run lint

# Dev mode — links into a local n8n install and watches for changes
npm run dev

# Dev mode with public webhook delivery — point n8n at an ngrok tunnel
WEBHOOK_URL=https://your-subdomain.ngrok-free.dev npm run dev
```

`@n8n/node-cli dev` handles the link-into-`~/.n8n`-and-watch dance internally. Subscription webhooks need a public URL so they can be reached from Carbon Voice — use ngrok (free static domain is enough).

---

## Publishing

```bash
npm run release
```

`@n8n/node-cli release` runs lint + build + `npm publish`. After publish, the node appears under **Settings → Community Nodes** for any n8n instance that installs `n8n-nodes-carbonvoice`.

For pre-publish dry-runs:

```bash
npm pack --dry-run
```

---

## Open items (post-`0.1.0`)

1. **Submit to the n8n verified community marketplace** — optional, gets a badge and better discoverability. Process: <https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/>
2. **Add example workflow JSON exports** in the repo so users can import a starting workflow with one click.
3. **Verify the four Action Item triggers** end-to-end (the singular filter keys for `container_type` / `container_id` / `assigned_to` / `status` may still need plural/operator adjustments — the AI prompt and label triggers may have similar issues).
4. **Add webhook payload signature verification** in `webhook()` if/when Carbon Voice signs outgoing webhooks.

---

## Reference: source mapping

The Zapier integration at `/Users/cristian/Documents/Development/carbon_voice/cv-zapier` is the source of truth for behavior. When porting any trigger or action, find the matching file in:

- Triggers: `cv-zapier/src/triggers/*.trigger.ts`
- Creates → actions: `cv-zapier/src/creates/*.create.ts`
- Resources → loadOptions: `cv-zapier/src/resources/*.resource.ts`
- Models / payload types: `cv-zapier/src/models/simplified-api.ts` (generated from OpenAPI)
- Webhook payload schemas: <https://github.com/PhononX/cv-contracts/tree/main/src/schemas/webhook>
- Subscribe / webhook docs: <https://www.developer.carbonvoice.app/how-to/how-to-register-for-webhooks>
