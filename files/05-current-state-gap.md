# Current State & Gap

Comparison between the current Angular 14 single-project codebase and the target Angular 21 Nx monorepo with webpack Module Federation. This is not a migration plan. It identifies what exists, what's missing, and what's broken.

---

## Structural Gap

| Concern | Current (Angular 14, single project) | Target (Angular 21, Nx + MF) |
|---------|--------------------------------------|------------------------------|
| Project structure | Single Angular CLI project, one `angular.json` | Nx monorepo: 18 apps (1 shell + 17 remotes) + 8 shared libraries |
| Build system | Angular CLI (`ng build --prod`), single artifact | Nx with webpack: `nx affected:build`, independent artifacts per remote |
| Module system | NgModules (`@NgModule`, `loadChildren` with module imports) | Standalone components, `loadChildren` with `loadRemoteModule` for remotes |
| Deployment | One build, one deploy | Independent deploy per remote. Shell and remotes versioned separately. |
| Workspace context | `:id` param scattered in every module. `SubscriptionResolverService` runs on all 19 modules separately. | Single `workspaceContextResolver` at `/workspace/:id`. `WorkspaceContextService` shared as MF singleton across all remotes. |
| Route nesting | Flat. `/live-chat/:id`, `/analytics-center/:id`, `/workspace-settings/:id` are siblings. | Nested. All feature routes under `/workspace/:id/`. Remotes load into workspace shell's `<router-outlet>`. |
| Layout shells | One: `LayoutComponent` wraps everything after auth. | Four shells + one sub-shell (Auth, App, Account, Workspace, Settings). All in the shell app. |
| Landing page | Everyone lands on `workspace/list`. No role-based redirect. | `workspaceLandingGuard` redirects agent → inbox, analyst → analytics, admin/owner → home. |
| Feature gating | `UnsupportedFeaturesGuard` with 130+ enum values. Fails open when botId is null. Makes own API calls. | `featureGuard` reads from `WorkspaceContextService` (shared singleton). Never fails open. Never makes API calls. |
| Guards | Class-based (`implements CanActivate`), 5 active + 5 dead/broken | Functional (`CanActivateFn`), 7 active, 0 dead |
| State management | BehaviorSubjects / RxJS services | Angular signals (`signal`, `computed`, `effect`, `resource`) |
| Change detection | zone.js + default strategy | Zoneless (`provideZonelessChangeDetection()`) + OnPush |
| Test runner | Karma + Jasmine | Vitest |
| Module boundaries | None enforced. Feature modules can import each other. | Nx `@nx/enforce-module-boundaries` lint rule. Remotes cannot import other remotes. |
| Shared code | `SharedModule` (NgModule), `CoreModule` (NgModule) | `libs/shared/*` (8 libraries), shared via MF singleton config |
| Join flow | `/join` has no AuthGuard. | `/join` protected by `authGuard`. Unauthenticated users redirect to login with returnUrl. |

---

## What Already Works

These exist in the current codebase and transfer to the new architecture:

- **Lazy loading on all 25 modules.** The concept is correct. In the new architecture, lazy loading becomes MF remote loading -- same user experience, different mechanism.
- **`x-user-domain` header.** Already set by `ServicesInterceptor`. Will move to a functional `brandInterceptor`.
- **`x-bot` header** for workspace context on API requests. In the new architecture, workspace ID comes from `WorkspaceContextService` (shared singleton), not an interceptor.
- **SignalR connection** with `botId` query param and `accessTokenFactory`. Moves to `@pwa/signalr` shared library.
- **Feature gating concept** via `UnsupportedFeaturesGuard` and route `data.feature`. Evolves into `featureGuard` (functional) reading from `WorkspaceContextService`.
- **Full i18n/RTL support.** Transfers directly.
- **`UnsavedChangesGuard`** (CanDeactivate) on editing routes. Converts to `unsavedChangesGuard` (`CanDeactivateFn`).
- **Custom design system components.** Move to `libs/shared/ui`.

---

## What's Broken (Fix Before Migration)

These are bugs in the current codebase that should be fixed immediately, independent of the architecture migration.

| # | Issue | Severity | Priority | Effort | Location | Verification |
|---|-------|----------|----------|--------|----------|--------------|
| 1 | `ServicesInterceptor.checkEditsRequest()` returns `EMPTY` but return value is never used. Viewer-role users can make write API calls. | Critical | P0 | 4h | `services-interceptor.ts:149-168` | Log in as viewer, attempt POST/PUT/DELETE, verify 403 response |
| 2 | `UnsupportedFeaturesGuard` returns `of(true)` when `botId` is null, allowing access without validation. | Critical | P0 | 2h | `unsupported-features.guard.ts:32` | Navigate to a gated feature with null botId, verify redirect to home |
| 3 | `/hulul_redirect/:lang` and `/mhcb_redirect` have no AuthGuard. Accessible by unauthenticated users. | Critical | P0 | 1h | `layout-routing.module.ts` | Access redirect URLs while logged out, verify redirect to login |
| 4 | `UnsupportedFeaturesGuard` uses `forkJoin` with no error handling. If either API call fails, navigation hangs. | Major | P1 | 3h | `unsupported-features.guard.ts:35-54` | Kill the API during navigation, verify timeout/error handling |
| 5 | `AuthGuard` Cognito path calls `window.open()` then returns `of(false)`. User sees a blank page. | Major | P1 | 4h | `auth.guard.ts:43-44` | Trigger Cognito auth path, verify user sees login page not blank |
| 6 | `AppResolver` returns `undefined` on missing params. Component crashes. | Major | P1 | 2h | `app-resolver.service.ts` | Navigate with missing params, verify graceful error handling |
| 7 | `RoleGuardService` imports `decode` from `punycode` instead of a JWT library. Hardcodes `localhost:4200`. | Dead code | P2 | 1h | `role-guard.service.ts` | Delete file, run full test suite, verify no references |

### Remediation Order

**Phase 1: Security fixes (Week 1)**
1. Fix #1 (viewer write access) -- Critical security hole, 4h
2. Fix #2 (guard fails open) -- Critical access control, 2h
3. Fix #3 (missing AuthGuard) -- Critical auth bypass, 1h

Total: 7h

**Phase 2: Stability fixes (Week 2)**
4. Fix #4 (forkJoin error handling) -- Prevents navigation hangs, 3h
5. Fix #5 (Cognito blank page) -- UX issue on auth, 4h
6. Fix #6 (AppResolver crash) -- Prevents component crashes, 2h

Total: 9h

**Phase 3: Cleanup (anytime)**
7. Fix #7 + delete dead code files -- Clean up tech debt, 2h

Total: 2h

**Grand total: ~18h of developer time**

---

## What's Dead (Delete)

| File | Reason |
|------|--------|
| `admin.guard.ts` | Stub. Always returns `true`. Not referenced in any route. |
| `no-auth.guard.ts` | Stub. Always returns `true`. Not referenced in any route. |
| `auth-guard.service.ts` | Legacy duplicate of `AuthGuard` with less functionality. |
| `role-guard.service.ts` | Broken. Uses wrong library. Hardcodes localhost. Not referenced. |
| `widebot-routing.module.ts` | Empty routing module. Defines no routes. |

---

## Angular Version Gap (14 → 21)

| Concern | Angular 14 (current) | Angular 21 (target) |
|---------|---------------------|---------------------|
| Components | NgModules required (`@NgModule`, `declarations`, `imports`) | Standalone by default (`standalone: true` is implicit) |
| Guards | Class-based (`@Injectable`, `implements CanActivate`) | Functional (`CanActivateFn`, `inject()`) |
| Resolvers | Class-based (`implements Resolve<T>`) | Functional (`ResolveFn<T>`, `inject()`) |
| Interceptors | Class-based (`implements HttpInterceptor`, `HTTP_INTERCEPTORS` token) | Functional (`HttpInterceptorFn`, `provideHttpClient(withInterceptors([...]))`) |
| State | BehaviorSubject / RxJS | Signals: `signal()`, `computed()`, `effect()`, `linkedSignal()`, `resource()` |
| Change detection | zone.js + `ChangeDetectionStrategy.Default` | Zoneless (`provideZonelessChangeDetection()`), OnPush default |
| App initialization | `APP_INITIALIZER` (deprecated since v19) | `provideAppInitializer()` |
| Template syntax | `*ngIf`, `*ngFor`, `*ngSwitch` | `@if`, `@for`, `@switch`, `@defer` |
| Router config | `RouterModule.forRoot()`, `RouterModule.forChild()` | `provideRouter(routes)`, standalone route configs |
| Testing | Karma + Jasmine (deprecated) | Vitest (default since v21) |
| DI in functions | Not possible (must use class constructors) | `inject()` works in guards, resolvers, interceptors, and any injection context |

### Migration Path

```
14 → 15    Dependency updates. No routing changes.
15 → 16    Standalone components available. Class guards deprecated.
           Start writing new components as standalone.
           Convert class guards to CanActivateFn with inject().
16 → 17    New control flow (@if, @for). @defer available.
           Signals stabilize (signal, computed).
17 → 18    Zoneless available (experimental). effect() stabilizes.
18 → 19    provideAppInitializer replaces APP_INITIALIZER.
           linkedSignal() and resource() introduced.
19 → 20    Zoneless stable. All signal APIs stable.
20 → 21    Zoneless default. Vitest default. Signal Forms (experimental).
```

**Migration rule:** Upgrade one major version at a time. Run `ng update` at each step. Fix deprecation warnings before proceeding. Do not skip versions.

---

## Nx Migration Gap (Single Project → Monorepo)

| Concern | Current | Target | Effort |
|---------|---------|--------|--------|
| Project structure | Single `angular.json` with one project | Nx workspace: `nx.json`, 18 `project.json` files | High (2-3 days for initial scaffold) |
| Feature modules | 17 NgModules under `src/app/modules/` | 17 Nx applications under `apps/` | High (1-2 days per module to extract) |
| Shared code | `CoreModule` + `SharedModule` (NgModules) | 8 libraries under `libs/shared/` | Medium (3-4 days to extract and split) |
| Routing modules | `*-routing.module.ts` per feature | `entry.routes.ts` per remote, shell `app.routes.ts` | Medium (1 day per module) |
| Build config | Single `angular.json` build target | Per-app `project.json` with webpack executor | Medium (2-3 days) |
| CI pipeline | `ng build`, `ng test` | `nx affected:build`, `nx affected:test`, remote caching | Medium (2-3 days) |
| Linting | Project-wide ESLint | Nx module boundary rules (`@nx/enforce-module-boundaries`) | Low (1 day) |
| Package management | Single `package.json` | Single `package.json` (Nx monorepo, not polyrepo) | None |

---

## Module Federation Gap (Lazy Loading → Federated Remotes)

| Concern | Current | Target | Effort |
|---------|---------|--------|--------|
| Module loading | `loadChildren: () => import('./module').then(m => m.Module)` | `loadChildren: () => loadRemoteModule('name', './Routes').then(r => r.remoteRoutes)` | Low per module (route config change) |
| Build output | One bundle, code-split by lazy routes | 18 independent bundles, each with `remoteEntry.js` | Handled by Nx MF generators |
| Shared dependencies | Implicit (bundled once by CLI) | Explicit MF `shared` config (singletons, strict versioning) | Medium (initial setup, then automatic via Nx) |
| Remote entry points | N/A | Each remote exposes `./Routes` from `entry.routes.ts` | Low per remote (scaffold via `nx g @nx/angular:remote`) |
| Dev server | `ng serve` (one app) | `nx serve shell` (starts shell + all remotes) or `nx serve shell --devRemotes=inbox` (shell + specific remotes) | Handled by Nx |
| Deploy | One artifact to CDN/server | Per-remote artifacts + `module-federation.manifest.json` | Medium (CDN config, manifest management) |
| Fallback on remote failure | N/A (all in one bundle) | `loadRemoteModule(...).catch()` → fallback component | Low (one pattern, applied to all routes) |

---

## Key Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Nx applications | 1 (single Angular CLI project) | 18 (1 shell + 17 remotes) |
| Nx shared libraries | 0 | 8 (`ui`, `auth`, `workspace-context`, `brand`, `signalr`, `models`, `data-access`, `utils`) |
| Guards (active) | 5 (class-based) | 7 (functional `CanActivateFn`) |
| Guards (dead/broken) | 5 | 0 |
| Resolvers making API calls per navigation | 19 (`SubscriptionResolverService` on every module) | 1 (`workspaceContextResolver` on workspace entry, shared via MF) |
| Feature flag system | 130+ flat enum values, guard makes own API calls | Structured keys, `featureGuard` reads from shared `WorkspaceContextService` |
| Independent deployments | 0 (monolith build) | 18 (each remote deploys independently) |
| Angular version | 14 | 21 |
| Change detection | zone.js | Zoneless |
| Test runner | Karma + Jasmine | Vitest |
| State pattern | BehaviorSubject | Signals |
| Module system | NgModules | Standalone components |
| Estimated migration effort | N/A | ~8-10 sprints (2-week sprints) with 2 dedicated devs |

---

## Migration Readiness Checklist

Before starting the architecture migration, the team must verify every item below:

```
Pre-migration (fix on current codebase):
[ ] All P0 bugs fixed and verified
[ ] All P1 bugs fixed and verified
[ ] Dead code files deleted

Nx scaffold:
[ ] Nx workspace initialized (nx init or create-nx-workspace)
[ ] Shell app created (nx g @nx/angular:host shell)
[ ] 8 shared libraries created under libs/shared/
[ ] Module boundary lint rules configured
[ ] CI pipeline updated for nx affected

Angular upgrade (before MF):
[ ] Angular upgraded from 14 → 21 (one version at a time)
[ ] All components converted to standalone
[ ] All guards converted to functional (CanActivateFn)
[ ] All resolvers converted to functional (ResolveFn)
[ ] All interceptors converted to functional (HttpInterceptorFn)
[ ] State migrated from BehaviorSubjects to signals
[ ] zone.js removed, provideZonelessChangeDetection() added
[ ] Karma replaced with Vitest

Module Federation:
[ ] First remote extracted as proof of concept (recommend: home -- smallest, no SignalR)
[ ] loadRemoteModule working in shell route config
[ ] module-federation.manifest.json serving correct URLs
[ ] Shared dependencies verified as singletons (strictVersion: true)
[ ] Fallback component renders on remote load failure
[ ] WorkspaceContextService confirmed as shared singleton across shell and remote
[ ] 16 remaining remotes extracted

Verification:
[ ] All guards tested (unit + integration)
[ ] Role-based landing works (agent → inbox, admin → home)
[ ] Feature gating works (disabled feature → redirect to home)
[ ] SignalR connects/disconnects on workspace enter/leave
[ ] Brand resolution works for all 3 brands
[ ] On-prem manifest works with local paths
[ ] Playwright e2e suite passes
```
