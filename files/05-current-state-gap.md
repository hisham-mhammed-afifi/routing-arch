# Current State & Gap

Brief comparison between the current Angular 14 codebase and the target architecture. This is not a migration plan. It identifies what exists, what's missing, and what's broken.

---

## Structural Gap

| Concern | Current | Target |
|---------|---------|--------|
| Workspace context | `:id` param scattered independently in every module. `SubscriptionResolverService` runs on all 19 feature modules separately. | Single `/workspace/:id` parent route. `WorkspaceContextResolver` runs once, caches in `WorkspaceContextService`. |
| Route nesting | Flat. `/live-chat/:id`, `/analytics-center/:id`, `/workspace-settings/:id` are siblings at root layout level. | Nested. All feature routes under `/workspace/:id/`. |
| Layout shells | One: `LayoutComponent` wraps everything after auth. No distinct account or workspace shells. | Four shells + one sub-shell. Auth, App, Account, Workspace, Settings. |
| Landing page | Everyone lands on `workspace/list`. No role-based redirect. | `WorkspaceLandingGuard` redirects agent to inbox, analyst to analytics, admin/owner to home. |
| Feature gating | `UnsupportedFeaturesGuard` with 130+ enum values. Fails open when botId is null. Makes own API calls per navigation. | `FeatureGuard` reads from `WorkspaceContextService`. Structured feature keys. Never fails open. Never makes API calls. |
| Join flow | `/join` has no AuthGuard. | `/join` protected by AuthGuard. Unauthenticated users redirect to login with returnUrl. |

---

## What Already Works

These exist in the current codebase and transfer directly:

- **Lazy loading on all 25 modules.** The pattern is correct, routes just need restructuring.
- **`x-user-domain` header.** Already set by `ServicesInterceptor` via `AppConfig.X_USER_DOMAIN(window.location.host)`.
- **`x-bot` header** for workspace context on API requests.
- **SignalR connection** with `botId` query param and `accessTokenFactory`.
- **Feature gating concept** via `UnsupportedFeaturesGuard` and route `data.feature`.
- **Full i18n/RTL support.**
- **`UnsavedChangesGuard`** (CanDeactivate) on editing routes.

---

## What's Broken (Fix Before Migration)

These are bugs in the current codebase that should be fixed immediately, independent of the architecture migration.

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | `ServicesInterceptor.checkEditsRequest()` returns `EMPTY` but the return value is never used. Viewer-role users can make write API calls. | Critical | `services-interceptor.ts:149-168` |
| 2 | `UnsupportedFeaturesGuard` returns `of(true)` when `botId` is null, allowing access without validation. | Critical | `unsupported-features.guard.ts:32` |
| 3 | `/hulul_redirect/:lang` and `/mhcb_redirect` have no AuthGuard. Accessible by unauthenticated users. | Critical | `layout-routing.module.ts` |
| 4 | `UnsupportedFeaturesGuard` uses `forkJoin` with no error handling. If either API call fails, navigation hangs. | Major | `unsupported-features.guard.ts:35-54` |
| 5 | `AuthGuard` Cognito path calls `window.open()` then returns `of(false)`. User sees a blank page. | Major | `auth.guard.ts:43-44` |
| 6 | `AppResolver` returns `undefined` on missing params. Component crashes. | Major | `app-resolver.service.ts` |
| 7 | `RoleGuardService` imports `decode` from `punycode` instead of a JWT library. Hardcodes `localhost:4200`. | Dead code | `role-guard.service.ts` |

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

## Key Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Lazy-loaded modules | 25 | 22 (auth, join, workspaces, account, callbacks, workspace-shell + 17 feature modules) |
| Guards (active) | 5 (AuthGuard, UnsupportedFeaturesGuard, UnsavedChangesGuard, 2 step validators) | 7 (AuthGuard, WorkspaceMemberGuard, WorkspaceLandingGuard, FeatureGuard, UnsavedChangesGuard, StepValidationGuard, SendEmail2FAGuard) |
| Guards (dead/broken) | 5 | 0 |
| Resolvers making API calls per navigation | 19 (SubscriptionResolverService on every module) | 1 (WorkspaceContextResolver on workspace entry) |
| Feature flag system | 130+ flat enum values, guard makes own API calls | Structured keys, guard reads from cached service |
| Route constants | None. 164+ files with hardcoded strings. | Centralized route-paths.ts (recommended, not architecturally required) |
| Role-based landing | None | WorkspaceLandingGuard with configurable role-to-module mapping |
