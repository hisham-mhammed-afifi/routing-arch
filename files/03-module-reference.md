# Module Reference

17 feature modules, all lazy-loaded under `/workspace/:id`. Each module has its own routing module, components, services, and state. No module imports another module.

### Quick-Reference Table

| Module | Route | Feature Key | Bundle | Team | Real-time |
|--------|-------|-------------|--------|------|-----------|
| Home | `/home` | _(none)_ | S | Platform | Light (notifications) |
| Playground | `/playground` | `playground` | M | AI | No |
| Inbox | `/inbox` | `inbox` | L | Engagement | **Yes** (SignalR) |
| Inbox Activity | `/inbox-activity` | `inboxActivity` | M | Engagement | No |
| Analytics | `/analytics` | `analytics` | XL | Growth | No |
| AI Hub | `/ai-hub` | `aiHub` | L | AI | No |
| Campaigns | `/campaigns` | `campaigns` | L | Engagement | No |
| Comment Acquisition | `/comment-acquisition` | `commentAcquisition` | M | Engagement | No |
| Customers | `/customers` | `customers` | S | Engagement | No |
| Identity | `/identity` | `identity` | S | Growth | No |
| Marketplace | `/marketplace` | `marketplace` | M | Growth | No |
| Logs | `/logs` | `logs` | S | Platform | No |
| Text-to-Speech | `/text-to-speech` | `textToSpeech` | S | AI | No |
| Setup | `/setup` | `setup` | S | Platform | No |
| Payment | `/payment` | `payment` | M | Platform | No |
| Subscription Details | `/subscription-details` | `subscriptionDetails` | S | Platform | No |
| Settings | `/settings` | `settings` | XL | Platform | No |

> All routes are relative to `/workspace/:id`. Bundle size categories: **S** < 50 KB, **M** 50-150 KB, **L** 150-300 KB, **XL** 300 KB+.

---

## Home

Dashboard and overview. Default landing for admin and owner roles.

| | |
|---|---|
| Route | `/workspace/:id/home` |
| Feature key | None (always accessible) |
| Components | HomeComponent, RedirectToLatestWorkspaceComponent |
| Dependencies | WorkspaceContextService |
| Notes | Both a real feature (dashboard with metrics) and the landing page. No feature guard since every role should reach it as a fallback. |

---

## Playground

Chatbot builder. Complex visual editor.

| | |
|---|---|
| Route | `/workspace/:id/playground` |
| Feature key | `playground` |
| Components | BotBuilderComponent |
| Dependencies | WorkspaceContextService, BotBuilderApiService |
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
| Dependencies | WorkspaceContextService, SignalRService, NotificationService |
| Notes | Default landing for agent role. The `:userId` param selects a conversation. |

---

## Inbox Activity

Activity log for inbox events. Separate from inbox.

| | |
|---|---|
| Route | `/workspace/:id/inbox-activity` |
| Feature key | `inboxActivity` |
| Components | InboxActivityComponent |
| Dependencies | WorkspaceContextService |

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
| Dependencies | WorkspaceContextService, AnalyticsApiService |
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
| Dependencies | WorkspaceContextService, AiHubApiService |
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
| Dependencies | WorkspaceContextService, CampaignApiService |
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
| Dependencies | WorkspaceContextService |
| Components | ~5 components |

---

## Customers

Customer/contact center. CRM functionality.

| | |
|---|---|
| Route | `/workspace/:id/customers` |
| Feature key | `customers` |
| Components | CustomerCenterComponent |
| Dependencies | WorkspaceContextService, CustomerApiService |

---

## Identity

Identity and user management.

| | |
|---|---|
| Route | `/workspace/:id/identity` |
| Feature key | `identity` |
| Components | IdentityManagerComponent |
| Dependencies | WorkspaceContextService, AuthService |

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
| Dependencies | WorkspaceContextService, MarketplaceApiService |
| Notes | Has its own resolvers for category and app data. These are module-scoped, not shared. |

---

## Logs

Log viewer.

| | |
|---|---|
| Route | `/workspace/:id/logs` |
| Feature key | `logs` |
| Components | LogManagerComponent |
| Dependencies | WorkspaceContextService |

---

## Text-to-Speech

Text-to-speech configuration.

| | |
|---|---|
| Route | `/workspace/:id/text-to-speech` |
| Feature key | `textToSpeech` |
| CanDeactivate | UnsavedChangesGuard |
| Components | TextToSpeechComponent |
| Dependencies | WorkspaceContextService, MediaApiService |

---

## Setup

Initial workspace configuration wizard.

| | |
|---|---|
| Route | `/workspace/:id/setup` |
| Feature key | `setup` |
| Components | SetupComponent |
| Dependencies | WorkspaceContextService, OnboardingService |

---

## Payment

Plan selection and checkout. Workspace-scoped.

| | |
|---|---|
| Route | `/workspace/:id/payment` |
| Feature key | `payment` |
| Sub-routes | `/pricing`, `/checkout/:plan`, `/downgrade/:plan` |
| Components | PaymentPlansComponent, PlanUpgradeComponent, DowngradePlanComponent |
| Dependencies | WorkspaceContextService, PaymentApiService, BillingService |

---

## Subscription Details

Current subscription information for the workspace.

| | |
|---|---|
| Route | `/workspace/:id/subscription-details` |
| Feature key | `subscriptionDetails` |
| Components | SubscriptionDetailsComponent |
| Dependencies | WorkspaceContextService, BillingService |

---

## Settings

Workspace settings. Largest module. Uses a secondary sidenav via `SettingsShellComponent`.

| | |
|---|---|
| Route | `/workspace/:id/settings` |
| Feature key | `settings` |
| Layout | SettingsShellComponent provides a sub-sidenav. Settings sections render in its router-outlet. |
| Dependencies | WorkspaceContextService, BrandConfigService, BillingService |
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

---

## Module Contract Template

Every new feature module **must** follow this directory structure:

```
module-name/
  module-name.module.ts          # NgModule with imports, declarations, providers
  module-name-routing.module.ts  # Child routes only
  module-name.component.ts       # Root component (rendered by router-outlet)
  services/
    module-name.service.ts       # API calls
    module-name-state.service.ts # BehaviorSubject state (module-scoped)
  components/                    # Internal components (not exported)
  models/                        # Module-specific interfaces
```

### Rules

1. **Never import another feature module.** Feature modules are isolated by design.
2. **Never export components.** No cross-module component sharing. If a component is needed by more than one module, move it to `SharedModule`.
3. **Shared UI goes in `SharedModule`.** Pipes, directives, and presentational components that appear in multiple modules belong there.
4. **Module-scoped state is destroyed on navigation away.** Services provided in the module's `providers` array are created when the module loads and garbage-collected when the user navigates out. Do not store long-lived state here; use a `CoreModule` service instead.
5. **All API services inject `WorkspaceContextService` for the workspace ID.** Never read the workspace ID from the route directly inside a service -- use the centralized context.
6. **Use the module's routing file for child routes.** Never define child routes in the parent `AppRoutingModule` or any other module's routing file.

---

## Module Dependency Rules

```
CoreModule (services, guards, interceptors)
    ^
    |--- Feature modules can import CoreModule services (via DI)
    |--- Feature modules can import SharedModule (via NgModule imports)
    |
SharedModule (components, pipes, directives)
    ^
    |--- Feature modules can import SharedModule
    |
Feature Module A  <--X-->  Feature Module B   (NEVER)
```

### Allowed

| From | To | How |
|------|----|-----|
| Feature module | CoreModule services | Dependency injection (`@Injectable({ providedIn: 'root' })`) |
| Feature module | SharedModule | `imports: [SharedModule]` in the feature NgModule |
| Feature module | Router (navigate to another feature) | `Router.navigate()` -- no direct import of the target module |

### Forbidden

| From | To | Why |
|------|----|-----|
| Feature module | Another feature module | Creates coupling, breaks lazy-load boundaries, causes circular dependencies |
| Feature module | Another feature module's components | Use SharedModule instead |
| Feature module | Another feature module's services | Promote the service to CoreModule if truly shared |

### Cross-Module Communication Patterns

- **Shared data:** Move the service to `CoreModule` (singleton, root-provided). Both modules inject the same instance.
- **Navigation-based:** Use `Router.navigate()` with route params or query params to pass context.
- **Event-based:** Use a `CoreModule` event bus service (RxJS `Subject`) when two modules need to react to the same domain event without direct coupling.
- **Shared UI:** Move the component/pipe/directive to `SharedModule` and import it in both feature modules.
