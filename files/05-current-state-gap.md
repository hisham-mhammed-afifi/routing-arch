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
1. Fix #1 (viewer write access) — Critical security hole, 4h
2. Fix #2 (guard fails open) — Critical access control, 2h
3. Fix #3 (missing AuthGuard) — Critical auth bypass, 1h

Total: 7h

**Phase 2: Stability fixes (Week 2)**
4. Fix #4 (forkJoin error handling) — Prevents navigation hangs, 3h
5. Fix #5 (Cognito blank page) — UX issue on auth, 4h
6. Fix #6 (AppResolver crash) — Prevents component crashes, 2h

Total: 9h

**Phase 3: Cleanup (anytime)**
7. Fix #7 + delete dead code files — Clean up tech debt, 2h

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
| Estimated migration effort | N/A | ~3-4 sprints (2-week sprints) with 2 dedicated devs |

---

## Migration Readiness Checklist

Before starting the architecture migration, the team must verify every item below:

```
Pre-migration checklist:
[ ] All P0 bugs fixed and verified
[ ] All P1 bugs fixed and verified
[ ] Dead code files deleted
[ ] WorkspaceContextService created (can coexist with current code)
[ ] FeatureGuard created (can run alongside UnsupportedFeaturesGuard during transition)
[ ] Brand config caching implemented (localStorage with 15-min TTL)
[ ] Route constants file created (route-paths.ts)
[ ] Team has read all 6 architecture documents
[ ] At least one feature module migrated as proof of concept
```
