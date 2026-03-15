# 01. Route Architecture

## 1.1 Top-Level Route Tree

```
/auth                              -- AuthLayoutComponent (no sidenav, no top bar)
  /login
  /register
  /forgot-password
  /verify-email
  /reset-password

/bots                              -- AppLayoutComponent (top bar, no sidenav)
                                      Bot list or "create first bot" screen

/account                           -- AccountLayoutComponent (top bar, account sidenav)
  /profile
  /security
  /notifications
  /plans

/workspace/:id                        -- WorkspaceShellComponent (top bar, workspace sidenav)
  /                                   Empty path, redirected by WorkspaceLandingGuard
  /playground
  /analytics
  /inbox
  /activity
  /settings                        -- SettingsShellComponent (top bar, workspace sidenav, settings sub-sidenav)
    /general
    /team
    /integrations
    /billing
    /...

/**                                -- Redirect to /bots
```

---

## 1.2 Layout Hierarchy

The app has four distinct layout shells. Each is a component with a `<router-outlet>`.

```
AppComponent
  <router-outlet>
    |
    +-- AuthLayoutComponent           (auth/* routes)
    |     No top bar, no sidenav
    |     Branded login background, logo from BrandConfig
    |
    +-- AppLayoutComponent            (bots route)
    |     Top bar with user avatar menu
    |     No sidenav
    |
    +-- AccountLayoutComponent        (account/* routes)
    |     Top bar with user avatar menu
    |     Account sidenav (profile, security, etc.)
    |
    +-- WorkspaceShellComponent             (workspace/:id/* routes)
          Top bar with workspace selector + user avatar menu
          Workspace sidenav (modules)
          |
          +-- SettingsShellComponent  (bot/:botId/settings/* routes)
                Adds a secondary sub-sidenav for settings sections
```

### Diagram: Layout Hierarchy

<svg width="100%" viewBox="0 0 680 520" xmlns="http://www.w3.org/2000/svg" style="max-width:680px;font-family:system-ui,sans-serif">
  <style>
    .box-outer { fill: #F1EFE8; stroke: #888780; stroke-width: 0.5; }
    .box-purple { fill: #EEEDFE; stroke: #534AB7; stroke-width: 0.5; }
    .box-teal { fill: #E1F5EE; stroke: #0F6E56; stroke-width: 0.5; }
    .box-coral { fill: #FAECE7; stroke: #993C1D; stroke-width: 0.5; }
    .box-blue { fill: #E6F1FB; stroke: #185FA5; stroke-width: 0.5; }
    .box-amber { fill: #FAEEDA; stroke: #854F0B; stroke-width: 0.5; }
    .box-gray-inner { fill: #F1EFE8; stroke: #5F5E5A; stroke-width: 0.5; }
    .t-title { font-size: 14px; font-weight: 500; fill: #2C2C2A; }
    .t-sub { font-size: 12px; fill: #5F5E5A; }
    .t-title-purple { font-size: 14px; font-weight: 500; fill: #3C3489; }
    .t-sub-purple { font-size: 12px; fill: #534AB7; }
    .t-title-teal { font-size: 14px; font-weight: 500; fill: #085041; }
    .t-sub-teal { font-size: 12px; fill: #0F6E56; }
    .t-title-coral { font-size: 14px; font-weight: 500; fill: #712B13; }
    .t-sub-coral { font-size: 12px; fill: #993C1D; }
    .t-title-blue { font-size: 14px; font-weight: 500; fill: #0C447C; }
    .t-sub-blue { font-size: 12px; fill: #185FA5; }
    .t-title-amber { font-size: 14px; font-weight: 500; fill: #633806; }
    .t-sub-amber { font-size: 12px; fill: #854F0B; }
    .t-title-gray { font-size: 14px; font-weight: 500; fill: #444441; }
    .t-sub-gray { font-size: 12px; fill: #5F5E5A; }
    .leader { stroke: #B4B2A9; stroke-width: 0.5; stroke-dasharray: 4 3; fill: none; }
  </style>

  <!-- AppComponent outer container -->
  <rect class="box-outer" x="40" y="30" width="600" height="470" rx="20"/>
  <text class="t-title" x="340" y="58" text-anchor="middle">AppComponent</text>
  <text class="t-sub" x="340" y="76" text-anchor="middle">router-outlet</text>

  <!-- Auth Layout -->
  <rect class="box-purple" x="70" y="100" width="130" height="56" rx="8"/>
  <text class="t-title-purple" x="135" y="122" text-anchor="middle" dominant-baseline="central">Auth layout</text>
  <text class="t-sub-purple" x="135" y="140" text-anchor="middle" dominant-baseline="central">No chrome</text>

  <!-- App Layout -->
  <rect class="box-teal" x="220" y="100" width="130" height="56" rx="8"/>
  <text class="t-title-teal" x="285" y="122" text-anchor="middle" dominant-baseline="central">App layout</text>
  <text class="t-sub-teal" x="285" y="140" text-anchor="middle" dominant-baseline="central">Top bar only</text>

  <!-- Account Layout -->
  <rect class="box-coral" x="370" y="100" width="130" height="56" rx="8"/>
  <text class="t-title-coral" x="435" y="122" text-anchor="middle" dominant-baseline="central">Account layout</text>
  <text class="t-sub-coral" x="435" y="140" text-anchor="middle" dominant-baseline="central">Top bar + sidenav</text>

  <!-- Workspace Shell -->
  <rect class="box-blue" x="310" y="200" width="310" height="280" rx="14"/>
  <text class="t-title-blue" x="465" y="226" text-anchor="middle">Workspace shell</text>
  <text class="t-sub-blue" x="465" y="244" text-anchor="middle">Top bar + workspace sidenav</text>

  <!-- Modules inside Workspace Shell -->
  <rect class="box-teal" x="330" y="268" width="110" height="44" rx="8"/>
  <text class="t-title-teal" x="385" y="290" text-anchor="middle" dominant-baseline="central">Playground</text>

  <rect class="box-teal" x="330" y="324" width="110" height="44" rx="8"/>
  <text class="t-title-teal" x="385" y="346" text-anchor="middle" dominant-baseline="central">Inbox</text>

  <rect class="box-teal" x="330" y="380" width="110" height="44" rx="8"/>
  <text class="t-title-teal" x="385" y="402" text-anchor="middle" dominant-baseline="central">Analytics</text>

  <rect class="box-teal" x="330" y="436" width="110" height="44" rx="8"/>
  <text class="t-title-teal" x="385" y="458" text-anchor="middle" dominant-baseline="central">Activity</text>

  <!-- Settings Shell -->
  <rect class="box-amber" x="460" y="268" width="140" height="212" rx="10"/>
  <text class="t-title-amber" x="530" y="292" text-anchor="middle">Settings shell</text>
  <text class="t-sub-amber" x="530" y="308" text-anchor="middle">Sub-sidenav</text>

  <rect class="box-gray-inner" x="474" y="324" width="112" height="34" rx="6"/>
  <text class="t-sub-gray" x="530" y="341" text-anchor="middle" dominant-baseline="central">General</text>

  <rect class="box-gray-inner" x="474" y="366" width="112" height="34" rx="6"/>
  <text class="t-sub-gray" x="530" y="383" text-anchor="middle" dominant-baseline="central">Team</text>

  <rect class="box-gray-inner" x="474" y="408" width="112" height="34" rx="6"/>
  <text class="t-sub-gray" x="530" y="425" text-anchor="middle" dominant-baseline="central">Billing</text>

  <!-- Route labels -->
  <text class="t-sub" x="60" y="200">/auth/*</text>
  <line class="leader" x1="95" y1="192" x2="100" y2="158"/>
  <text class="t-sub" x="60" y="230">/bots</text>
  <line class="leader" x1="85" y1="222" x2="250" y2="158"/>
  <text class="t-sub" x="60" y="260">/account/*</text>
  <line class="leader" x1="120" y1="252" x2="400" y2="158"/>
  <text class="t-sub" x="60" y="310">/workspace/:id/*</text>
  <line class="leader" x1="140" y1="302" x2="308" y2="302"/>
</svg>

---

## 1.3 Lazy Loading Strategy

Every module under `/workspace/:id` is a lazy-loaded NgModule (Angular 14/15 style). This is critical because each module is heavy and users typically use only 1-2 modules per session.

```typescript
// app-routing.module.ts (simplified)
const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule),
  },
  {
    path: 'bots',
    canActivate: [AuthGuard],
    loadChildren: () => import('./bots/bots.module').then(m => m.BotsModule),
  },
  {
    path: 'account',
    canActivate: [AuthGuard],
    loadChildren: () => import('./account/account.module').then(m => m.AccountModule),
  },
  {
    path: 'workspace/:id',
    canActivate: [AuthGuard, WorkspaceMemberGuard],
    resolve: { botContext: WorkspaceContextResolver },
    loadChildren: () => import('./workspace-shell/workspace-shell.module').then(m => m.WorkspaceShellModule),
  },
  { path: '', redirectTo: 'bots', pathMatch: 'full' },
  { path: '**', redirectTo: 'bots' },
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
        path: 'playground',
        loadChildren: () => import('../modules/playground/playground.module').then(m => m.PlaygroundModule),
      },
      {
        path: 'analytics',
        canActivate: [FeatureGuard('analytics')],
        loadChildren: () => import('../modules/analytics/analytics.module').then(m => m.AnalyticsModule),
      },
      {
        path: 'inbox',
        loadChildren: () => import('../modules/inbox/inbox.module').then(m => m.InboxModule),
      },
      {
        path: 'activity',
        canActivate: [FeatureGuard('activityTracker')],
        loadChildren: () => import('../modules/activity/activity.module').then(m => m.ActivityModule),
      },
      {
        path: 'settings',
        loadChildren: () => import('../modules/settings/settings.module').then(m => m.SettingsModule),
      },
    ],
  },
];
```

---

## 1.4 Role-Based Landing

The `WorkspaceLandingGuard` redirects the user to the appropriate module based on their role for the current workspace.

```
Role Resolution Flow:
  1. WorkspaceContextResolver fetches workspace details + user's role for this workspace
  2. WorkspaceLandingGuard reads the resolved role
  3. Applies role-to-module mapping:
       agent     --> /inbox
       analyst   --> /analytics
       admin     --> /playground
       owner     --> /playground
  4. Issues a router.navigate() redirect
  5. No module chunk is downloaded until after the redirect
```

The mapping should be configurable, not hardcoded. Store it in a constant or derive from a config endpoint so it can change without code modifications.

---

## 1.5 Guards Layered by Boundary

```
Route Level              Guards Applied
----------------------------------------------------
/bots                    AuthGuard
/account                 AuthGuard
/workspace/:id              AuthGuard, WorkspaceMemberGuard
/workspace/:id (empty)      WorkspaceLandingGuard
/workspace/:id/analytics    FeatureGuard('analytics')
/workspace/:id/activity     FeatureGuard('activityTracker')
/workspace/:id/settings     FeatureGuard('settings')
/workspace/:id/settings/*   FeatureGuard per section (e.g., FeatureGuard('billing'))
```

FeatureGuard is the single access-control mechanism for modules. It checks brand-level feature availability and the user's permission for that feature within the current workspace context. No separate RoleGuard exists.

### Diagram: Guard Decision Flow

<svg width="100%" viewBox="0 0 680 560" xmlns="http://www.w3.org/2000/svg" style="max-width:680px;font-family:system-ui,sans-serif">
  <style>
    .box-gray { fill: #F1EFE8; stroke: #888780; stroke-width: 0.5; }
    .box-purple { fill: #EEEDFE; stroke: #534AB7; stroke-width: 0.5; }
    .box-amber { fill: #FAEEDA; stroke: #854F0B; stroke-width: 0.5; }
    .box-teal { fill: #E1F5EE; stroke: #0F6E56; stroke-width: 0.5; }
    .box-blue { fill: #E6F1FB; stroke: #185FA5; stroke-width: 0.5; }
    .box-red { fill: #FCEBEB; stroke: #A32D2D; stroke-width: 0.5; }
    .t-title { font-size: 14px; font-weight: 500; fill: #2C2C2A; }
    .t-sub { font-size: 12px; fill: #5F5E5A; }
    .t-title-purple { font-size: 14px; font-weight: 500; fill: #3C3489; }
    .t-sub-purple { font-size: 12px; fill: #534AB7; }
    .t-title-amber { font-size: 14px; font-weight: 500; fill: #633806; }
    .t-sub-amber { font-size: 12px; fill: #854F0B; }
    .t-title-teal { font-size: 14px; font-weight: 500; fill: #085041; }
    .t-sub-teal { font-size: 12px; fill: #0F6E56; }
    .t-title-blue { font-size: 14px; font-weight: 500; fill: #0C447C; }
    .t-sub-blue { font-size: 12px; fill: #185FA5; }
    .t-title-red { font-size: 14px; font-weight: 500; fill: #791F1F; }
    .arr { stroke: #888780; stroke-width: 1.5; }
    .leader { stroke: #B4B2A9; stroke-width: 0.5; stroke-dasharray: 4 3; fill: none; }
  </style>
  <defs><marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>

  <rect class="box-gray" x="240" y="30" width="200" height="44" rx="8"/>
  <text class="t-title" x="340" y="52" text-anchor="middle" dominant-baseline="central">Navigation triggered</text>
  <line class="arr" x1="340" y1="74" x2="340" y2="106" marker-end="url(#a)"/>

  <rect class="box-purple" x="240" y="108" width="200" height="56" rx="8"/>
  <text class="t-title-purple" x="340" y="128" text-anchor="middle" dominant-baseline="central">AuthGuard</text>
  <text class="t-sub-purple" x="340" y="146" text-anchor="middle" dominant-baseline="central">Token valid?</text>
  <line class="arr" x1="240" y1="136" x2="130" y2="136" marker-end="url(#a)"/>
  <rect class="box-red" x="50" y="114" width="80" height="44" rx="8"/>
  <text class="t-title-red" x="90" y="136" text-anchor="middle" dominant-baseline="central">/auth</text>
  <text class="t-sub" x="185" y="128">No</text>
  <line class="arr" x1="340" y1="164" x2="340" y2="196" marker-end="url(#a)"/>
  <text class="t-sub" x="354" y="184">Yes</text>

  <rect class="box-purple" x="240" y="198" width="200" height="56" rx="8"/>
  <text class="t-title-purple" x="340" y="218" text-anchor="middle" dominant-baseline="central">WorkspaceMemberGuard</text>
  <text class="t-sub-purple" x="340" y="236" text-anchor="middle" dominant-baseline="central">User in this workspace?</text>
  <line class="arr" x1="240" y1="226" x2="130" y2="226" marker-end="url(#a)"/>
  <rect class="box-red" x="50" y="204" width="80" height="44" rx="8"/>
  <text class="t-title-red" x="90" y="226" text-anchor="middle" dominant-baseline="central">/bots</text>
  <text class="t-sub" x="185" y="218">No</text>
  <line class="arr" x1="340" y1="254" x2="340" y2="286" marker-end="url(#a)"/>
  <text class="t-sub" x="354" y="274">Yes</text>

  <rect class="box-amber" x="240" y="288" width="200" height="56" rx="8"/>
  <text class="t-title-amber" x="340" y="308" text-anchor="middle" dominant-baseline="central">WorkspaceLandingGuard</text>
  <text class="t-sub-amber" x="340" y="326" text-anchor="middle" dominant-baseline="central">Resolve by role</text>
  <line class="arr" x1="440" y1="316" x2="490" y2="316" marker-end="url(#a)"/>
  <rect class="box-amber" x="492" y="288" width="150" height="56" rx="8"/>
  <text class="t-sub-amber" x="567" y="308" text-anchor="middle" dominant-baseline="central">agent --> /inbox</text>
  <text class="t-sub-amber" x="567" y="326" text-anchor="middle" dominant-baseline="central">admin --> /playground</text>
  <line class="arr" x1="340" y1="344" x2="340" y2="376" marker-end="url(#a)"/>

  <rect class="box-teal" x="210" y="378" width="260" height="56" rx="8"/>
  <text class="t-title-teal" x="340" y="398" text-anchor="middle" dominant-baseline="central">FeatureGuard</text>
  <text class="t-sub-teal" x="340" y="416" text-anchor="middle" dominant-baseline="central">Brand + subscription allow?</text>
  <line class="arr" x1="210" y1="406" x2="130" y2="406" marker-end="url(#a)"/>
  <rect class="box-red" x="40" y="384" width="90" height="44" rx="8"/>
  <text class="t-title-red" x="85" y="406" text-anchor="middle" dominant-baseline="central">Fallback</text>
  <text class="t-sub" x="165" y="398">No</text>
  <line class="arr" x1="340" y1="434" x2="340" y2="466" marker-end="url(#a)"/>
  <text class="t-sub" x="354" y="454">Yes</text>

  <rect class="box-blue" x="220" y="468" width="240" height="56" rx="8"/>
  <text class="t-title-blue" x="340" y="488" text-anchor="middle" dominant-baseline="central">Lazy load module</text>
  <text class="t-sub-blue" x="340" y="506" text-anchor="middle" dominant-baseline="central">Chunk downloaded</text>

  <text class="t-sub" x="498" y="218" text-anchor="start">Only on /workspace/:id</text>
  <line class="leader" x1="490" y1="218" x2="442" y2="218"/>
</svg>
