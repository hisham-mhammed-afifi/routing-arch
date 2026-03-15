# Module Reference

17 feature modules, all lazy-loaded under `/workspace/:id`. Each module has its own routing module, components, services, and state. No module imports another module.

---

## Home

Dashboard and overview. Default landing for admin and owner roles.

| | |
|---|---|
| Route | `/workspace/:id/home` |
| Feature key | None (always accessible) |
| Components | HomeComponent, RedirectToLatestWorkspaceComponent |
| Notes | Both a real feature (dashboard with metrics) and the landing page. No feature guard since every role should reach it as a fallback. |

---

## Playground

Chatbot builder. Complex visual editor.

| | |
|---|---|
| Route | `/workspace/:id/playground` |
| Feature key | `playground` |
| Components | BotBuilderComponent |
| Notes | Self-contained editing tool. Consider `UnsavedChangesGuard` if editing state needs protection. |

---

## Inbox

Live chat. Real-time messaging between agents and end users.

| | |
|---|---|
| Route | `/workspace/:id/inbox`, `/workspace/:id/inbox/:userId` |
| Feature key | `inbox` |
| Components | InboxComponent |
| Real-time | Heavy SignalR consumer. Receives messages, typing indicators, assignment events through the workspace-scoped connection. |
| Notes | Default landing for agent role. The `:userId` param selects a conversation. |

---

## Inbox Activity

Activity log for inbox events. Separate from inbox.

| | |
|---|---|
| Route | `/workspace/:id/inbox-activity` |
| Feature key | `inboxActivity` |
| Components | InboxActivityComponent |

---

## Analytics

Dashboards and reports. Multiple sub-views with their own full-page layouts.

| | |
|---|---|
| Route | `/workspace/:id/analytics` |
| Feature key | `analytics` |
| Sub-routes | `/sessions`, `/service-quality`, `/retention`, `/agent-monitor`, `/user-behavior`, `/words`, `/funnels/:funnelId`, `/quality-management`, `/survey`, `/sla` |
| Nested sub-routes | Under `/sla`: `/conversation-details`, `/agent-performance`, `/breach-analysis`, `/time-distribution`, `/performance-trends` |
| Feature-gated sub-routes | `quality-management` (key: `qualityManagementAnalytics`), `survey` (key: `survey`), `sla` (key: `slaAnalytics`) |
| Components | ~15 components |
| Notes | Default landing for analyst role. Sub-route feature gating uses the same `FeatureGuard` with different data keys on child routes. |

---

## AI Hub

AI training, knowledge base, skills, AI assistant, generative AI.

| | |
|---|---|
| Route | `/workspace/:id/ai-hub` |
| Feature key | `aiHub` |
| Sub-routes | `/list`, `/list/edit`, `/test`, `/knowledge`, `/knowledge/add-unit`, `/knowledge/edit-unit/:unitId`, `/ai-assistant`, `/generative-ai`, `/create/step/:step`, `/skills/:skillId`, `/:tab/locked` |
| Feature-gated sub-routes | `list` and `list/edit` (key: `aiTraining`), `test` (key: `testCases`), `knowledge` (key: `aiKnowledge`), `ai-assistant` (key: `aiAssistant`), `generative-ai` (key: `generativeAi`) |
| CanDeactivate | On `/knowledge/add-unit`, `/knowledge/edit-unit/:unitId`, `/ai-assistant`, `/generative-ai` |
| Components | ~10 components |
| Notes | The `/:tab/locked` route shows a locked state when a sub-feature isn't available in the current plan. |

---

## Campaigns

Broadcast messaging. Multi-step creation flows with channel-specific variants.

| | |
|---|---|
| Route | `/workspace/:id/campaigns` |
| Feature key | `campaigns` |
| Sub-routes | `/list`, `/channelSelect`, `/create/:broadcastId`, `/create/:broadcastId/step/:step`, `/create-whatsapp/:broadcastId/step/:step`, `/create-sms/:broadcastId/step/:step`, `/create-email/:broadcastId/step/:step`, `/edit/:broadcastId`, `/insights/:broadcastId/:broadcastLogId` |
| Guards | `StepValidationGuard` on step routes (validates step 1-4), `UnsavedChangesGuard` on create routes |
| Components | ~12 components |

---

## Comment Acquisition

Facebook comment automation. Step-based creation.

| | |
|---|---|
| Route | `/workspace/:id/comment-acquisition` |
| Feature key | `commentAcquisition` |
| Sub-routes | `/list`, `/create/:channel/:commentId`, `/create/:channel/:commentId/step/:step`, `/edit/:commentId` |
| Guards | `StepValidationGuard` on step routes (validates step 1-3), `UnsavedChangesGuard` on create routes |
| Components | ~5 components |

---

## Customers

Customer/contact center. CRM functionality.

| | |
|---|---|
| Route | `/workspace/:id/customers` |
| Feature key | `customers` |
| Components | CustomerCenterComponent |

---

## Identity

Identity and user management.

| | |
|---|---|
| Route | `/workspace/:id/identity` |
| Feature key | `identity` |
| Components | IdentityManagerComponent |

---

## Marketplace

App marketplace. Browse, preview, and install integrations.

| | |
|---|---|
| Route | `/workspace/:id/marketplace` |
| Feature key | `marketplace` |
| Sub-routes | `/:categoryId`, `/:categoryId/:appId`, `/:categoryId/:appId/install` |
| Resolvers | `CategoryResolver` (on module entry), `AppResolver` (on app preview/install) |
| Components | ~3 components |
| Notes | Has its own resolvers for category and app data. These are module-scoped, not shared. |

---

## Logs

Log viewer.

| | |
|---|---|
| Route | `/workspace/:id/logs` |
| Feature key | `logs` |
| Components | LogManagerComponent |

---

## Text-to-Speech

Text-to-speech configuration.

| | |
|---|---|
| Route | `/workspace/:id/text-to-speech` |
| Feature key | `textToSpeech` |
| CanDeactivate | UnsavedChangesGuard |
| Components | TextToSpeechComponent |

---

## Setup

Initial workspace configuration wizard.

| | |
|---|---|
| Route | `/workspace/:id/setup` |
| Feature key | `setup` |
| Components | SetupComponent |

---

## Payment

Plan selection and checkout. Workspace-scoped.

| | |
|---|---|
| Route | `/workspace/:id/payment` |
| Feature key | `payment` |
| Sub-routes | `/pricing`, `/checkout/:plan`, `/downgrade/:plan` |
| Components | PaymentPlansComponent, PlanUpgradeComponent, DowngradePlanComponent |

---

## Subscription Details

Current subscription information for the workspace.

| | |
|---|---|
| Route | `/workspace/:id/subscription-details` |
| Feature key | `subscriptionDetails` |
| Components | SubscriptionDetailsComponent |

---

## Settings

Workspace settings. Largest module. Uses a secondary sidenav via `SettingsShellComponent`.

| | |
|---|---|
| Route | `/workspace/:id/settings` |
| Feature key | `settings` |
| Layout | SettingsShellComponent provides a sub-sidenav. Settings sections render in its router-outlet. |
| Default | Redirects to `/info` |

### Settings sub-routes

| Section | Route | Feature key (if gated) |
|---------|-------|----------------------|
| Workspace info | `/info` | |
| Webchat channel | `/channels/webchat` | |
| Facebook channel | `/channels/facebook` | |
| Instagram channel | `/channels/instagram` | |
| Twitter channel | `/channels/twitter` | |
| WhatsApp channel | `/channels/whatsapp` | |
| SMS channel | `/channels/sms` | `smsChannel` |
| Email channel | `/channels/email` | `emailChannel` |
| Call channel | `/channels/call` | `callChannel` |
| AI Agent | `/ai-agent` | `aiAgent` |
| AI Agent setup | `/ai-agent/setup` | `aiAgent` |
| AI Agent edit | `/ai-agent/edit/:channelId` | `aiAgent` |
| Team manager | `/team` | |
| Agent working shifts | `/agents/working-shifts` | |
| Agent SLA permissions | `/agents/sla-permissions` | |
| Agent teams | `/agents/teams` | |
| Agent other settings | `/agents/other-settings` | |
| Inbox tags | `/inbox-tags` | |
| Segments | `/segments/:type` | |
| Integrations (webhooks) | `/integrations` | |
| Conversational AI | `/conversational-ai` | `conversationalAi` |
| Voice models | `/voice-models` | `voiceModels` |
| Language config | `/language` | `languageConfiguration` |
| API keys | `/api` | |
| Add-ons | `/addons` | |
| Documents | `/documents` | |
| Billing plan | `/billing/plan` | |
| Billing wallet | `/billing/wallet` | |
| Billing transactions | `/billing/transactions` | |
| Billing company details | `/billing/company-details` | |
| Purchase history | `/purchase-history` | |
| Transactions | `/transaction` | `transactions` |

Components: ~26 across all sections. Channel settings may lazy-load their own sub-modules (call, ai-agent) for heavier sections.
