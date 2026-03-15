# Route Architecture

## Route Tree

```
SHELL (host application)
========================

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
  /confirm/:invitationToken                   [authGuard] → processes token, assigns role, redirects to workspace
  /fail                                       [authGuard]

/workspaces                                   AppLayoutComponent (topbar, no sidenav)
  (empty)                                     [authGuard] workspace list or "create first workspace"
  /create
  /create/templates
  /create/:templateId
  /:workspaceId/install                       [authGuard, canDeactivate]

/account                                      AccountLayoutComponent (topbar, account sidenav)
  /profile                                    [authGuard]
  /security
  /notifications

/callbacks                                    No layout (process and redirect)
  /twitter
  /moneyhash

REMOTES (loaded into WorkspaceShellComponent's <router-outlet>)
================================================================

/workspace/:id                                WorkspaceShellComponent [authGuard, workspaceMemberGuard, workspaceContextResolver]
  (empty)                                     [workspaceLandingGuard] redirects by role
  /home                                       → remote: home
  /playground                                 → remote: playground        [featureGuard: 'playground']
  /inbox                                      → remote: inbox             [featureGuard: 'inbox']
    /:userId
  /inbox-activity                             → remote: inbox-activity    [featureGuard: 'inboxActivity']
  /analytics                                  → remote: analytics         [featureGuard: 'analytics']
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
  /ai-hub                                     → remote: ai-hub           [featureGuard: 'aiHub']
    /list, /list/edit, /test, /knowledge, ...
  /campaigns                                  → remote: campaigns        [featureGuard: 'campaigns']
    /list, /channelSelect, /create/:broadcastId, ...
  /comment-acquisition                        → remote: comment-acquisition [featureGuard: 'commentAcquisition']
    /list, /create/:channel/:commentId, ...
  /customers                                  → remote: customers        [featureGuard: 'customers']
  /identity                                   → remote: identity         [featureGuard: 'identity']
  /marketplace                                → remote: marketplace      [featureGuard: 'marketplace']
    /:categoryId, /:categoryId/:appId, ...
  /logs                                       → remote: logs             [featureGuard: 'logs']
  /text-to-speech                             → remote: text-to-speech   [featureGuard: 'textToSpeech']
  /setup                                      → remote: setup            [featureGuard: 'setup']
  /payment                                    → remote: payment          [featureGuard: 'payment']
    /pricing, /checkout/:plan, /downgrade/:plan
  /subscription-details                       → remote: subscription-details [featureGuard: 'subscriptionDetails']
  /settings                                   → remote: settings         [featureGuard: 'settings']
    /info, /channels/webchat, ..., /billing/plan, ...
```

---

## Layout Shells

All shells live in the shell (host) application. Remotes never define or import shell components.

```
AppComponent (shell)
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
          Workspace sidenav (feature remotes, built dynamically from feature flags)
          |
          +-- SettingsShellComponent    /workspace/:id/settings/*
                Adds a secondary sub-sidenav for settings sections
```

Each shell has its own `<router-outlet>`. Remote feature modules render inside the workspace shell's outlet. Settings sections (from the settings remote) render inside the settings shell's outlet.

The workspace sidenav reads from `WorkspaceContextService` (shared singleton) and builds nav items dynamically. If a remote is hidden from the sidenav, its `featureGuard` also rejects direct URL access.

---

## Module Federation Loading

### Dynamic Federation

The shell does not hardcode remote URLs. At startup, it fetches `module-federation.manifest.json`:

```json
{
  "home": "https://cdn.widebot.net/remotes/home/remoteEntry.js",
  "inbox": "https://cdn.widebot.net/remotes/inbox/remoteEntry.js",
  "analytics": "https://cdn.widebot.net/remotes/analytics/remoteEntry.js",
  "playground": "https://cdn.widebot.net/remotes/playground/remoteEntry.js",
  "ai-hub": "https://cdn.widebot.net/remotes/ai-hub/remoteEntry.js",
  "campaigns": "https://cdn.widebot.net/remotes/campaigns/remoteEntry.js",
  "comment-acquisition": "https://cdn.widebot.net/remotes/comment-acquisition/remoteEntry.js",
  "customers": "https://cdn.widebot.net/remotes/customers/remoteEntry.js",
  "identity": "https://cdn.widebot.net/remotes/identity/remoteEntry.js",
  "marketplace": "https://cdn.widebot.net/remotes/marketplace/remoteEntry.js",
  "logs": "https://cdn.widebot.net/remotes/logs/remoteEntry.js",
  "text-to-speech": "https://cdn.widebot.net/remotes/text-to-speech/remoteEntry.js",
  "setup": "https://cdn.widebot.net/remotes/setup/remoteEntry.js",
  "payment": "https://cdn.widebot.net/remotes/payment/remoteEntry.js",
  "subscription-details": "https://cdn.widebot.net/remotes/subscription-details/remoteEntry.js",
  "settings": "https://cdn.widebot.net/remotes/settings/remoteEntry.js",
  "inbox-activity": "https://cdn.widebot.net/remotes/inbox-activity/remoteEntry.js"
}
```

On-prem deployments serve a different manifest pointing to the on-prem CDN or a local path.

### Shell Bootstrap

```typescript
// apps/shell/src/main.ts
import { loadManifest } from '@nx/angular/mf';

loadManifest('module-federation.manifest.json')
  .then(() => import('./bootstrap'))
  .catch(err => console.error('Failed to load MF manifest', err));
```

```typescript
// apps/shell/src/bootstrap.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig);
```

The `loadManifest` call must complete before `bootstrap.ts` runs. This indirection gives webpack Module Federation time to negotiate shared dependency versions.

### How Routes Load Remotes

```typescript
// apps/shell/src/app/app.routes.ts
import { loadRemoteModule } from '@nx/angular/mf';
import { Routes } from '@angular/router';
import { authGuard } from '@pwa/auth';
import { workspaceMemberGuard, workspaceContextResolver, workspaceLandingGuard, featureGuard } from '@pwa/workspace-context';

export const appRoutes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout.component').then(c => c.AuthLayoutComponent),
    loadChildren: () => import('./auth/auth.routes').then(r => r.authRoutes),
  },
  {
    path: 'join',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/auth-layout.component').then(c => c.AuthLayoutComponent),
    loadChildren: () => import('./join/join.routes').then(r => r.joinRoutes),
  },
  {
    path: 'workspaces',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/app-layout.component').then(c => c.AppLayoutComponent),
    loadChildren: () => import('./workspaces/workspaces.routes').then(r => r.workspacesRoutes),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/account-layout.component').then(c => c.AccountLayoutComponent),
    loadChildren: () => import('./account/account.routes').then(r => r.accountRoutes),
  },
  {
    path: 'callbacks',
    loadChildren: () => import('./callbacks/callbacks.routes').then(r => r.callbacksRoutes),
  },
  {
    path: 'workspace/:id',
    canActivate: [authGuard, workspaceMemberGuard],
    resolve: { ctx: workspaceContextResolver },
    loadComponent: () => import('./layouts/workspace-shell.component').then(c => c.WorkspaceShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [workspaceLandingGuard],
        loadComponent: () => import('./layouts/empty.component').then(c => c.EmptyComponent),
      },
      {
        path: 'home',
        loadChildren: () => loadRemoteModule('home', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'playground',
        canActivate: [featureGuard],
        data: { feature: 'playground' },
        loadChildren: () => loadRemoteModule('playground', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'inbox',
        canActivate: [featureGuard],
        data: { feature: 'inbox' },
        loadChildren: () => loadRemoteModule('inbox', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'inbox-activity',
        canActivate: [featureGuard],
        data: { feature: 'inboxActivity' },
        loadChildren: () => loadRemoteModule('inbox-activity', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'analytics',
        canActivate: [featureGuard],
        data: { feature: 'analytics' },
        loadChildren: () => loadRemoteModule('analytics', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'ai-hub',
        canActivate: [featureGuard],
        data: { feature: 'aiHub' },
        loadChildren: () => loadRemoteModule('ai-hub', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'campaigns',
        canActivate: [featureGuard],
        data: { feature: 'campaigns' },
        loadChildren: () => loadRemoteModule('campaigns', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'comment-acquisition',
        canActivate: [featureGuard],
        data: { feature: 'commentAcquisition' },
        loadChildren: () => loadRemoteModule('comment-acquisition', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'customers',
        canActivate: [featureGuard],
        data: { feature: 'customers' },
        loadChildren: () => loadRemoteModule('customers', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'identity',
        canActivate: [featureGuard],
        data: { feature: 'identity' },
        loadChildren: () => loadRemoteModule('identity', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'marketplace',
        canActivate: [featureGuard],
        data: { feature: 'marketplace' },
        loadChildren: () => loadRemoteModule('marketplace', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'logs',
        canActivate: [featureGuard],
        data: { feature: 'logs' },
        loadChildren: () => loadRemoteModule('logs', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'text-to-speech',
        canActivate: [featureGuard],
        data: { feature: 'textToSpeech' },
        loadChildren: () => loadRemoteModule('text-to-speech', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'setup',
        canActivate: [featureGuard],
        data: { feature: 'setup' },
        loadChildren: () => loadRemoteModule('setup', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'payment',
        canActivate: [featureGuard],
        data: { feature: 'payment' },
        loadChildren: () => loadRemoteModule('payment', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'subscription-details',
        canActivate: [featureGuard],
        data: { feature: 'subscriptionDetails' },
        loadChildren: () => loadRemoteModule('subscription-details', './Routes').then(r => r.remoteRoutes),
      },
      {
        path: 'settings',
        canActivate: [featureGuard],
        data: { feature: 'settings' },
        loadChildren: () => loadRemoteModule('settings', './Routes').then(r => r.remoteRoutes),
      },
    ],
  },
  { path: '', redirectTo: 'workspaces', pathMatch: 'full' },
  { path: '**', redirectTo: 'workspaces' },
];
```

### Remote Entry Point (example: Inbox)

```typescript
// apps/inbox/src/app/remote-entry/entry.routes.ts
import { Routes } from '@angular/router';

export const remoteRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../inbox.component').then(c => c.InboxComponent),
  },
  {
    path: ':userId',
    loadComponent: () => import('../inbox.component').then(c => c.InboxComponent),
  },
];
```

```typescript
// apps/inbox/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'inbox',
  exposes: {
    './Routes': 'apps/inbox/src/app/remote-entry/entry.routes.ts',
  },
};
export default config;
```

Guards and resolvers run in the shell before `loadRemoteModule` executes. The remote only provides routes and components -- it has no guards of its own at the top level. Sub-route guards (like `StepValidationGuard` inside campaigns) run inside the remote after it loads.

---

## Guard Chain

Every navigation through the workspace area passes through guards in this order:

```
Step 1: authGuard                          on /workspace/:id (shell)
  Token valid?
    No  → /auth/login?returnUrl=...
    Yes → continue

Step 2: workspaceMemberGuard               on /workspace/:id (shell)
  User belongs to this workspace?
    No  → /workspaces
    Yes → continue

Step 3: workspaceContextResolver           on /workspace/:id (shell)
  Fetch workspace details + user role + subscription + feature flags
  Store in WorkspaceContextService (shared singleton)
  (runs once per workspace, not per child navigation)

Step 4: workspaceLandingGuard              on /workspace/:id (empty path only, shell)
  Read role from WorkspaceContextService
  Redirect:
    agent   → /workspace/:id/inbox
    analyst → /workspace/:id/analytics
    admin   → /workspace/:id/home
    owner   → /workspace/:id/home
  (no remote chunk downloaded until after redirect)

Step 5: featureGuard                       on each child route (shell)
  Brand allows this feature?
    No  → /workspace/:id/home
  Subscription includes this feature?
    No  → /workspace/:id/home
  Yes → loadRemoteModule downloads remote chunk → remote routes activate
```

All guards run in the shell's injection context. They use `inject()` to access shared services. The remote is never downloaded until all guards pass.

### Guard Implementations

```typescript
// libs/shared/auth/src/lib/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};
```

```typescript
// libs/shared/workspace-context/src/lib/guards/workspace-member.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { WorkspaceApiService } from '../services/workspace-api.service';
import { firstValueFrom } from 'rxjs';

export const workspaceMemberGuard: CanActivateFn = async (route) => {
  const workspaceApi = inject(WorkspaceApiService);
  const router = inject(Router);
  const id = route.paramMap.get('id')!;

  const isMember = await firstValueFrom(workspaceApi.checkMembership(id));
  return isMember || router.createUrlTree(['/workspaces']);
};
```

```typescript
// libs/shared/workspace-context/src/lib/guards/feature.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { WorkspaceContextService } from '../services/workspace-context.service';

export const featureGuard: CanActivateFn = (route) => {
  const ctx = inject(WorkspaceContextService);
  const router = inject(Router);
  const feature = route.data['feature'] as string;
  const id = route.parent?.paramMap.get('id') ?? route.paramMap.get('id');

  if (!feature) return true;
  if (ctx.hasFeature(feature)) return true;

  return router.createUrlTree(['/workspace', id, 'home']);
};
```

```typescript
// libs/shared/workspace-context/src/lib/guards/workspace-landing.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { WorkspaceContextService } from '../services/workspace-context.service';

export const workspaceLandingGuard: CanActivateFn = (route) => {
  const ctx = inject(WorkspaceContextService);
  const router = inject(Router);
  const id = route.parent?.paramMap.get('id');

  const landingMap: Record<string, string> = {
    agent: 'inbox',
    analyst: 'analytics',
    admin: 'home',
    owner: 'home',
  };

  const target = landingMap[ctx.role() ?? ''] ?? 'home';
  return router.createUrlTree(['/workspace', id, target]);
};
```

### Guard Inventory

| Guard | Type | Scope | Location | Purpose |
|-------|------|-------|----------|---------|
| `authGuard` | `CanActivateFn` | /workspaces, /workspace/:id, /account, /join | `@pwa/auth` | Redirects to login if not authenticated. Preserves returnUrl. |
| `workspaceMemberGuard` | `CanActivateFn` | /workspace/:id | `@pwa/workspace-context` | Verifies user is a member of the workspace. |
| `workspaceLandingGuard` | `CanActivateFn` | /workspace/:id (empty path) | `@pwa/workspace-context` | Role-based redirect. Never renders a component. |
| `featureGuard` | `CanActivateFn` | Each remote route | `@pwa/workspace-context` | Checks brand + subscription flags. Single access-control mechanism. |
| `unsavedChangesGuard` | `CanDeactivateFn` | Editing routes within remotes | `@pwa/utils` | Confirms before leaving unsaved work. |
| `sendEmail2FAGuard` | `CanActivateFn` | /auth/send2FA-email | Shell (local) | Checks 2FA config flag. |
| `stepValidationGuard` | `CanActivateFn` | Step routes in campaigns/comment-acquisition | Respective remotes (local) | Validates step parameter is within range. |

---

## Workspace Context (Signals-Based)

### WorkspaceContextResolver

```typescript
// libs/shared/workspace-context/src/lib/resolvers/workspace-context.resolver.ts
import { ResolveFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { WorkspaceApiService } from '../services/workspace-api.service';
import { WorkspaceContextService } from '../services/workspace-context.service';
import { NotificationService } from '@pwa/utils';
import { WorkspaceContext } from '../models/workspace-context.model';

export const workspaceContextResolver: ResolveFn<WorkspaceContext | null> = async (route) => {
  const workspaceApi = inject(WorkspaceApiService);
  const ctx = inject(WorkspaceContextService);
  const router = inject(Router);
  const notification = inject(NotificationService);
  const id = route.paramMap.get('id')!;

  // skip refetch if same workspace
  if (ctx.currentId() === id && ctx.isLoaded()) {
    return ctx.snapshot();
  }

  try {
    const context = await firstValueFrom(workspaceApi.getContext(id));
    ctx.set(context);
    return context;
  } catch {
    ctx.clear();
    notification.error('Could not load workspace');
    router.navigate(['/workspaces']);
    return null;
  }
};
```

### WorkspaceContextService (Signals)

```typescript
// libs/shared/workspace-context/src/lib/services/workspace-context.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { WorkspaceContext } from '../models/workspace-context.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceContextService {
  private readonly _context = signal<WorkspaceContext | null>(null);

  // Public read-only signals
  readonly context = this._context.asReadonly();
  readonly currentId = computed(() => this._context()?.workspace.id ?? null);
  readonly isLoaded = computed(() => this._context() !== null);
  readonly role = computed(() => this._context()?.membership.role ?? null);
  readonly workspace = computed(() => this._context()?.workspace ?? null);
  readonly subscription = computed(() => this._context()?.subscription ?? null);

  snapshot(): WorkspaceContext {
    return this._context()!;
  }

  set(ctx: WorkspaceContext): void {
    this._context.set(ctx);
  }

  clear(): void {
    this._context.set(null);
  }

  hasFeature(key: string): boolean {
    const ctx = this._context();
    if (!ctx) return false;
    return ctx.brandFeatures[key] !== false && ctx.subscriptionFeatures[key] !== false;
  }
}
```

### How Remotes Consume It

Remotes inject `WorkspaceContextService` directly. It is a shared singleton via Module Federation -- both the shell and all remotes share the same instance at runtime.

```typescript
// Inside any remote component
import { Component, inject } from '@angular/core';
import { WorkspaceContextService } from '@pwa/workspace-context';

@Component({
  selector: 'app-inbox',
  standalone: true,
  template: `
    <h1>{{ ctx.workspace()?.name }}</h1>
    <p>Role: {{ ctx.role() }}</p>
  `,
})
export class InboxComponent {
  protected readonly ctx = inject(WorkspaceContextService);
}
```

No API call. No subscription. Just signal reads.

---

## SignalR Lifecycle

The SignalR connection is tied to `WorkspaceShellComponent` in the shell. One workspace = one connection. No connection exists outside a workspace.

```
User navigates to /workspace/ABC
  → workspaceContextResolver fetches context
  → WorkspaceShellComponent initializes
  → SignalRService.connect('ABC', token)
  → Connection established, scoped to Workspace ABC

User navigates to /workspace/ABC/inbox (remote loads), then /workspace/ABC/analytics (different remote loads)
  → Connection stays open (same workspace shell, only child changes)

User switches to /workspace/XYZ
  → WorkspaceShellComponent destroys
  → SignalRService.disconnect()
  → New WorkspaceShellComponent initializes
  → SignalRService.connect('XYZ', token)

User navigates to /workspaces or /account
  → WorkspaceShellComponent destroys
  → SignalRService.disconnect()
  → No active connection
```

```typescript
// apps/shell/src/app/layouts/workspace-shell.component.ts
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SignalRService } from '@pwa/signalr';
import { WorkspaceContextService } from '@pwa/workspace-context';
import { AuthService } from '@pwa/auth';
import { WorkspaceSidenavComponent } from '../components/workspace-sidenav.component';
import { TopbarComponent } from '../components/topbar.component';

@Component({
  selector: 'app-workspace-shell',
  standalone: true,
  imports: [RouterOutlet, WorkspaceSidenavComponent, TopbarComponent],
  template: `
    <app-topbar />
    <div class="workspace-layout">
      <app-workspace-sidenav />
      <main class="workspace-content">
        <router-outlet />
      </main>
    </div>
  `,
})
export class WorkspaceShellComponent implements OnInit, OnDestroy {
  private readonly signalr = inject(SignalRService);
  private readonly ctx = inject(WorkspaceContextService);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    const workspaceId = this.ctx.currentId();
    const token = this.auth.token();
    if (workspaceId && token) {
      this.signalr.connect(workspaceId, token);
    }
  }

  ngOnDestroy(): void {
    this.signalr.disconnect();
  }
}
```

Reconnection policy: auto-reconnect with exponential backoff. On reconnect, re-fetch volatile state (unread counts, inbox messages). `SignalRService` exposes a `connectionState` signal so components can show reconnection indicators.

---

## Nx Project Structure

```
widebot-platform/
  apps/
    shell/                          # Host application
      src/
        app/
          app.component.ts
          app.config.ts
          app.routes.ts
          layouts/
            auth-layout.component.ts
            app-layout.component.ts
            account-layout.component.ts
            workspace-shell.component.ts
            settings-shell.component.ts
            empty.component.ts
          components/
            topbar.component.ts
            workspace-sidenav.component.ts
          auth/                     # Auth pages (shell-local)
          join/                     # Join flow (shell-local)
          workspaces/               # Workspace list (shell-local)
          account/                  # Account settings (shell-local)
          callbacks/                # OAuth callbacks (shell-local)
        main.ts
        bootstrap.ts
      module-federation.config.ts
      webpack.config.ts
      project.json

    home/                           # Remote
      src/app/
        remote-entry/entry.routes.ts
        home.component.ts
      module-federation.config.ts
      webpack.config.ts
      project.json

    inbox/                          # Remote
      src/app/
        remote-entry/entry.routes.ts
        inbox.component.ts
        services/
        components/
      module-federation.config.ts
      webpack.config.ts
      project.json

    analytics/                      # Remote (same pattern)
    playground/
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
      src/app/
        remote-entry/entry.routes.ts
        settings-shell.routes.ts    # Sub-routes for settings sections
        sections/
          info/
          channels/
          ai-agent/
          team/
          agents/
          billing/
          ...

  libs/
    shared/
      ui/                           # Design system components
      auth/                         # AuthService, authGuard, token management
      workspace-context/            # WorkspaceContextService, guards, resolver, models
      brand/                        # BrandConfigService, theming
      signalr/                      # SignalR connection management
      models/                       # Shared TypeScript interfaces
      data-access/                  # Base HTTP client, API utilities
      utils/                        # Pure utilities, NotificationService

  module-federation.manifest.json   # Remote URLs (dev defaults)
  nx.json
  tsconfig.base.json
```

---

## Shared Dependencies Strategy

Webpack Module Federation shares dependencies as singletons at runtime. The shell and all 17 remotes must agree on the same version of these packages:

| Package | Shared | Singleton | Strict Version | Why |
|---------|--------|-----------|----------------|-----|
| `@angular/core` | Yes | Yes | Yes | Multiple Angular instances cause runtime crashes |
| `@angular/common` | Yes | Yes | Yes | Same reason |
| `@angular/common/http` | Yes | Yes | Yes | Interceptors must run once, in one HttpClient |
| `@angular/router` | Yes | Yes | Yes | One router instance manages all routes |
| `@angular/forms` | Yes | Yes | Yes | Form validation must share validators |
| `rxjs` | Yes | Yes | Yes | Shared observables must be the same RxJS |
| `@pwa/workspace-context` | Yes | Yes | Yes | WorkspaceContextService is a shared singleton |
| `@pwa/auth` | Yes | Yes | Yes | AuthService must be a single instance |
| `@pwa/brand` | Yes | Yes | Yes | BrandConfigService must be a single instance |
| `@pwa/signalr` | Yes | Yes | Yes | One SignalR connection per workspace |
| `@pwa/ui` | Yes | Yes | Yes | Design system components shared, not duplicated |
| `@pwa/models` | Yes | Yes | Yes | Shared interfaces must match |
| `@pwa/utils` | Yes | Yes | Yes | Utility functions shared |
| `@pwa/data-access` | Yes | Yes | Yes | Base HTTP client shared |

Nx's `withModuleFederation()` automatically detects shared dependencies from the project graph. The config above is the default behavior -- Nx handles it. To override:

```typescript
// apps/inbox/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'inbox',
  exposes: {
    './Routes': 'apps/inbox/src/app/remote-entry/entry.routes.ts',
  },
  shared: (libraryName, defaultConfig) => {
    // Example: exclude a heavy charting lib from sharing
    if (libraryName === 'echarts') return false;
    return defaultConfig;
  },
};
export default config;
```

### Version Discipline

All remotes must use the same Angular version. This is enforced by:
1. Nx workspace uses a single `package.json` at the root.
2. `strictVersion: true` in MF shared config throws a runtime error if versions mismatch.
3. CI runs `nx affected:build` to rebuild only changed remotes, but all remotes share the same `node_modules`.

---

## Common Mistakes

| # | Mistake | Why it's wrong | Correct approach |
|---|---------|---------------|-----------------|
| 1 | Fetching workspace context in a remote | Duplicates the API call the resolver already made. Creates a second instance if the service isn't shared correctly. | Inject `WorkspaceContextService` from `@pwa/workspace-context` and read its signals. |
| 2 | Defining guards inside a remote for top-level feature gating | Guards for feature access must run before the remote downloads. A guard inside the remote runs too late. | Use `featureGuard` in the shell's route config with `data: { feature: 'key' }`. |
| 3 | Importing code from one remote into another | Creates a build-time dependency between independently deployed apps. Breaks the MF contract. Nx boundary rules will catch this. | Extract shared code into a `libs/shared/*` library. |
| 4 | Forgetting `featureGuard` on a new remote route | The route fails open -- any authenticated workspace member can load the remote. | Always add `canActivate: [featureGuard]` with `data: { feature: 'key' }` in the shell's route config. |
| 5 | Using constructor injection instead of `inject()` | Constructor injection works but is inconsistent with functional guards/resolvers/interceptors. | Use `inject()` everywhere for consistency. |
| 6 | Providing a service in both the remote and a shared lib | Creates two instances -- one in the remote's injector, one in the shell's. State diverges silently. | Services shared across remotes must live in a `libs/shared/*` lib and be `providedIn: 'root'`. |
| 7 | Hardcoding `remoteEntry.js` URLs in route config | Breaks when deploy URLs change. Couples shell build to remote deploy locations. | Use dynamic federation with `module-federation.manifest.json`. |

---

## Edge Cases

### Remote fails to load (network error, deploy in progress)

When `loadRemoteModule` fails (404, timeout, JS error in remote), the shell catches the error and shows a fallback component:

```typescript
{
  path: 'inbox',
  canActivate: [featureGuard],
  data: { feature: 'inbox' },
  loadChildren: () =>
    loadRemoteModule('inbox', './Routes')
      .then(r => r.remoteRoutes)
      .catch(() => import('./fallbacks/remote-error.routes').then(r => r.remoteErrorRoutes)),
},
```

The fallback shows "This module is temporarily unavailable. Try again later." with a retry button.

### Shell and remote version mismatch

If a remote is deployed with a newer Angular version than the shell, `strictVersion: true` throws a runtime error immediately. The error is caught by the `loadChildren` catch handler, and the fallback component renders. The CI pipeline should prevent this by building all affected projects together.

### Workspace ID in URL doesn't exist

`workspaceContextResolver` catches the API 404, clears context, shows an error toast, and navigates to `/workspaces`.

### Deep link to a gated feature when not authenticated

1. `authGuard` stores the full URL as `returnUrl`, redirects to `/auth/login`.
2. After login, redirects back to `/workspace/ABC/campaigns`.
3. `workspaceMemberGuard` verifies membership.
4. `workspaceContextResolver` fetches context.
5. `featureGuard` checks `campaigns` feature. If disabled, redirects to `/workspace/ABC/home`.

### SignalR disconnects mid-session

1. `HubConnection` enters `Disconnected` state.
2. Auto-reconnect with exponential backoff (0s, 2s, 10s, 30s).
3. `SignalRService.connectionState` signal emits `'reconnecting'`. Components show reconnection indicator.
4. On reconnect, re-fetch volatile state.
5. If all retries fail, workspace shell shows a persistent banner.
