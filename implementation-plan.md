# Carbon Voice — n8n Community Node (Implementation Plan)

> Companion to `plan.md` — that doc captures the original generic n8n development guide. This doc captures the **actual implementation decisions** for `n8n-nodes-carbonvoice`, derived from auditing `cv-zapier` and the Carbon Voice webhook backend.

---

## Goal

Build a published n8n community node package (`n8n-nodes-carbonvoice`) that gives n8n users the same surface area Carbon Voice already exposes through its Zapier integration: webhook-driven triggers + action nodes for messaging, voice memos, action items, AI prompts, and labels.

End state: a user installs the package via **Settings → Community Nodes**, connects with Carbon Voice OAuth2, and drags `Carbon Voice Trigger` or `Carbon Voice` action nodes into workflows.

---

## Design decisions (and why they differ from `plan.md`)

| Decision | Original `plan.md` | This plan | Why changed |
|---|---|---|---|
| Auth | PAT (Bearer token) | **OAuth2** | The webhook subscribe endpoint is scoped to an OAuth app (`POST /apps/{client_id}/subscribe`). PAT alone cannot subscribe — OAuth2 is required to use webhook triggers. |
| Trigger style | Polling every 60s | **Webhook subscriptions** | The Carbon Voice backend already has a subscribe/unsubscribe webhook system (powers the in-app Webhook Setup UI and Zapier). Polling would duplicate that and add 60s lag. |
| Coverage scope | 2 triggers + 3 actions | **10 triggers + 10 actions** | Parity with `cv-zapier`. |
| Package name | `n8n-nodes-myapp` (placeholder) | `n8n-nodes-carbonvoice` | npm naming convention for n8n community nodes. |

---

## Prerequisite — Backend coordination

Before this node can ship, the Carbon Voice backend team needs to **provision an OAuth app for n8n** (analogous to the Zapier app):

- `CLIENT_ID` + `CLIENT_SECRET` registered against `https://api.carbonvoice.app`
- Redirect URI matching n8n's OAuth callback: `https://<n8n-host>/rest/oauth2-credential/callback` (n8n's standard OAuth2 callback path; users plug their own n8n host into the n8n credential UI)
- The OAuth app must be allowed to call `/apps/{client_id}/subscribe` and `/apps/{client_id}/unsubscribe`

If we publish this as a public community node, we either:
- **Ship a shared "Carbon Voice n8n" app** (users use shared keys, easier UX) — recommended.
- Or document how each customer registers their own OAuth app (more setup, more isolation).

**Open asks for the backend team:**
1. Confirm `webhookURL` passed to `/subscribe` accepts arbitrary URLs (n8n is often self-hosted, so URLs are not under our control).
2. Confirm whether incoming POSTs from the webhook system are signed, and how to verify the signature inside `webhook()`.

---

## Current state — what's already scaffolded

The repo is bootstrapped from `n8n-io/n8n-nodes-starter` and one reference webhook trigger is implemented end-to-end. Build + lint are clean.

```
cv-n8n-node/
├── credentials/
│   └── CarbonVoiceOAuth2Api.credentials.ts    # OAuth2 credential (extends 'oAuth2Api')
├── icons/
│   ├── carbonvoice.svg                        # Light-mode icon
│   └── carbonvoice.dark.svg                   # Dark-mode icon
├── nodes/
│   └── CarbonVoiceTrigger/
│       ├── CarbonVoiceTrigger.node.ts         # Trigger node (webhook subscribe/unsubscribe)
│       ├── CarbonVoiceTrigger.node.json       # n8n marketplace metadata
│       └── shared/
│           ├── constants.ts                   # BASE_API_URL, SubscriptionEvents, Operator
│           └── transport.ts                   # carbonVoiceApiRequest, getWhoAmI
├── package.json                               # n8n-nodes-carbonvoice
├── tsconfig.json
├── eslint.config.mjs
├── plan.md                                    # original development guide
└── implementation-plan.md                     # this file
```

The reference trigger currently supports **one event** (`message.posted.to.channel` — "New Message Received"). The trigger node is structured so adding the remaining 9 events is just appending entries to the `Event` options list and (where applicable) adding event-specific filter fields gated by `displayOptions`.

---

## Architecture

### Single trigger node, many events

Rather than one node per event (10 separate nodes cluttering the n8n sidebar), we use **one `Carbon Voice Trigger` node** with an `Event` dropdown. This matches how Slack, Telegram, and most modern n8n triggers are structured.

```typescript
properties: [
  { displayName: 'Event', name: 'event', type: 'options', options: [/* 10 events */] },
  // Event-specific filter fields gated by displayOptions.show.event
]
```

### Webhook subscription lifecycle

n8n's `webhookMethods.default` hooks map cleanly to Carbon Voice's subscribe/unsubscribe endpoints:

| n8n hook | Carbon Voice call | When |
|---|---|---|
| `checkExists` | (state check on `workflowStaticData`) | Before activation, to detect already-subscribed |
| `create` | `POST /apps/{client_id}/subscribe` | On workflow activation. Stores returned `subscriptionId`. |
| `delete` | `DELETE /apps/{client_id}/unsubscribe/{id}` | On workflow deactivation. |
| `webhook` | (no Carbon Voice call) | When Carbon Voice POSTs to the n8n URL. Emits payload. |

The subscribe call carries `subscription_filters` (server-side filtering) so n8n never receives events that don't match the user's criteria. This is strictly better than polling-then-filtering.

### Action nodes (not yet scaffolded)

Actions go in a sibling node directory `nodes/CarbonVoice/` (the "doing" node, vs `CarbonVoiceTrigger/` the "listening" node). Single node with `Resource` + `Operation` dropdowns, matching the GitHub pattern from the starter.

---

## Trigger coverage (10 events — parity with Zapier)

All triggers use the same `webhookMethods.default` shape. They differ only in:
- The event string passed in `subscriptions: [...]`
- The optional filter fields exposed in node properties
- The fetch-full-resource call done in `webhook()` (some events deliver just an ID; we fetch the full object before emitting)

| n8n Event option | Subscription event | Filter fields | Notes |
|---|---|---|---|
| New Message Received | `message.posted.to.channel` | `Workspace ID` (optional); server-side filter `creator_id != me` | ✅ Implemented in current scaffold |
| New Voice Memo Posted | `message.voicememo.created` | `Workspace ID`, `Folder ID` | Mirrors Zapier `MessageVoicememoCreatedTrigger` |
| Message Posted to Conversation | `message.posted.to.channel` | `Conversation ID` | Different filter from "received" — includes own messages, scoped to one conversation |
| Label Added to Message | `message.label.added` | `Workspace ID`, `Label ID` | Mirrors Zapier `LabelAddedToMessageTrigger` |
| AI Response Generated | `ai.prompt.response.generated` | `Prompt ID` | Mirrors Zapier `AiResponseGeneratedTrigger` |
| AI System Response Generated | `ai.prompt.response.generated` | `Prompt ID` ∈ (curated system prompts) | Same event, narrower filter |
| Action Item Created | `action-item.created` | `Workspace ID`, `Assigned To` | Factory-style in Zapier (`createActionItemTrigger`) |
| Action Item Updated | `action-item.updated` | `Workspace ID`, `Assigned To` | |
| Action Item Deleted | `action-item.deleted` | `Workspace ID` | |
| Action Item Status Changed | `action-item.status.changed` | `Workspace ID`, `New Status` | |

After the n8n webhook fires, some events benefit from a follow-up `GET /messages/{id}` to enrich the payload (conversation, creator, labels). Mirror this from `cv-zapier/src/triggers/*.trigger.ts` — the `perform` function in each Zapier trigger is the equivalent enrichment step.

---

## Action coverage (10 operations — parity with Zapier)

All actions live in **one** `Carbon Voice` action node with a `Resource` + `Operation` dropdown.

| Resource | Operation | HTTP | n8n shape |
|---|---|---|---|
| Conversation | Send Message | `POST /conversations/{id}/messages` | `execute()` writes text + attachments |
| Conversation | Send Direct Message (to a user) | `POST /conversations/direct` → `POST /conversations/{id}/messages` | Two-step: open DM, then post |
| Conversation | Add Users | `POST /conversations/{id}/users` | Multi-select user picker |
| Message | Add Link Attachments | `PATCH /messages/{id}` | Append links to existing message |
| Message | Remove Label | `DELETE /messages/{id}/labels/{labelId}` | |
| Message | Create Share Link | `POST /messages/{id}/share` | |
| Voice Memo | Post (text-to-voice) | `POST /workspaces/{ws}/folders/{f}/messages` | Body type=voicememo |
| Voice Memo | Post (audio upload) | `POST /workspaces/{ws}/folders/{f}/voicememos` | Multipart binary upload |
| AI Prompt | Create Response | `POST /ai/prompts/{id}/responses` | |
| Action Item | Create | `POST /action-items` | |
| Action Item | Update | `PATCH /action-items/{id}` | |

Action implementations port directly from `cv-zapier/src/creates/*.create.ts`. The shape of inputs (workspace/folder/user dropdowns, attachments fixedCollection) translates cleanly from Zapier `inputFields` → n8n `properties` with the same dynamic loading.

---

## Shared layer

| File | Purpose | Maps to Zapier |
|---|---|---|
| `nodes/CarbonVoiceTrigger/shared/transport.ts` | `carbonVoiceApiRequest`, `getWhoAmI` | `cv-zapier/src/helpers/` |
| `nodes/CarbonVoiceTrigger/shared/constants.ts` | URLs, event names, operators | `cv-zapier/src/constants.ts` + `cv-zapier/src/entities.ts` |
| `nodes/CarbonVoice/shared/loadOptions.ts` *(to add)* | `getWorkspaces`, `getWorkspaceUsers`, `getFolders`, `getConversations`, `getLabels`, `getPrompts` | `cv-zapier/src/resources/*.resource.ts` |
| `nodes/CarbonVoice/shared/resolveAttachments.ts` *(to add)* | Build attachments array from link defs + binary uploads | `cv-zapier/src/creates/add-link-attachments-to-message.create.ts` + similar |

The two shared folders are **separate** rather than hoisted to a top-level `shared/` because the n8n-nodes-starter convention puts shared code under each node folder. If duplication grows we'll hoist later.

---

## Building locally

```bash
# Build
npm run build

# Lint
npm run lint

# Dev mode — links into a local n8n install and watches
npm run dev
```

The starter ships with `@n8n/node-cli`, which handles the link-into-`~/.n8n`-and-watch dance internally. No manual `npm link` needed.

---

## Publishing

```bash
npm run release
```

`@n8n/node-cli release` runs lint + build + npm publish. After publish, the node appears under **Settings → Community Nodes** for any n8n instance that installs `n8n-nodes-carbonvoice`.

---

## Next steps (in order)

1. **Backend coordination** *(in progress — user is getting CLIENT_ID/CLIENT_SECRET)*:
   - Provision the n8n OAuth app, get `CLIENT_ID`/`CLIENT_SECRET`.
   - Confirm `webhookURL` accepts arbitrary URLs (for self-hosted n8n).
   - Confirm whether webhook POSTs are signed (and how to verify).
2. **Wire up the remaining 9 trigger events** — append to the `Event` options list in `CarbonVoiceTrigger.node.ts`, add per-event filter fields gated by `displayOptions`. Port enrichment calls from each `cv-zapier/src/triggers/*.trigger.ts`.
3. **Scaffold the action node** at `nodes/CarbonVoice/CarbonVoice.node.ts` — single node, `Resource` + `Operation` dropdowns, port all 10 creates from `cv-zapier/src/creates/`.
4. **Add `loadOptions` methods** — `getWorkspaces`, `getWorkspaceUsers`, `getFolders`, `getConversations`, `getLabels`, `getPrompts` — so dropdowns are dynamic, matching Zapier `dynamic` fields.
5. **Manual test** — register a test workflow against staging, verify subscribe/unsubscribe lifecycle, verify each event fires with the right payload shape.
6. **Publish a `0.1.0-beta`** to npm under a scoped name first, install in a real n8n instance, dogfood for one week, then promote to `0.1.0`.

---

## Reference: source mapping

The Zapier integration at `/Users/cristian/Documents/Development/carbon_voice/cv-zapier` is the source of truth for behavior. When porting any trigger or action, find the matching file in:

- Triggers: `cv-zapier/src/triggers/*.trigger.ts`
- Creates → actions: `cv-zapier/src/creates/*.create.ts`
- Resources → loadOptions: `cv-zapier/src/resources/*.resource.ts`
- Models/types: `cv-zapier/src/models/simplified-api.ts` (generated from OpenAPI)
- Sample payloads: `cv-zapier/src/samples/`
