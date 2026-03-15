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
