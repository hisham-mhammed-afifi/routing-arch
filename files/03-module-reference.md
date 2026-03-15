# Module Reference

17 feature remotes, all independently built and deployed Nx applications. Each remote exposes its routes via `./Routes` in its `module-federation.config.ts`. The shell loads them into `WorkspaceShellComponent`'s `<router-outlet>` via `loadRemoteModule`.

### Quick-Reference Table

| Remote | Route | Feature Key | Bundle | Team | Real-time | Exposed Module |
|--------|-------|-------------|--------|------|-----------|----------------|
| home | `/home` | _(none)_ | S | Platform | Light (notifications) | `./Routes` |
| playground | `/playground` | `playground` | M | AI | No | `./Routes` |
| inbox | `/inbox` | `inbox` | L | Engagement | **Yes** (SignalR) | `./Routes` |
| inbox-activity | `/inbox-activity` | `inboxActivity` | M | Engagement | No | `./Routes` |
| analytics | `/analytics` | `analytics` | XL | Growth | No | `./Routes` |
| ai-hub | `/ai-hub` | `aiHub` | L | AI | No | `./Routes` |
| campaigns | `/campaigns` | `campaigns` | L | Engagement | No | `./Routes` |
| comment-acquisition | `/comment-acquisition` | `commentAcquisition` | M | Engagement | No | `./Routes` |
| customers | `/customers` | `customers` | S | Engagement | No | `./Routes` |
| identity | `/identity` | `identity` | S | Growth | No | `./Routes` |
| marketplace | `/marketplace` | `marketplace` | M | Growth | No | `./Routes` |
| logs | `/logs` | `logs` | S | Platform | No | `./Routes` |
| text-to-speech | `/text-to-speech` | `textToSpeech` | S | AI | No | `./Routes` |
| setup | `/setup` | `setup` | S | Platform | No | `./Routes` |
| payment | `/payment` | `payment` | M | Platform | No | `./Routes` |
| subscription-details | `/subscription-details` | `subscriptionDetails` | S | Platform | No | `./Routes` |
| settings | `/settings` | `settings` | XL | Platform | No | `./Routes` |

> All routes are relative to `/workspace/:id`. Bundle size categories: **S** < 50 KB, **M** 50-150 KB, **L** 150-300 KB, **XL** 300 KB+.

---

## Home

Dashboard and overview. Default landing for admin and owner roles.

| | |
|---|---|
| Nx app | `apps/home` |
| Route | `/workspace/:id/home` |
| Feature key | None (always accessible) |
| Components | `HomeComponent`, `RedirectToLatestWorkspaceComponent` |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui` |
| Team | Platform |

---

## Playground

Chatbot builder. Complex visual editor.

| | |
|---|---|
| Nx app | `apps/playground` |
| Route | `/workspace/:id/playground` |
| Feature key | `playground` |
| Components | `BotBuilderComponent` |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui` |
| Team | AI |
| Notes | Self-contained editing tool. Consider `unsavedChangesGuard` if editing state needs protection. |

---

## Inbox

Live chat. Real-time messaging between agents and end users.

| | |
|---|---|
| Nx app | `apps/inbox` |
| Route | `/workspace/:id/inbox`, `/workspace/:id/inbox/:userId` |
| Feature key | `inbox` |
| Components | `InboxComponent` |
| Real-time | Heavy SignalR consumer. Receives messages, typing indicators, assignment events through the workspace-scoped connection. |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/signalr`, `@pwa/ui`, `@pwa/utils` |
| Team | Engagement |
| Notes | Default landing for agent role. The `:userId` param selects a conversation. |

---

## Inbox Activity

Activity log for inbox events. Separate from inbox.

| | |
|---|---|
| Nx app | `apps/inbox-activity` |
| Route | `/workspace/:id/inbox-activity` |
| Feature key | `inboxActivity` |
| Components | `InboxActivityComponent` |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui` |
| Team | Engagement |

---

## Analytics

Dashboards and reports. Multiple sub-views with their own full-page layouts.

| | |
|---|---|
| Nx app | `apps/analytics` |
| Route | `/workspace/:id/analytics` |
| Feature key | `analytics` |
| Sub-routes | `/sessions`, `/service-quality`, `/retention`, `/agent-monitor`, `/user-behavior`, `/words`, `/funnels/:funnelId`, `/quality-management`, `/survey`, `/sla` |
| Nested sub-routes | Under `/sla`: `/conversation-details`, `/agent-performance`, `/breach-analysis`, `/time-distribution`, `/performance-trends` |
| Feature-gated sub-routes | `quality-management` (key: `qualityManagementAnalytics`), `survey` (key: `survey`), `sla` (key: `slaAnalytics`) |
| Components | ~15 standalone components |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui`, `@pwa/data-access` |
| Team | Growth |
| Notes | Default landing for analyst role. Sub-route feature gating uses the same `featureGuard` imported from `@pwa/workspace-context` with different data keys on child routes. |

---

## AI Hub

AI training, knowledge base, skills, AI assistant, generative AI.

| | |
|---|---|
| Nx app | `apps/ai-hub` |
| Route | `/workspace/:id/ai-hub` |
| Feature key | `aiHub` |
| Sub-routes | `/list`, `/list/edit`, `/test`, `/knowledge`, `/knowledge/add-unit`, `/knowledge/edit-unit/:unitId`, `/ai-assistant`, `/generative-ai`, `/create/step/:step`, `/skills/:skillId`, `/:tab/locked` |
| Feature-gated sub-routes | `list` (key: `aiTraining`), `test` (key: `testCases`), `knowledge` (key: `aiKnowledge`), `ai-assistant` (key: `aiAssistant`), `generative-ai` (key: `generativeAi`) |
| CanDeactivate | On `/knowledge/add-unit`, `/knowledge/edit-unit/:unitId`, `/ai-assistant`, `/generative-ai` |
| Components | ~10 standalone components |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui`, `@pwa/data-access` |
| Team | AI |

---

## Campaigns

Broadcast messaging. Multi-step creation flows with channel-specific variants.

| | |
|---|---|
| Nx app | `apps/campaigns` |
| Route | `/workspace/:id/campaigns` |
| Feature key | `campaigns` |
| Sub-routes | `/list`, `/channelSelect`, `/create/:broadcastId`, `/create/:broadcastId/step/:step`, `/create-whatsapp/:broadcastId/step/:step`, `/create-sms/:broadcastId/step/:step`, `/create-email/:broadcastId/step/:step`, `/edit/:broadcastId`, `/insights/:broadcastId/:broadcastLogId` |
| Internal guards | `stepValidationGuard` on step routes (validates step 1-4), `unsavedChangesGuard` on create routes |
| Components | ~12 standalone components |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui`, `@pwa/utils` |
| Team | Engagement |

---

## Comment Acquisition

Facebook comment automation. Step-based creation.

| | |
|---|---|
| Nx app | `apps/comment-acquisition` |
| Route | `/workspace/:id/comment-acquisition` |
| Feature key | `commentAcquisition` |
| Sub-routes | `/list`, `/create/:channel/:commentId`, `/create/:channel/:commentId/step/:step`, `/edit/:commentId` |
| Internal guards | `stepValidationGuard` on step routes (validates step 1-3), `unsavedChangesGuard` on create routes |
| Components | ~5 standalone components |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui` |
| Team | Engagement |

---

## Customers

Customer/contact center. CRM functionality.

| | |
|---|---|
| Nx app | `apps/customers` |
| Route | `/workspace/:id/customers` |
| Feature key | `customers` |
| Components | `CustomerCenterComponent` |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui`, `@pwa/data-access` |
| Team | Engagement |

---

## Identity

Identity and user management.

| | |
|---|---|
| Nx app | `apps/identity` |
| Route | `/workspace/:id/identity` |
| Feature key | `identity` |
| Components | `IdentityManagerComponent` |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/auth`, `@pwa/ui` |
| Team | Growth |

---

## Marketplace

App marketplace. Browse, preview, and install integrations.

| | |
|---|---|
| Nx app | `apps/marketplace` |
| Route | `/workspace/:id/marketplace` |
| Feature key | `marketplace` |
| Sub-routes | `/:categoryId`, `/:categoryId/:appId`, `/:categoryId/:appId/install` |
| Internal resolvers | `categoryResolver` (on entry), `appResolver` (on app preview/install) -- remote-local, not shared |
| Components | ~3 standalone components |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui`, `@pwa/data-access` |
| Team | Growth |

---

## Logs

Log viewer.

| | |
|---|---|
| Nx app | `apps/logs` |
| Route | `/workspace/:id/logs` |
| Feature key | `logs` |
| Components | `LogManagerComponent` |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui` |
| Team | Platform |

---

## Text-to-Speech

Text-to-speech configuration.

| | |
|---|---|
| Nx app | `apps/text-to-speech` |
| Route | `/workspace/:id/text-to-speech` |
| Feature key | `textToSpeech` |
| CanDeactivate | `unsavedChangesGuard` |
| Components | `TextToSpeechComponent` |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui` |
| Team | AI |

---

## Setup

Initial workspace configuration wizard.

| | |
|---|---|
| Nx app | `apps/setup` |
| Route | `/workspace/:id/setup` |
| Feature key | `setup` |
| Components | `SetupComponent` |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui` |
| Team | Platform |

---

## Payment

Plan selection and checkout. Workspace-scoped.

| | |
|---|---|
| Nx app | `apps/payment` |
| Route | `/workspace/:id/payment` |
| Feature key | `payment` |
| Sub-routes | `/pricing`, `/checkout/:plan`, `/downgrade/:plan` |
| Components | `PaymentPlansComponent`, `PlanUpgradeComponent`, `DowngradePlanComponent` |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui`, `@pwa/data-access` |
| Team | Platform |

---

## Subscription Details

Current subscription information for the workspace.

| | |
|---|---|
| Nx app | `apps/subscription-details` |
| Route | `/workspace/:id/subscription-details` |
| Feature key | `subscriptionDetails` |
| Components | `SubscriptionDetailsComponent` |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/ui`, `@pwa/data-access` |
| Team | Platform |

---

## Settings

Workspace settings. Largest remote. Uses a secondary sidenav provided by the shell's `SettingsShellComponent`.

| | |
|---|---|
| Nx app | `apps/settings` |
| Route | `/workspace/:id/settings` |
| Feature key | `settings` |
| Layout | SettingsShellComponent (in shell) provides a sub-sidenav. Settings sections render in its `<router-outlet>`. |
| Default | Redirects to `/info` |
| Shared libs consumed | `@pwa/workspace-context`, `@pwa/brand`, `@pwa/ui`, `@pwa/data-access` |
| Team | Platform |

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

Components: ~26 standalone components across all sections.

---

## Standard Federation Config (Template)

Every remote follows this pattern:

```typescript
// apps/<remote-name>/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: '<remote-name>',
  exposes: {
    './Routes': 'apps/<remote-name>/src/app/remote-entry/entry.routes.ts',
  },
};
export default config;
```

```typescript
// apps/<remote-name>/webpack.config.ts
import { withModuleFederation } from '@nx/angular/module-federation';
import config from './module-federation.config';
export default withModuleFederation(config, { dts: false });
```

```typescript
// apps/<remote-name>/src/app/remote-entry/entry.routes.ts
import { Routes } from '@angular/router';

export const remoteRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../<name>.component').then(c => c.<Name>Component),
  },
];
```

### Rules

1. **Every remote exposes exactly `./Routes`.** The shell expects this contract. No other exposed modules.
2. **Top-level guards are the shell's responsibility.** The remote's `entry.routes.ts` has no `canActivate` on the root path. Sub-route guards (e.g., `stepValidationGuard`, `unsavedChangesGuard`) are defined inside the remote.
3. **Remotes never import other remotes.** Nx boundary rules enforce this. Shared code goes in `libs/shared/*`.
4. **Remote-local services are scoped to the remote.** Use `providedIn: 'root'` inside the remote -- it creates a singleton within the remote's injector, not the shell's.
5. **Shared services must come from `libs/shared/*`.** Services shared between the shell and remotes (e.g., `WorkspaceContextService`, `AuthService`) are shared singletons via MF.
6. **All components are standalone.** No NgModules in remotes.

---

## Remote Dependency Rules

```
Shell (host)
  |
  |--- can import: libs/shared/*
  |--- cannot import: apps/* (any remote)
  |
Remote A
  |
  |--- can import: libs/shared/*
  |--- cannot import: apps/* (shell or any other remote)
  |
libs/shared/*
  |
  |--- can import: other libs/shared/*
  |--- cannot import: apps/* (shell or any remote)
```

Enforced by Nx `@nx/enforce-module-boundaries` lint rule. CI fails if violated.
