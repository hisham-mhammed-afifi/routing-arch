# Route Architecture

## Route Tree

```
/auth                                         AuthLayoutComponent (no chrome)
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
  /confirm-emailChannel/:token

/join                                         AuthLayoutComponent (no chrome)
  /confirm/:invitationToken                   [AuthGuard] processes token, assigns role, redirects to workspace
  /fail                                       [AuthGuard]

/workspaces                                   AppLayoutComponent (topbar, no sidenav)
  (empty)                                     [AuthGuard] workspace list or "create first workspace"
  /create
  /create/templates
  /create/:templateId
  /:workspaceId/install                       [AuthGuard, CanDeactivate]

/account                                      AccountLayoutComponent (topbar, account sidenav)
  /profile                                    [AuthGuard]
  /security
  /notifications

/callbacks                                    No layout (process and redirect)
  /twitter
  /moneyhash

/workspace/:id                                WorkspaceShellComponent (topbar with workspace selector, workspace sidenav)
  (empty)                                     [WorkspaceLandingGuard] redirects by role, never renders
  /home                                       HomeModule
  /playground                                 PlaygroundModule
  /inbox                                      InboxModule
    /:userId
  /inbox-activity                             InboxActivityModule
  /analytics                                  AnalyticsModule
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
  /ai-hub                                     AiHubModule
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
  /campaigns                                  CampaignsModule
    /list
    /channelSelect
    /create/:broadcastId
    /create/:broadcastId/step/:step
    /create-whatsapp/:broadcastId/step/:step
    /create-sms/:broadcastId/step/:step
    /create-email/:broadcastId/step/:step
    /edit/:broadcastId
    /insights/:broadcastId/:broadcastLogId
  /comment-acquisition                        CommentAcquisitionModule
    /list
    /create/:channel/:commentId
    /create/:channel/:commentId/step/:step
    /edit/:commentId
  /customers                                  CustomersModule
  /identity                                   IdentityModule
  /marketplace                                MarketplaceModule
    /:categoryId
    /:categoryId/:appId
    /:categoryId/:appId/install
  /logs                                       LogsModule
  /text-to-speech                             TextToSpeechModule
  /setup                                      SetupModule
  /payment                                    PaymentModule
    /pricing
    /checkout/:plan
    /downgrade/:plan
  /subscription-details                       SubscriptionDetailsModule
  /settings                                   SettingsModule (sub-sidenav)
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
    /purchase-history
    /transaction
```

---

## Layout Shells

Five layout shells, nested as follows:

```
AppComponent
  <router-outlet>
    |
    +-- AuthLayoutComponent             /auth/*, /join/*
    |     No topbar, no sidenav
    |     Branded background and logo from BrandConfig
    |
    +-- AppLayoutComponent              /workspaces
    |     Topbar with user avatar menu
    |     No sidenav
    |
    +-- AccountLayoutComponent          /account/*
    |     Topbar with user avatar menu
    |     Account sidenav (profile, security, notifications)
    |
    +-- WorkspaceShellComponent         /workspace/:id/*
          Topbar with workspace selector + user avatar
          Workspace sidenav (feature modules, built dynamically from feature flags)
          |
          +-- SettingsShellComponent    /workspace/:id/settings/*
                Adds a secondary sub-sidenav for settings sections
```

Each shell has its own `<router-outlet>`. Feature modules render inside the workspace shell's outlet. Settings sections render inside the settings shell's outlet.

The workspace sidenav only shows modules the user can access. It reads from `WorkspaceContextService` (which holds the resolved feature flags and subscription tier) and builds nav items dynamically. If a module is hidden from the sidenav, its `FeatureGuard` will also reject direct URL access.

---

## Guard Chain

Every navigation through the workspace area passes through guards in this order:

```
Step 1: AuthGuard                        on /workspace/:id
  Token valid?
    No  --> /auth/login?returnUrl=...
    Yes --> continue

Step 2: WorkspaceMemberGuard             on /workspace/:id
  User belongs to this workspace?
    No  --> /workspaces
    Yes --> continue

Step 3: WorkspaceContextResolver         on /workspace/:id
  Fetch workspace details + user role + subscription + feature flags
  Store in WorkspaceContextService
  (runs once per workspace, not per child navigation)

Step 4: WorkspaceLandingGuard            on /workspace/:id (empty path only)
  Read role from WorkspaceContextService
  Redirect:
    agent   --> /workspace/:id/inbox
    analyst --> /workspace/:id/analytics
    admin   --> /workspace/:id/home
    owner   --> /workspace/:id/home
  (no module chunk downloaded until after redirect)

Step 5: FeatureGuard                     on each child module
  Brand allows this feature?
    No  --> /workspace/:id/home
  Subscription includes this feature?
    No  --> /workspace/:id/home
  Yes --> lazy load module
```

### Guard inventory

| Guard | Type | Scope | Purpose |
|-------|------|-------|---------|
| AuthGuard | CanActivate | /workspaces, /workspace/:id, /account, /join, /callbacks | Redirects to login if not authenticated. Preserves returnUrl. |
| WorkspaceMemberGuard | CanActivate | /workspace/:id | Verifies user is a member of the workspace. Redirects to /workspaces if not. |
| WorkspaceLandingGuard | CanActivate | /workspace/:id (empty path) | Role-based redirect. Never renders a component. |
| FeatureGuard | CanActivate | Each feature module under /workspace/:id | Checks brand + subscription flags. Single access-control mechanism. |
| UnsavedChangesGuard | CanDeactivate | Text-to-speech, AI hub knowledge, AI assistant, generative AI, campaign creation, comment acquisition creation | Confirms before leaving unsaved work. |
| SendEmail2FAGuard | CanActivate | /auth/send2FA-email | Checks 2FA config flag. |
| StepValidationGuard | CanActivate | Campaign and comment acquisition step routes | Validates step parameter is within range. |

### Guard configuration in routes

```typescript
// app-routing.module.ts
const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule),
  },
  {
    path: 'join',
    canActivate: [AuthGuard],
    loadChildren: () => import('./join/join.module').then(m => m.JoinModule),
  },
  {
    path: 'workspaces',
    canActivate: [AuthGuard],
    loadChildren: () => import('./workspaces/workspaces.module').then(m => m.WorkspacesModule),
  },
  {
    path: 'account',
    canActivate: [AuthGuard],
    loadChildren: () => import('./account/account.module').then(m => m.AccountModule),
  },
  {
    path: 'callbacks',
    loadChildren: () => import('./callbacks/callbacks.module').then(m => m.CallbacksModule),
  },
  {
    path: 'workspace/:id',
    canActivate: [AuthGuard, WorkspaceMemberGuard],
    resolve: { ctx: WorkspaceContextResolver },
    loadChildren: () => import('./workspace-shell/workspace-shell.module').then(m => m.WorkspaceShellModule),
  },
  { path: '', redirectTo: 'workspaces', pathMatch: 'full' },
  { path: '**', redirectTo: 'workspaces' },
];
```

```typescript
// workspace-shell/workspace-shell-routing.module.ts
const routes: Routes = [
  {
    path: '',
    component: WorkspaceShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [WorkspaceLandingGuard],
        component: EmptyComponent,
      },
      {
        path: 'home',
        loadChildren: () => import('../modules/home/home.module').then(m => m.HomeModule),
      },
      {
        path: 'playground',
        canActivate: [FeatureGuard],
        data: { feature: 'playground' },
        loadChildren: () => import('../modules/playground/playground.module').then(m => m.PlaygroundModule),
      },
      {
        path: 'inbox',
        canActivate: [FeatureGuard],
        data: { feature: 'inbox' },
        loadChildren: () => import('../modules/inbox/inbox.module').then(m => m.InboxModule),
      },
      {
        path: 'inbox-activity',
        canActivate: [FeatureGuard],
        data: { feature: 'inboxActivity' },
        loadChildren: () => import('../modules/inbox-activity/inbox-activity.module').then(m => m.InboxActivityModule),
      },
      {
        path: 'analytics',
        canActivate: [FeatureGuard],
        data: { feature: 'analytics' },
        loadChildren: () => import('../modules/analytics/analytics.module').then(m => m.AnalyticsModule),
      },
      {
        path: 'ai-hub',
        canActivate: [FeatureGuard],
        data: { feature: 'aiHub' },
        loadChildren: () => import('../modules/ai-hub/ai-hub.module').then(m => m.AiHubModule),
      },
      {
        path: 'campaigns',
        canActivate: [FeatureGuard],
        data: { feature: 'campaigns' },
        loadChildren: () => import('../modules/campaigns/campaigns.module').then(m => m.CampaignsModule),
      },
      {
        path: 'comment-acquisition',
        canActivate: [FeatureGuard],
        data: { feature: 'commentAcquisition' },
        loadChildren: () => import('../modules/comment-acquisition/comment-acquisition.module').then(m => m.CommentAcquisitionModule),
      },
      {
        path: 'customers',
        canActivate: [FeatureGuard],
        data: { feature: 'customers' },
        loadChildren: () => import('../modules/customers/customers.module').then(m => m.CustomersModule),
      },
      {
        path: 'identity',
        canActivate: [FeatureGuard],
        data: { feature: 'identity' },
        loadChildren: () => import('../modules/identity/identity.module').then(m => m.IdentityModule),
      },
      {
        path: 'marketplace',
        canActivate: [FeatureGuard],
        data: { feature: 'marketplace' },
        loadChildren: () => import('../modules/marketplace/marketplace.module').then(m => m.MarketplaceModule),
      },
      {
        path: 'logs',
        canActivate: [FeatureGuard],
        data: { feature: 'logs' },
        loadChildren: () => import('../modules/logs/logs.module').then(m => m.LogsModule),
      },
      {
        path: 'text-to-speech',
        canActivate: [FeatureGuard],
        data: { feature: 'textToSpeech' },
        loadChildren: () => import('../modules/text-to-speech/text-to-speech.module').then(m => m.TextToSpeechModule),
      },
      {
        path: 'setup',
        canActivate: [FeatureGuard],
        data: { feature: 'setup' },
        loadChildren: () => import('../modules/setup/setup.module').then(m => m.SetupModule),
      },
      {
        path: 'payment',
        canActivate: [FeatureGuard],
        data: { feature: 'payment' },
        loadChildren: () => import('../modules/payment/payment.module').then(m => m.PaymentModule),
      },
      {
        path: 'subscription-details',
        canActivate: [FeatureGuard],
        data: { feature: 'subscriptionDetails' },
        loadChildren: () => import('../modules/subscription-details/subscription-details.module').then(m => m.SubscriptionDetailsModule),
      },
      {
        path: 'settings',
        canActivate: [FeatureGuard],
        data: { feature: 'settings' },
        loadChildren: () => import('../modules/settings/settings.module').then(m => m.SettingsModule),
      },
    ],
  },
];
```

---

## Workspace Context

The central problem in the current codebase is that workspace context (workspace details, user role, subscription, feature flags) is fetched independently by every module. The new architecture resolves it once.

### WorkspaceContextResolver

Runs on `/workspace/:id`. Fetches everything the workspace shell and its children need:

```typescript
@Injectable({ providedIn: 'root' })
export class WorkspaceContextResolver implements Resolve<WorkspaceContext> {
  constructor(
    private workspaceApi: WorkspaceApiService,
    private ctx: WorkspaceContextService,
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<WorkspaceContext> {
    const id = route.paramMap.get('id');

    // skip refetch if same workspace
    if (this.ctx.currentId === id && this.ctx.isLoaded) {
      return of(this.ctx.snapshot());
    }

    return this.workspaceApi.getContext(id).pipe(
      tap(context => this.ctx.set(context)),
      catchError(() => {
        // workspace not found or API error: redirect to list
        this.ctx.clear();
        return EMPTY;
      }),
    );
  }
}
```

### WorkspaceContextService

Singleton service that holds the resolved workspace state. Every module reads from this instead of fetching its own data.

```typescript
@Injectable({ providedIn: 'root' })
export class WorkspaceContextService {
  private _context$ = new BehaviorSubject<WorkspaceContext | null>(null);
  readonly context$ = this._context$.asObservable();

  get currentId(): string | null { return this._context$.value?.workspace.id ?? null; }
  get isLoaded(): boolean { return this._context$.value !== null; }
  get role(): string | null { return this._context$.value?.membership.role ?? null; }

  snapshot(): WorkspaceContext { return this._context$.value!; }

  set(ctx: WorkspaceContext): void { this._context$.next(ctx); }
  clear(): void { this._context$.next(null); }

  hasFeature(key: string): boolean {
    const ctx = this._context$.value;
    if (!ctx) return false;
    return ctx.brandFeatures[key] !== false && ctx.subscriptionFeatures[key] !== false;
  }
}

interface WorkspaceContext {
  workspace: { id: string; name: string; /* ... */ };
  membership: { role: string; permissions: string[]; };
  subscription: { plan: string; tier: string; /* ... */ };
  brandFeatures: Record<string, boolean>;
  subscriptionFeatures: Record<string, boolean>;
}
```

### How children consume it

Feature modules never fetch workspace context. They inject `WorkspaceContextService` and read what they need:

```typescript
// inside any feature module component
constructor(private ctx: WorkspaceContextService) {}

ngOnInit() {
  const workspace = this.ctx.snapshot().workspace;
  const role = this.ctx.role;
  // use directly, no API call needed
}
```

---

## Role-Based Landing

`WorkspaceLandingGuard` runs only on the empty path of `/workspace/:id`. It reads the user's role from `WorkspaceContextService` (already populated by the resolver) and redirects.

```typescript
export class WorkspaceLandingGuard implements CanActivate {
  constructor(
    private ctx: WorkspaceContextService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): UrlTree {
    const id = route.parent?.paramMap.get('id');
    const role = this.ctx.role;

    const landingMap: Record<string, string> = {
      agent: 'inbox',
      analyst: 'analytics',
      admin: 'home',
      owner: 'home',
    };

    const target = landingMap[role] ?? 'home';
    return this.router.createUrlTree(['/workspace', id, target]);
  }
}
```

The mapping is a plain object. Adding a new role or changing the default landing is a one-line change.

---

## FeatureGuard

The single access-control mechanism for feature modules. Replaces the current `UnsupportedFeaturesGuard`.

```typescript
export class FeatureGuard implements CanActivate {
  constructor(
    private ctx: WorkspaceContextService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const feature = route.data['feature'] as string;
    const id = route.parent?.paramMap.get('id') ?? route.paramMap.get('id');

    if (!feature) return true; // no feature gate specified

    if (this.ctx.hasFeature(feature)) return true;

    return this.router.createUrlTree(['/workspace', id, 'home']);
  }
}
```

Key behaviors:
- Reads from `WorkspaceContextService`, never makes its own API calls
- Checks both brand-level and subscription-level flags via `hasFeature()`
- Never fails open. If context is not loaded, `hasFeature()` returns false
- Redirects to home, not to an error page (the user just can't access that feature)

---

## SignalR Lifecycle

The SignalR connection is tied to `WorkspaceShellComponent`. One workspace = one connection. No connection exists outside a workspace.

```
User navigates to /workspace/ABC
  --> WorkspaceContextResolver fetches context
  --> WorkspaceShellComponent.ngOnInit()
  --> SignalRService.connect('ABC', token)
  --> Connection established, scoped to Workspace ABC

User navigates to /workspace/ABC/inbox, then /workspace/ABC/analytics
  --> Connection stays open (same workspace shell, only child changes)

User switches to /workspace/XYZ
  --> WorkspaceShellComponent.ngOnDestroy()
  --> SignalRService.disconnect()
  --> New WorkspaceShellComponent.ngOnInit()
  --> SignalRService.connect('XYZ', token)

User navigates to /workspaces or /account
  --> WorkspaceShellComponent.ngOnDestroy()
  --> SignalRService.disconnect()
  --> No active connection
```

The connection uses `botId` as a query parameter and the auth token via `accessTokenFactory`. Brand context is derived server-side from the token.

Reconnection policy: auto-reconnect with exponential backoff. On reconnect, re-fetch any volatile state (unread counts, inbox messages). Expose a `connectionState$` observable so components can show reconnection indicators.

---

## Folder Structure

```
src/app/
  core/
    services/
      auth.service.ts
      brand-config.service.ts
      workspace-context.service.ts
      signalr.service.ts
      notification.service.ts
    interceptors/
      brand.interceptor.ts
      auth.interceptor.ts
      error.interceptor.ts
    guards/
      auth.guard.ts
      workspace-member.guard.ts
      workspace-landing.guard.ts
      feature.guard.ts
      unsaved-changes.guard.ts
    resolvers/
      workspace-context.resolver.ts
    models/
      workspace-context.model.ts
      brand-config.model.ts
      user.model.ts
    core.module.ts

  shared/
    components/
    directives/
    pipes/
    shared.module.ts

  layouts/
    auth-layout/
    app-layout/
    account-layout/
    workspace-shell/
    settings-shell/

  modules/
    home/
    playground/
    inbox/
    inbox-activity/
    analytics/
    ai-hub/
    campaigns/
    comment-acquisition/
    customers/
    identity/
    marketplace/
    logs/
    text-to-speech/
    setup/
    payment/
    subscription-details/
    settings/
      sections/
        info/
        channels/
        ai-agent/
        team/
        agents/
        inbox-tags/
        segments/
        integrations/
        conversational-ai/
        voice-models/
        language/
        api/
        addons/
        documents/
        billing/
        purchase-history/
        transaction/

  auth/
  join/
  workspaces/
  account/
  callbacks/
```

Each feature module under `modules/` contains its own components, services, state, and routing module. Feature modules never import each other. Cross-module communication goes through `CoreModule` services or router navigation.

---

## Adding a New Feature Module

Step-by-step walkthrough for adding a brand-new feature module (using "surveys" as an example).

### Step 1: Create the module folder

```
src/app/modules/surveys/
  surveys.module.ts
  surveys-routing.module.ts
  surveys.component.ts
  components/
  services/
  models/
```

### Step 2: Scaffold the module and routing

```typescript
// surveys.module.ts
@NgModule({
  declarations: [SurveysComponent],
  imports: [CommonModule, SharedModule, SurveysRoutingModule],
})
export class SurveysModule {}
```

```typescript
// surveys-routing.module.ts
const routes: Routes = [
  { path: '', component: SurveysComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SurveysRoutingModule {}
```

### Step 3: Add a feature flag in the backend

Coordinate with the backend team to add a feature key to the brand/subscription feature flag payload:

```json
{
  "brandFeatures": { "surveys": true },
  "subscriptionFeatures": { "surveys": true }
}
```

Both `brandFeatures` and `subscriptionFeatures` must allow the feature for `FeatureGuard` to pass.

### Step 4: Register the route in workspace-shell-routing.module.ts

Add the route entry alongside the other feature modules:

```typescript
{
  path: 'surveys',
  canActivate: [FeatureGuard],
  data: { feature: 'surveys' },
  loadChildren: () => import('../modules/surveys/surveys.module').then(m => m.SurveysModule),
},
```

Place the entry in alphabetical order among the existing children. Every new feature module must have `canActivate: [FeatureGuard]` and a `data.feature` key -- without these the route fails open.

### Step 5: Add the nav item to the workspace sidenav

The workspace sidenav reads available modules from `WorkspaceContextService`. Add the nav configuration so it appears for users whose brand and subscription include the `surveys` feature. The sidenav builder already filters items through `WorkspaceContextService.hasFeature()`, so no extra conditional logic is needed.

### Step 6: Enforce module isolation

The new module must not import from any other feature module under `modules/`. If shared logic is needed, place it in `SharedModule` (for UI components) or `CoreModule` (for services). This keeps the lazy-load boundary clean and prevents circular dependency chains.

### Step 7: Follow the PR checklist

Before opening your pull request, cross-reference the checklist in doc `06-pr-checklist.md`. Key items: route registered, guard configured, feature flag documented, nav item added, no cross-module imports, e2e route test added.

---

## Adding a New Route to an Existing Module

When you need a new route inside a module that already exists (e.g., adding `/workspace/:id/analytics/custom-report`):

### Step 1: Add the route to the module's routing file

```typescript
// analytics-routing.module.ts
const routes: Routes = [
  { path: '', component: AnalyticsComponent },
  { path: 'sessions', component: SessionsComponent },
  // ... existing routes ...
  { path: 'custom-report', component: CustomReportComponent },  // new
];
```

### Step 2: Apply feature gating if needed

If the new route represents a sub-feature that can be independently gated, add `FeatureGuard` with a new feature key:

```typescript
{
  path: 'custom-report',
  canActivate: [FeatureGuard],
  data: { feature: 'analyticsCustomReport' },
  component: CustomReportComponent,
},
```

If the route should be available to everyone who can access the parent module, no additional guard is needed -- the parent module's `FeatureGuard` already ran.

### Step 3: Add UnsavedChangesGuard for editable views

If the route contains a form or editable state that should warn the user before navigating away:

```typescript
{
  path: 'custom-report',
  component: CustomReportComponent,
  canDeactivate: [UnsavedChangesGuard],
},
```

The component must implement the `CanDeactivateComponent` interface to signal whether it has unsaved work.

### Step 4: Add StepValidationGuard for step-based flows

If the route is part of a wizard or step-based creation flow:

```typescript
{
  path: 'create/:reportId/step/:step',
  component: ReportWizardComponent,
  canActivate: [StepValidationGuard],
},
```

`StepValidationGuard` validates that the `:step` parameter is within the valid range for the flow.

---

## Common Mistakes

These are the errors that come up most frequently during code review. Refer to this list before submitting a PR.

| # | Mistake | Why it's wrong | Correct approach |
|---|---------|---------------|-----------------|
| 1 | Fetching workspace context in a feature module (calling `WorkspaceApiService.getContext()` directly) | Duplicates the API call that the resolver already made. Causes race conditions and stale data. | Inject `WorkspaceContextService` and call `snapshot()` or subscribe to `context$`. |
| 2 | Creating a new guard class for a new feature instead of reusing `FeatureGuard` | Spreads access-control logic across many files. Each new guard needs its own tests and maintenance. | Add a feature key to the backend flags and use `FeatureGuard` with `data: { feature: 'yourKey' }`. |
| 3 | Importing one feature module into another (e.g., `InboxModule` imports `CustomersModule`) | Breaks lazy-load boundaries. Both modules end up in the same chunk, increasing initial load. Creates tight coupling. | Extract shared code into `SharedModule` or `CoreModule`. Use router navigation for cross-module flows. |
| 4 | Forgetting to add `FeatureGuard` on a new route | The route fails open -- any authenticated workspace member can access it, even if their subscription doesn't include the feature. | Always add `canActivate: [FeatureGuard]` with a `data.feature` key to every feature module route. |
| 5 | Using `Router.navigate()` + `return false` in a guard instead of returning a `UrlTree` | The guard returns `false` before navigation completes, then triggers a second navigation via `Router.navigate()`. This causes a race condition with other guards and produces console warnings in Angular 15+. | Return `this.router.createUrlTree([...])` directly from the guard. |
| 6 | Not handling the `null` case in `WorkspaceContextService.snapshot()` during initial navigation | If a component or service calls `snapshot()` before the resolver has completed (e.g., in an APP_INITIALIZER or a non-workspace route), it throws because `_context$.value` is `null`. | Check `isLoaded` before calling `snapshot()`, or subscribe to `context$` and filter out `null`. |
| 7 | Hardcoding route paths as string literals (e.g., `this.router.navigate(['/workspace/' + id + '/inbox'])`) | Paths become scattered across the codebase. A route rename requires a codebase-wide find-and-replace with high risk of missed occurrences. | Define route path constants in a central file (e.g., `core/constants/routes.ts`) and reference them everywhere. |

---

## Edge Cases

### Workspace ID in URL doesn't exist

When a user navigates to `/workspace/INVALID_ID/home`, `WorkspaceContextResolver` calls `workspaceApi.getContext('INVALID_ID')`. The API returns a 404. The resolver's `catchError` handler calls `this.ctx.clear()` and returns `EMPTY`. When a resolver returns `EMPTY`, Angular cancels the navigation entirely -- no component renders, no error page displays. The user stays on their current page (or sees a blank screen if it was the initial navigation).

**Recommendation:** In a future iteration, catch the `EMPTY` case in the resolver and redirect to `/workspaces` with a toast notification explaining the workspace was not found.

### User has no role for the workspace

`WorkspaceMemberGuard` runs before the resolver. If the API confirms the user is not a member of workspace `:id`, the guard returns `this.router.createUrlTree(['/workspaces'])`. The user lands on the workspace list. No resolver runs, no context is fetched, no chunk is downloaded.

### Brand config API is down

`BrandConfigService` (used during app initialization) employs a stale-while-revalidate strategy. If the brand config API is unreachable, the service falls back to a cached version from `localStorage`. If no cache exists (first-ever visit), it uses a static default config bundled with the application. This ensures the app can boot even when the brand API is temporarily unavailable. The default config uses generic branding and enables all features.

### Deep link to a gated feature when not authenticated

Navigation: user clicks `https://app.example.com/workspace/ABC/campaigns`.

1. `AuthGuard` fires first. User is not authenticated. The guard stores the full URL as `returnUrl` and redirects to `/auth/login?returnUrl=%2Fworkspace%2FABC%2Fcampaigns`.
2. After login, `AuthGuard` reads `returnUrl` and redirects back to `/workspace/ABC/campaigns`.
3. `WorkspaceMemberGuard` verifies membership.
4. `WorkspaceContextResolver` fetches context.
5. `FeatureGuard` checks whether the `campaigns` feature is enabled. If the user's subscription does not include campaigns, the guard redirects to `/workspace/ABC/home`. The user sees the home page, not an error.

The full guard chain runs after every redirect, so authentication alone is not enough -- the user must also pass membership and feature checks.

### SignalR disconnects mid-session

When the SignalR connection drops (network interruption, server restart, deployment):

1. The `HubConnection` enters `Disconnected` state.
2. The configured reconnection policy triggers auto-reconnect with exponential backoff (0s, 2s, 10s, 30s).
3. `SignalRService.connectionState$` emits `Reconnecting`. Components subscribed to this observable can show a reconnection indicator.
4. On successful reconnect, `connectionState$` emits `Connected`. The service re-fetches volatile state (unread counts, active conversations, agent presence) to catch up on missed events.
5. If all retries fail, `connectionState$` emits `Disconnected`. The workspace shell shows a persistent banner prompting the user to reload.

---

## Preloading Strategy

### Why not PreloadAllModules

The workspace area contains 17 lazy-loaded feature modules. Using Angular's built-in `PreloadAllModules` strategy would download all 17 chunks immediately after the initial page load, regardless of whether the user will ever visit those modules. For users on mobile connections or lower-end devices, this wastes significant bandwidth and competes with the resources the user actually needs.

### Custom role-based preloading

Instead, implement a `RoleBasedPreloadStrategy` that selectively preloads modules based on two criteria:

1. **Route-level opt-in:** Only routes that set `data: { preload: true }` are candidates for preloading.
2. **Role filtering:** Routes can optionally specify `data: { preloadForRoles: ['admin', 'owner'] }` to limit preloading to users with specific roles.

```typescript
@Injectable({ providedIn: 'root' })
export class RoleBasedPreloadStrategy implements PreloadingStrategy {
  constructor(private ctx: WorkspaceContextService) {}

  preload(route: Route, load: () => Observable<any>): Observable<any> {
    if (!route.data?.['preload']) return of(null);

    const role = this.ctx.role;
    const rolePreloads = route.data['preloadForRoles'] as string[] | undefined;

    if (rolePreloads && role && !rolePreloads.includes(role)) {
      return of(null);
    }

    return load();
  }
}
```

Register the strategy in the root router configuration:

```typescript
RouterModule.forRoot(routes, {
  preloadingStrategy: RoleBasedPreloadStrategy,
})
```

### Recommended preloading flags by module

| Module | Preload | Preload for roles | Rationale |
|--------|---------|-------------------|-----------|
| home | Yes | all | Landing page for admin/owner, frequently visited |
| inbox | Yes | agent, admin, owner | Primary workspace for agents |
| analytics | Yes | analyst, admin, owner | Primary workspace for analysts |
| campaigns | No | -- | Used intermittently |
| ai-hub | No | -- | Heavy module, load on demand |
| settings | No | -- | Visited rarely during setup |
| setup | No | -- | One-time use |
| payment | No | -- | Infrequent |
| text-to-speech | No | -- | Niche feature |
| logs | No | -- | Admin debugging only |
| All others | No | -- | Load on demand |

### Interaction with FeatureGuard

`FeatureGuard` is configured as a `canActivate` guard, not `canLoad` or `canMatch`. This is important for preloading: `canLoad` and `canMatch` block the preloader from downloading the module chunk, whereas `canActivate` runs only when the user actually navigates to the route. This means the preloading strategy can download chunks in advance without being blocked by the guard, and the guard still prevents access at navigation time.

---

## Guard Chain Flowchart

The following text-based flowchart shows the complete navigation flow from initial URL entry to component rendering:

```
URL entered or Router.navigate() called
  |
  v
Router matches route config
  |
  v
canMatch guards (future use -- none configured currently)
  |
  v
canActivate guards run in order (parent route: /workspace/:id)
  |
  +--[1] AuthGuard
  |     |-- Token invalid? --> redirect to /auth/login?returnUrl=...
  |     |-- Token valid?   --> continue
  |
  +--[2] WorkspaceMemberGuard
  |     |-- Not a member?  --> redirect to /workspaces
  |     |-- Is a member?   --> continue
  |
  v
Resolver runs (parent route)
  |
  +--[3] WorkspaceContextResolver
  |     |-- Same workspace already loaded? --> skip fetch, continue
  |     |-- Fetch workspace context from API
  |     |-- API error / not found? --> return EMPTY (navigation cancels)
  |     |-- Success? --> store in WorkspaceContextService, continue
  |
  v
canActivate guards run (child route: feature module path)
  |
  +--[4a] WorkspaceLandingGuard (empty path only)
  |     |-- Read role from WorkspaceContextService
  |     |-- Redirect to role-appropriate module (inbox, analytics, home)
  |
  +--[4b] FeatureGuard (feature module paths)
  |     |-- Feature disabled? --> redirect to /workspace/:id/home
  |     |-- Feature enabled?  --> continue
  |
  v
loadChildren triggers (lazy load module chunk)
  |
  v
Child route matching within the feature module
  |
  v
Child-level canActivate guards (if any)
  |-- e.g., sub-feature FeatureGuard, StepValidationGuard
  |
  v
canDeactivate guards registered (if any)
  |-- e.g., UnsavedChangesGuard (runs on next navigation away)
  |
  v
Component renders in WorkspaceShellComponent's <router-outlet>
```

---

## Angular Migration Notes (14/15 to 17+)

> **Important:** All guards, resolvers, and interceptors in this document use the class-based syntax introduced in Angular 14 (`implements CanActivate`, `implements Resolve<T>`). This is intentional -- the current codebase targets Angular 14/15. The guidance below describes how to migrate to the functional API when the time comes.

### Functional guards (Angular 15+)

Angular 15 introduced `CanActivateFn`, `CanDeactivateFn`, `ResolveFn`, and other functional equivalents. Angular 17 deprecates the class-based interfaces. Conversion is straightforward:

**Class-based FeatureGuard (current):**

```typescript
@Injectable({ providedIn: 'root' })
export class FeatureGuard implements CanActivate {
  constructor(
    private ctx: WorkspaceContextService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const feature = route.data['feature'] as string;
    const id = route.parent?.paramMap.get('id') ?? route.paramMap.get('id');
    if (!feature || this.ctx.hasFeature(feature)) return true;
    return this.router.createUrlTree(['/workspace', id, 'home']);
  }
}
```

**Functional featureGuard (Angular 17+):**

```typescript
export const featureGuard: CanActivateFn = (route) => {
  const ctx = inject(WorkspaceContextService);
  const router = inject(Router);
  const feature = route.data['feature'] as string;
  const id = route.parent?.paramMap.get('id') ?? route.paramMap.get('id');
  if (!feature || ctx.hasFeature(feature)) return true;
  return router.createUrlTree(['/workspace', id, 'home']);
};
```

### Functional resolvers

`WorkspaceContextResolver` converts similarly:

```typescript
export const workspaceContextResolver: ResolveFn<WorkspaceContext> = (route) => {
  const workspaceApi = inject(WorkspaceApiService);
  const ctx = inject(WorkspaceContextService);
  const id = route.paramMap.get('id');

  if (ctx.currentId === id && ctx.isLoaded) {
    return of(ctx.snapshot());
  }

  return workspaceApi.getContext(id).pipe(
    tap(context => ctx.set(context)),
    catchError(() => {
      ctx.clear();
      return EMPTY;
    }),
  );
};
```

### Route config changes

When using functional guards, the route config changes slightly:

```typescript
// Class-based (current)
canActivate: [FeatureGuard]

// Functional (Angular 17+)
canActivate: [featureGuard]
```

No array wrapper change is needed -- Angular accepts both class references and function references in the same array position.

### Migration rule

**Convert when you touch the file, not as a standalone migration.** If you are modifying a guard or resolver for a bug fix or feature change, convert it to functional syntax at the same time. Do not open PRs that only convert syntax -- this creates unnecessary merge conflicts and review burden. The class-based syntax continues to work in Angular 17 (deprecated but functional) and will be removed in a future major version.
