# Current-to-Target Route Migration Map

## Module Mapping

The current 25 lazy-loaded modules map to the target architecture as follows. Some modules merge, some split, and some remain as-is.

### Target: Auth Shell (`/auth`)

| Current Path | Current Module | Action |
|---|---|---|
| `/auth/*` (24+ components) | AuthModule | **Keep**, clean up duplicate/dead routes |

Notes: The auth module has 24+ components including 2FA flows, email change, and email verification. These are all pre-auth or auth-adjacent. Keep them together. Remove `/auth/signOut` as a routed page (sign-out is an action, not a page).

### Target: Join (`/join`) -- Standalone, AuthGuard Protected

| Current Path | Current Module | Action |
|---|---|---|
| `/join/confirm/:invitationToken` | JoinModule | **Keep as standalone** route with AuthGuard |
| `/join/fail` | JoinModule | **Keep as standalone** route with AuthGuard |

Notes: Join requires authentication but is not part of auth. The invite link contains a token with the role for the joining user. Flow: user clicks link, AuthGuard redirects to `/auth/login?returnUrl=/join/confirm/TOKEN` if not authenticated, after login the join route processes the token, assigns the role, adds user to workspace, then redirects to `/workspace/:id`. This must remain outside the auth module because auth routes are unauthenticated.

### Target: Workspace List (`/workspaces`)

| Current Path | Current Module | Action |
|---|---|---|
| `/workspace/list` | BotModule | **Rename** to `/workspaces` |
| `/workspace/create` | BotModule | **Move** to `/workspaces/create` |
| `/workspace/create/chooseTemplate` | BotModule | **Move** to `/workspaces/create/templates` |
| `/workspace/create/:TemplateId` | BotModule | **Move** to `/workspaces/create/:templateId` |
| `/workspace/install/:botId` | BotModule | **Move** to `/workspaces/:botId/install` |

Notes: "Workspace" is the domain language, not "bot." Keep it. Pluralize the list route.

### Target: Account Settings (`/account`)

| Current Path | Current Module | Action |
|---|---|---|
| `/accountsettings/account-info` | AccountSettingsModule | **Rename** to `/account/profile` |

Notes: Currently only one page. Expand with `/account/security`, `/account/notifications` as the architecture specifies.

### Target: Workspace Shell (`/workspace/:id`)

This is the big change. All feature modules that take `:id` (workspace ID) move under a unified workspace shell with a shared resolver.

| Current Path | Target Path | Current Module | Target Module |
|---|---|---|---|
| `/home/:id` | `/workspace/:id/home` | HomeModule | HomeModule |
| `/playground/chatbot-builder/:id` | `/workspace/:id/playground` | PlaygroundModule | PlaygroundModule |
| `/live-chat/:id/:userId` | `/workspace/:id/inbox/:userId` | InboxModule | InboxModule |
| `/inbox-activity/:id` | `/workspace/:id/inbox-activity` | InboxActivityModule | **Merge into InboxModule** |
| `/analytics-center/:id` | `/workspace/:id/analytics` | AnalyticsModule | AnalyticsModule |
| `/analytics-center/sessions/:id` | `/workspace/:id/analytics/sessions` | AnalyticsModule | AnalyticsModule |
| `/analytics-center/service-quality/:id` | `/workspace/:id/analytics/service-quality` | AnalyticsModule | AnalyticsModule |
| `/analytics-center/retention/:id` | `/workspace/:id/analytics/retention` | AnalyticsModule | AnalyticsModule |
| `/analytics-center/agent-monitor/:id` | `/workspace/:id/analytics/agent-monitor` | AnalyticsModule | AnalyticsModule |
| `/analytics-center/userBehavior/:id` | `/workspace/:id/analytics/user-behavior` | AnalyticsModule | AnalyticsModule |
| `/analytics-center/words/:id` | `/workspace/:id/analytics/words` | AnalyticsModule | AnalyticsModule |
| `/analytics-center/funnel-details/:id/:funnel_id` | `/workspace/:id/analytics/funnels/:funnelId` | AnalyticsModule | AnalyticsModule |
| `/analytics-center/quality-management/:id` | `/workspace/:id/analytics/quality-management` | AnalyticsModule | AnalyticsModule |
| `/analytics-center/survey/:id` | `/workspace/:id/analytics/survey` | AnalyticsModule | AnalyticsModule |
| `/analytics-center/sla/:id` | `/workspace/:id/analytics/sla` | AnalyticsModule | AnalyticsModule |
| `/ai-hub/:id/*` | `/workspace/:id/ai-hub/*` | QnAModule | AiHubModule (renamed) |
| `/campaign-manager/*` | `/workspace/:id/campaigns/*` | BroadcastModule | CampaignsModule (renamed) |
| `/commentAcquisition/*` | `/workspace/:id/comment-acquisition/*` | CommentAcquisitionModule | CommentAcquisitionModule |
| `/customer-center/:id` | `/workspace/:id/customers` | CrmModule | CustomersModule (renamed) |
| `/identity-manager/:id` | `/workspace/:id/identity` | IdentityManagerModule | IdentityModule |
| `/marketplace/:id/*` | `/workspace/:id/marketplace/*` | MarketplaceModule | MarketplaceModule |
| `/log-manager/:id` | `/workspace/:id/logs` | LogManagerModule | LogsModule (renamed) |
| `/text-to-speech/:id` | `/workspace/:id/text-to-speech` | TextToSpeechModule | TextToSpeechModule |
| `/setup/:id` | `/workspace/:id/setup` | SetupModule | SetupModule |
| `/workspace-settings/:id/*` | `/workspace/:id/settings/*` | BotSettingsModule | SettingsModule |

### Target: Workspace Settings (`/workspace/:id/settings`)

The current settings module is massive (26+ components). Map its children:

| Current Path | Target Path |
|---|---|
| `/workspace-settings/:id/info` | `/workspace/:id/settings/info` |
| `/workspace-settings/:id/webchat` | `/workspace/:id/settings/channels/webchat` |
| `/workspace-settings/:id/facebook` | `/workspace/:id/settings/channels/facebook` |
| `/workspace-settings/:id/instagram` | `/workspace/:id/settings/channels/instagram` |
| `/workspace-settings/:id/twitter` | `/workspace/:id/settings/channels/twitter` |
| `/workspace-settings/:id/whatsapp` | `/workspace/:id/settings/channels/whatsapp` |
| `/workspace-settings/:id/sms` | `/workspace/:id/settings/channels/sms` |
| `/workspace-settings/:id/email` | `/workspace/:id/settings/channels/email` |
| `/workspace-settings/:id/call` | `/workspace/:id/settings/channels/call` |
| `/workspace-settings/:id/ai-agent` | `/workspace/:id/settings/ai-agent` |
| `/workspace-settings/:id/team-manager` | `/workspace/:id/settings/team` |
| `/workspace-settings/:id/agent-settings/*` | `/workspace/:id/settings/agents/*` |
| `/workspace-settings/:id/inbox-tags` | `/workspace/:id/settings/inbox-tags` |
| `/workspace-settings/:id/segments/:type` | `/workspace/:id/settings/segments/:type` |
| `/workspace-settings/:id/integration` | `/workspace/:id/settings/integrations` |
| `/workspace-settings/:id/conversational-ai` | `/workspace/:id/settings/conversational-ai` |
| `/workspace-settings/:id/voice-models` | `/workspace/:id/settings/voice-models` |
| `/workspace-settings/:id/language-configuration` | `/workspace/:id/settings/language` |
| `/workspace-settings/:id/api` | `/workspace/:id/settings/api` |
| `/workspace-settings/:id/addons` | `/workspace/:id/settings/addons` |
| `/workspace-settings/:id/billing/*` | `/workspace/:id/settings/billing/*` |
| `/workspace-settings/:id/purchase-history` | `/workspace/:id/settings/billing/history` |
| `/workspace-settings/:id/transaction` | `/workspace/:id/settings/billing/transactions` |
| `/workspace-settings/:id/unstructured-Documents` | `/workspace/:id/settings/documents` |

### Target: Payment (moves under workspace shell)

*Updated based on review: Section header said "stays outside workspace shell" but all target paths are under `/workspace/:id`. Corrected header to match content.*

| Current Path | Target Path | Reason |
|---|---|---|
| `/payment/pricing/:id` | `/workspace/:id/billing/pricing` | Move under workspace |
| `/payment/checkout/:id/:plan` | `/workspace/:id/billing/checkout/:plan` | Move under workspace |
| `/payment/downgrade/:id/:plan` | `/workspace/:id/billing/downgrade/:plan` | Move under workspace |
| `/subscription-details/:id` | `/workspace/:id/billing/details` | Merge into billing |

### Target: Redirect/Callback Routes (App Shell Level)

| Current Path | Target Path | Notes |
|---|---|---|
| `/hulul_redirect/:lang` | **Remove** | Handle at infra/backend level, not in Angular |
| `/twcb_redirect` | `/callbacks/twitter` | OAuth callback, keep outside workspace |
| `/mhcb_redirect` | `/callbacks/moneyhash` | Payment callback, keep outside workspace |
| `/send-request` | `/workspace/:id/whatsapp-request` | Move under workspace context |

---

## Target Route Tree (Complete)

```
/auth
  /sign-in/:provider
  /sign-up
  /register
  /login
  /forgot-password
  /reset-password/:token
  /verify-email
  /confirm/:token
  /change-password
  /change-email
  /two-factor
  /diff-method
  /send2FA-email

/join                                         -- standalone, AuthGuard protected
  /confirm/:invitationToken                     processes token, assigns role, redirects to workspace
  /fail

/workspaces                                   -- workspace list or create-first
  /create
  /create/templates
  /create/:templateId
  /:workspaceId/install

/account
  /profile
  /security
  /notifications

/callbacks
  /twitter
  /moneyhash

/workspace/:id                                -- WorkspaceShellComponent
  │                                              WorkspaceContextResolver runs ONCE here
  │                                              SignalR connects here
  │                                              FeatureGuard on each child
  │
  /home                                       -- dashboard/overview
  /playground                                 -- chatbot builder
  /inbox                                      -- live chat
    /:userId
  /inbox-activity                             -- OR merge into /inbox as a tab
  /analytics
    /sessions
    /service-quality
    /retention
    /agent-monitor
    /user-behavior
    /words
    /funnels/:funnelId
    /quality-management
    /survey
    /sla
      /conversation-details
      /agent-performance
      /breach-analysis
      /time-distribution
      /performance-trends
  /ai-hub
    /list
    /list/edit
    /test
    /knowledge
    /knowledge/add-unit
    /knowledge/edit-unit/:unitId
    /ai-assistant
    /generative-ai
    /create/step/:step
    /skills/:skillId
    /:tab/locked
  /campaigns
    /list
    /channelSelect
    /create/:broadcastId
    /create/:broadcastId/step/:step
    /create-whatsapp/:broadcastId/step/:step
    /create-sms/:broadcastId/step/:step
    /create-email/:broadcastId/step/:step
    /edit/:broadcastId
    /insights/:broadcastId/:broadcastLogId
  /comment-acquisition
    /list
    /create/:channel/:commentId
    /create/:channel/:commentId/step/:step
    /edit/:commentId
  /customers
  /identity
  /marketplace
    /:categoryId
    /:categoryId/:appId
    /:categoryId/:appId/install
  /logs
  /text-to-speech
  /setup
  /settings
    /info
    /channels/webchat
    /channels/facebook
    /channels/instagram
    /channels/twitter
    /channels/whatsapp
    /channels/sms
    /channels/email
    /channels/call
    /ai-agent
    /ai-agent/setup
    /ai-agent/edit/:channelId
    /team
    /agents/working-shifts
    /agents/sla-permissions
    /agents/teams
    /agents/other-settings
    /inbox-tags
    /segments/:type
    /integrations
    /conversational-ai
    /voice-models
    /language
    /api
    /addons
    /documents
  /billing
    /plan
    /wallet
    /transactions
    /company-details
    /history
    /pricing
    /checkout/:plan
    /downgrade/:plan
    /details
```

---

## Guard Migration Map

| Current Guard | Status | Target |
|---|---|---|
| AuthGuard | Working (with bugs) | **Keep**, fix Cognito blank page + remove IDM check |
| UnsupportedFeaturesGuard | Working (fails open) | **Replace** with FeatureGuard. Fix fail-open on null botId. |
| UnsavedChangesGuard | Working | **Keep** as-is, convert to functional guard |
| SendEmail2FAGuard | Working | **Keep** within auth module |
| BroadcastCreationActivateGuard | Working | **Keep** within campaigns module, convert to functional |
| BroadcastCreationDeactivateGuard | Working | **Keep** within campaigns module, convert to functional |
| CommentAcquisitionCreationActivateGuard | Working | **Keep** within comment-acquisition module, convert to functional |
| CommentAcquisitionCreationDeactivateGuard | Working | **Keep** within comment-acquisition module, convert to functional |
| CannotLeaveGuard | Working | **Keep** within workspace module, convert to functional |
| AdminGuard | Stub | **Delete** |
| NoAuthGuard | Stub | **Delete** |
| AuthGuardService | Legacy duplicate | **Delete** |
| RoleGuardService | Broken | **Delete** |

New guards to create:

| Guard | Purpose |
|---|---|
| WorkspaceMemberGuard | Verify user belongs to this workspace (on `/workspace/:id`) |
| WorkspaceLandingGuard | Redirect to role-appropriate module (on `/workspace/:id` empty path) |
| FeatureGuard | Replace UnsupportedFeaturesGuard with brand + subscription check. Use `CanActivateFn` (functional guard, Angular 15.2+) or route `data` + class guard for Angular 14/15 compatibility. |

*Updated based on review: Doc 01 uses `FeatureGuard('analytics')` syntax which is not valid in Angular 14/15 class-based guards. For Angular 14/15, use route data pattern: `{ canActivate: [FeatureGuard], data: { feature: 'analytics' } }`. Convert to functional `CanActivateFn` factory pattern during Angular 16 upgrade (Phase 3).*

---

## Resolver Migration Map

| Current Resolver | Status | Target |
|---|---|---|
| SubscriptionResolverService | Runs 19 times redundantly | **Replace** with WorkspaceContextResolver at `/workspace/:id` level. Resolves workspace details + user role + subscription ONCE. Cached until workspace changes. |
| CategoryResolver | Marketplace-specific | **Keep** within marketplace module |
| AppResolver | Marketplace-specific, has bugs | **Fix** null check, keep within marketplace module |

*Updated based on review: The WorkspaceContextResolver must include error handling for API failures and timeouts. Without it, a failed resolve silently blocks navigation, leaving the user stuck. Add a 5-second timeout and redirect to `/workspaces` with an error notification on failure. The resolve key in the route config should be `workspaceContext` (not `botContext` as shown in Doc 01 §1.3) to match the target naming convention.*

Resolver → Service → Consumer relationship (clarification):
```
WorkspaceContextResolver     (fetches data, writes to service)
  └─► WorkspaceContextService  (BehaviorSubject store, singleton)
        └─► Guards read from service (WorkspaceLandingGuard, FeatureGuard, WorkspaceMemberGuard)
        └─► Components read from service (WorkspaceShellComponent, sidenav)
        └─► WorkspaceInterceptor reads from service (x-workspace header)
```

---

## Feature Flags: From 130 Enum Values to Structured System

The current `UnsupportedFeatures` enum has 130+ values. These need to be categorized:

| Category | Examples | Where They Live |
|---|---|---|
| Brand-level features | `Marketplace`, `Broadcast`, `Analytics` | BrandConfig.features |
| Subscription-tier features | `playground`, `Inbox`, `Botsettings` | Subscription plan from WorkspaceContextResolver |
| Channel availability | `HideSms`, `HideEmail`, `HideCallChannel` | Workspace config or subscription |
| Sub-feature toggles | `QualityManagementAnalytics`, `Survey`, `SlaAnalytics` | Subscription or add-on flags |
| UI visibility toggles | `TransactionsTab`, `HideTextToSpeech` | Subscription or brand config |

The FeatureGuard should accept a feature key and check the appropriate source based on category.

*Updated based on review: Create a `FeatureFlagService` with a simple `isEnabled(flag: string): boolean` API that hides the brand-vs-subscription distinction from all consumers (guards, components, sidenav). This service reads from `BrandConfigService` for brand-level flags and `WorkspaceContextService` for subscription-level flags. Start with a flat structure — do NOT block migration on building a nested taxonomy. Categorize incrementally as modules are migrated.*

---

## Interceptor Migration

| Current | Status | Target |
|---|---|---|
| ServicesInterceptor | Active, sets `x-user-domain` and `x-workspace` headers | **Split** into BrandInterceptor (x-user-domain) + WorkspaceInterceptor (x-workspace) + AuthInterceptor (Bearer token) + ErrorInterceptor (401/403/5xx) |
| Auth interceptor stub | Empty | **Delete**, functionality goes into AuthInterceptor |

Target interceptor chain order (registration order matters):
1. **BrandInterceptor** — attaches `x-user-domain` (must be first, needed for brand config fetch itself)
2. **AuthInterceptor** — attaches Bearer token, handles 401 → logout
3. **WorkspaceInterceptor** — attaches `x-workspace` header (reads from WorkspaceContextService, not sessionStorage)
4. **ErrorInterceptor** — handles 401/403/5xx globally, surfaces errors to user
5. **(optional) RetryInterceptor** — retries on transient failures (5xx, network errors)

*Updated based on review: Added ErrorInterceptor and RetryInterceptor to the chain (referenced in Doc 03 but missing here). Specified explicit registration order — this is critical because Angular executes interceptors in registration order and a developer adding a new interceptor can easily break the chain. Add a unit test that verifies interceptor order.*

Critical fix needed: the viewer role write-block in `ServicesInterceptor.checkEditsRequest()` returns `EMPTY` but the result is never used. This means viewer-role users can currently make write API calls. This is a security bug independent of the migration.

---

## URL Redirect Strategy

Changing URLs breaks bookmarks and external links. Two options:

**Option A: Redirects at routing level**
Add redirect routes for every old URL pattern that maps to a new one. Example:
```
{ path: 'live-chat/:id/:userId', redirectTo: 'workspace/:id/inbox/:userId' }
```
Pro: Works immediately. Con: Bloats the route file. Hard to maintain.

**Option B: Redirect middleware at infra level**
An Nginx rewrite map or Cloudflare rule handles old-to-new URL mapping.
Pro: No Angular code needed. Con: Requires infra changes.

**Recommendation:** Use Option A during migration (easy, reversible), remove redirects after 6 months, add Option B as a permanent fallback for any straggling links.

---

## Missing Mappings (Added Based on Review)

*Updated based on review: The following items were missing from the original migration map.*

### Wildcard and Default Routes

| Current | Target | Notes |
|---|---|---|
| `{ path: '', redirectTo: 'bots' }` | `{ path: '', redirectTo: 'workspaces' }` | Align with `/workspaces` rename |
| `{ path: '**', redirectTo: 'bots' }` | `{ path: '**', redirectTo: 'workspaces' }` | Wildcard must also update |

### Error and Not-Found Routes

| Route | Purpose |
|---|---|
| `/error` | Global error page (brand config failure, unrecoverable errors) |
| `/workspace/:id/not-found` | Workspace-scoped 404 for invalid feature routes |

These are not present in any current doc but are needed for the error handling strategy (see review report §2.2).

### Route Constants File

All route segments should be defined as constants in `route-paths.ts` (referenced in Doc 12 §1.6 but not mapped here):

```typescript
export const ROUTES = {
  AUTH: 'auth',
  WORKSPACES: 'workspaces',
  ACCOUNT: 'account',
  WORKSPACE: 'workspace',
  // Feature modules
  HOME: 'home',
  PLAYGROUND: 'playground',
  INBOX: 'inbox',
  ANALYTICS: 'analytics',
  AI_HUB: 'ai-hub',
  CAMPAIGNS: 'campaigns',
  SETTINGS: 'settings',
  BILLING: 'billing',
  // ...
} as const;
```

---

## Changelog

| Change | Reason |
|---|---|
| Fixed "Payment (stays outside workspace shell)" header — all target paths are under `/workspace/:id` | Contradicted its own content |
| Added FeatureGuard Angular 14/15 compatibility note | `FeatureGuard('analytics')` syntax invalid in class-based guards |
| Added full interceptor chain order (5 interceptors) | Doc 03 references ErrorInterceptor and RetryInterceptor but they were missing from the migration map |
| Added resolver error handling guidance | Resolver failure silently blocks navigation with no recovery path |
| Clarified Resolver → Service → Consumer relationship | Three overlapping names (WorkspaceContextResolver, WorkspaceContextService, WorkspaceContextState) were confusing |
| Added FeatureFlagService recommendation | Guards and components need a unified API, not direct access to two different flag sources |
| Added wildcard/default route updates | `/bots` → `/workspaces` rename requires updating redirects |
| Added error/not-found route mappings | No error routes existed in the target tree |
| Added route constants file mapping | Referenced in Doc 12 but never mapped |
