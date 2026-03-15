# 04. Module Architecture

## 4.1 Module Boundary Rules

With 10+ devs across multiple squads, clear boundaries prevent coupling:

```
SharedModule (shared/)
  - Dumb/presentational components (buttons, modals, tables)
  - Pipes, directives
  - NO services, NO state
  - Every module can import this

CoreModule (core/)
  - Singleton services (AuthService, BrandConfigService, SignalRService)
  - Interceptors, guards, resolvers
  - Imported ONCE in AppModule

Feature Modules (modules/*)
  - playground/
  - analytics/
  - inbox/
  - activity/
  - settings/
  - Each is self-contained with its own:
      - Components
      - Services
      - State (BehaviorSubjects scoped to this module)
      - Routing module
  - Feature modules NEVER import each other
  - Cross-module communication goes through CoreModule services
```

### Diagram: Module Dependencies

<svg width="100%" viewBox="0 0 680 520" xmlns="http://www.w3.org/2000/svg" style="max-width:680px;font-family:system-ui,sans-serif">
  <style>
    .box-purple { fill: #EEEDFE; stroke: #534AB7; stroke-width: 0.5; }
    .box-teal { fill: #E1F5EE; stroke: #0F6E56; stroke-width: 0.5; }
    .box-blue { fill: #E6F1FB; stroke: #185FA5; stroke-width: 0.5; }
    .box-gray { fill: #F1EFE8; stroke: #888780; stroke-width: 0.5; }
    .th { font-size: 14px; font-weight: 500; }
    .ts { font-size: 12px; }
    .th-purple { fill: #3C3489; } .ts-purple { fill: #534AB7; }
    .th-teal { fill: #085041; } .ts-teal { fill: #0F6E56; }
    .th-blue { fill: #0C447C; } .ts-blue { fill: #185FA5; }
    .th-gray { fill: #444441; } .ts-gray { fill: #5F5E5A; }
    .arr { stroke: #888780; stroke-width: 1.5; }
    .arr-light { stroke: #B4B2A9; stroke-width: 0.5; }
    .leader { stroke: #B4B2A9; stroke-width: 0.5; stroke-dasharray: 4 3; fill: none; }
  </style>
  <defs><marker id="a3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>

  <rect class="box-purple" x="210" y="30" width="260" height="80" rx="12"/>
  <text class="th th-purple" x="340" y="58" text-anchor="middle">CoreModule</text>
  <text class="ts ts-purple" x="340" y="78" text-anchor="middle">Services, guards, interceptors</text>

  <rect class="box-teal" x="210" y="140" width="260" height="80" rx="12"/>
  <text class="th th-teal" x="340" y="168" text-anchor="middle">SharedModule</text>
  <text class="ts ts-teal" x="340" y="188" text-anchor="middle">Components, pipes, directives</text>

  <rect class="box-gray" x="40" y="280" width="600" height="220" rx="16" stroke-dasharray="4 3"/>
  <text class="th th-gray" x="340" y="306" text-anchor="middle">Feature modules (lazy loaded)</text>

  <rect class="box-blue" x="70" y="326" width="110" height="56" rx="8"/>
  <text class="th th-blue" x="125" y="346" text-anchor="middle" dominant-baseline="central">Playground</text>
  <text class="ts ts-blue" x="125" y="364" text-anchor="middle" dominant-baseline="central">Own state</text>

  <rect class="box-blue" x="200" y="326" width="110" height="56" rx="8"/>
  <text class="th th-blue" x="255" y="346" text-anchor="middle" dominant-baseline="central">Inbox</text>
  <text class="ts ts-blue" x="255" y="364" text-anchor="middle" dominant-baseline="central">Own state</text>

  <rect class="box-blue" x="330" y="326" width="110" height="56" rx="8"/>
  <text class="th th-blue" x="385" y="346" text-anchor="middle" dominant-baseline="central">Analytics</text>
  <text class="ts ts-blue" x="385" y="364" text-anchor="middle" dominant-baseline="central">Own state</text>

  <rect class="box-blue" x="460" y="326" width="110" height="56" rx="8"/>
  <text class="th th-blue" x="515" y="346" text-anchor="middle" dominant-baseline="central">Settings</text>
  <text class="ts ts-blue" x="515" y="364" text-anchor="middle" dominant-baseline="central">Own state</text>

  <line class="arr" x1="340" y1="110" x2="340" y2="138" marker-end="url(#a3)"/>
  <line class="arr-light" x1="260" y1="220" x2="125" y2="324" marker-end="url(#a3)"/>
  <line class="arr-light" x1="300" y1="220" x2="255" y2="324" marker-end="url(#a3)"/>
  <line class="arr-light" x1="380" y1="220" x2="385" y2="324" marker-end="url(#a3)"/>
  <line class="arr-light" x1="420" y1="220" x2="515" y2="324" marker-end="url(#a3)"/>

  <!-- X marks between modules -->
  <line x1="186" y1="348" x2="194" y2="360" stroke="#E24B4A" stroke-width="1.5"/>
  <line x1="194" y1="348" x2="186" y2="360" stroke="#E24B4A" stroke-width="1.5"/>
  <line x1="316" y1="348" x2="324" y2="360" stroke="#E24B4A" stroke-width="1.5"/>
  <line x1="324" y1="348" x2="316" y2="360" stroke="#E24B4A" stroke-width="1.5"/>
  <line x1="446" y1="348" x2="454" y2="360" stroke="#E24B4A" stroke-width="1.5"/>
  <line x1="454" y1="348" x2="446" y2="360" stroke="#E24B4A" stroke-width="1.5"/>

  <text class="ts" x="340" y="420" text-anchor="middle" fill="#A32D2D">Feature modules never import each other</text>

  <rect class="box-gray" x="120" y="448" width="440" height="40" rx="8"/>
  <text class="ts ts-gray" x="340" y="472" text-anchor="middle">Cross-module: CoreModule services or router navigation</text>
  <line class="arr" x1="340" y1="432" x2="340" y2="446" marker-end="url(#a3)"/>

  <text class="ts ts-gray" x="508" y="60" text-anchor="start">Imported once</text>
  <text class="ts ts-gray" x="508" y="76" text-anchor="start">in AppModule</text>
  <line class="leader" x1="502" y1="66" x2="472" y2="66"/>
  <text class="ts ts-gray" x="508" y="170" text-anchor="start">Imported by</text>
  <text class="ts ts-gray" x="508" y="186" text-anchor="start">every module</text>
  <line class="leader" x1="502" y1="176" x2="472" y2="176"/>
</svg>

---

## 4.2 Folder Structure

```
src/app/
  core/
    services/
      auth.service.ts
      brand-config.service.ts
      signalr.service.ts
      workspace-context.service.ts         # current workspace + user role
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
    resolvers/
      workspace-context.resolver.ts
    models/
      brand-config.model.ts
      user.model.ts
      workspace.model.ts
    core.module.ts

  shared/
    components/
      button/
      modal/
      table/
      sidenav/
      avatar/
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
    playground/
      components/
      services/
      playground-routing.module.ts
      playground.module.ts
    analytics/
      ...
    inbox/
      components/
      services/
      state/
        inbox.state.ts              # BehaviorSubjects for inbox
      inbox-routing.module.ts
      inbox.module.ts
    activity/
      ...
    settings/
      sections/
        general/
        team/
        integrations/
        billing/
      settings-routing.module.ts
      settings.module.ts

  auth/
    pages/
      login/
      register/
      forgot-password/
      verify-email/
    services/
    auth-routing.module.ts
    auth.module.ts

  bots/
    components/
      workspace-list/
      create-workspace/
    bots.module.ts

  account/
    pages/
      profile/
      security/
      notifications/
      plans/
    account-routing.module.ts
    account.module.ts
```

---

## 4.3 Cross-Module Communication

Modules must never import each other. When Module A needs to trigger something in Module B:

```
Pattern 1: Shared state in CoreModule
  - WorkspaceContextService holds current workspace, role, subscription
  - Any module can read/subscribe to it
  - Only guards and resolvers write to it

Pattern 2: Router navigation
  - Module A navigates to Module B's route
  - Data passed via route params, query params, or resolver

Pattern 3: Event bus (use sparingly)
  - A CoreModule EventBusService with typed events
  - Example: inbox receives a message that should update a notification badge
  - Prefer this over tight coupling, but audit usage regularly
```
