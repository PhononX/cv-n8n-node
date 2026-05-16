# @carbonvoice/n8n-nodes-carbonvoice

[![npm version](https://img.shields.io/npm/v/@carbonvoice/n8n-nodes-carbonvoice.svg)](https://www.npmjs.com/package/@carbonvoice/n8n-nodes-carbonvoice)
[![license](https://img.shields.io/npm/l/@carbonvoice/n8n-nodes-carbonvoice.svg)](https://github.com/PhononX/cv-n8n-node/blob/main/LICENSE.md)

Official [Carbon Voice](https://carbonvoice.app) community node for [n8n](https://n8n.io). Send messages, post voice memos, manage action items, run AI prompts, and react to events across your Carbon Voice workspaces — all from your n8n workflows.

> **Note:** This is a community node. Self-hosted n8n users can install it from the Community Nodes panel. n8n Cloud users need to enable community nodes in their account settings.

---

## What's included

### Trigger node — `Carbon Voice Trigger`

Starts a workflow when an event fires in Carbon Voice. One node, ten event types:

| Event | Fires when |
|---|---|
| New Message Received | Someone other than you posts a message in a conversation you're part of |
| Message Posted to Conversation | Any message lands in a specific conversation |
| New Voice Memo Posted | A new voice memo is posted (optionally scoped to workspace / folder) |
| Label Added to Message | A specific label is applied to a message |
| AI Response Generated | An AI prompt produces a response |
| AI System Response Generated | A curated system prompt produces a response |
| Action Item Created | A new action item is created |
| Action Item Updated | An action item is updated |
| Action Item Deleted | An action item is deleted |
| Action Item Status Changed | An action item's status changes (suggested → todo → done) |

Most events accept optional filters (workspace, folder, conversation, assigned user, etc.) so you only receive the events that match.

### Action node — `Carbon Voice`

A single action node with five resources and ten operations:

| Resource | Operation |
|---|---|
| **Conversation** | Send Message |
| | Send Direct Message (to one or more users by ID or email) |
| | Add Users |
| **Message** | Add Link Attachments |
| | Remove Label |
| | Create Share Link (public or specified-access) |
| **Voice Memo** | Create (text-to-voice **or** upload audio binary) |
| **Action Item** | Create |
| | Update (fields and/or status) |
| **AI Prompt** | Create Response |

Dynamic dropdowns power the workspace, conversation, user, folder, label and AI prompt fields — no copy/pasting IDs.

---

## Install

### n8n self-hosted

1. Open **Settings → Community Nodes**.
2. Click **Install**.
3. Paste `@carbonvoice/n8n-nodes-carbonvoice` and confirm.

After the package installs, restart n8n. Both `Carbon Voice` and `Carbon Voice Trigger` appear in the node picker.

### n8n Cloud

Community nodes need to be enabled for your Cloud account. See the [n8n docs](https://docs.n8n.io/integrations/community-nodes/installation/) for the current process.

---

## Authentication

This node authenticates with a **Personal Access Token (PAT)**.

1. Sign in at [carbonvoice.app](https://carbonvoice.app).
2. Open the [Developer Portal](https://developer.carbonvoice.app) → **Personal Access Tokens**.
3. Click **New token**, give it a name (e.g. `n8n`), and copy the value. **The token is shown once — copy it before closing the dialog.**
4. In n8n: **Credentials → New → Carbon Voice API** → paste the token → **Save**.

The credential test will hit `/whoami` immediately so you'll know it worked.

The same credential is used by both the action node and the trigger node.

---

## Quick start — your first workflow

**Example: relay every new Carbon Voice voice memo into Slack**

1. Drop a `Carbon Voice Trigger` node.
2. Pick the credential you just created.
3. Event: **New Voice Memo Posted**. Optionally pick a workspace / folder to filter.
4. Save → **Publish** the workflow.
5. Connect a Slack node next to it that posts the `transcript_txt` field to a channel.

Whenever someone records a new voice memo in the chosen workspace, the workflow runs.

---

## Trigger test mode

n8n's **Test this trigger** button works end-to-end with Carbon Voice — clicking it registers a short-lived subscription, waits for the next matching event, and shows you the raw payload.

For workflows that should run continuously (not just for testing), use **Publish** instead — that registers a persistent subscription that survives n8n restarts.

---

## Configuration tips

- **Workspace filter** on triggers is optional. If you leave it blank, the trigger fires for events across every workspace your user has access to.
- **Send Direct Message** accepts either user IDs (from the dropdown) **or** comma-separated emails. Use emails for recipients who aren't yet in your contacts.
- **Create Voice Memo** has two source modes: type the text and the server reads it aloud, or hand it a binary property from a previous node (e.g. a `Read Binary File` or an upstream HTTP download) and the audio is uploaded directly.
- **Create Share Link** defaults to public. Pick **Specified** if you want to limit access to certain users, workspaces, or conversations.

---

## Troubleshooting

**"The credential is incorrect" when saving**
The PAT may have been revoked or copied incorrectly. Generate a new one in the developer portal.

**Trigger activates but no events arrive**
Open the n8n executions tab — the trigger may have fired but the workflow had an error downstream. Also double-check that messages are being sent from a different Carbon Voice user; the **New Message Received** event filters out events whose creator matches the authenticated user (no self-loops).

**`Bad request - please check your parameters` when activating a trigger**
Almost always a filter shape mismatch. Open an issue with the request body so we can adjust the filter schema — Carbon Voice validates filter keys + operator combinations strictly.

**Webhook arrives in ngrok but n8n shows no execution**
Make sure the workflow is **Published** (not just saved). Test-mode subscriptions expire after the first matching event.

---

## Versioning & contributing

This package follows [Semantic Versioning](https://semver.org). Breaking changes bump the major.

Issues and PRs welcome: [github.com/PhononX/cv-n8n-node](https://github.com/PhononX/cv-n8n-node).

---

## License

[MIT](./LICENSE.md) © Carbon Voice
# Published via GitHub Actions with npm provenance
# Published via GitHub Actions with npm provenance
# Published via GitHub Actions with npm provenance
