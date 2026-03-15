# Migration Plan: Phased Approach

## Guiding Principles

1. **Never stop shipping features.** The migration runs in parallel with product work.
2. **Fix security holes immediately.** Don't wait for the migration to fix bugs that leak data or bypass permissions.
3. **Migrate from the outside in.** Start with the shell and shared infrastructure, then migrate modules one at a time.
4. **Old and new coexist.** Redirect routes let old URLs work while modules migrate incrementally.
5. **One module per sprint.** Each module migration is a self-contained PR that can be reviewed and rolled back independently.

---

## Phase 0: Immediate Fixes (Before Any Migration)

These are security and stability fixes on the current Angular 14 codebase. No architectural changes.

| # | Fix | Severity | Effort |
|---|---|---|---|
| 1 | Fix `ServicesInterceptor.checkEditsRequest()` to actually block viewer writes | Critical | 1 day |
| 2 | Fix `UnsupportedFeaturesGuard` fail-open when botId is null (return `false`, not `true`) | Critical | 1 hour |
| 3 | Add AuthGuard to `/hulul_redirect/:lang` and `/mhcb_redirect` | Critical | 1 hour |
| 4 | Add error handling to `UnsupportedFeaturesGuard` forkJoin (catchError with redirect) | Major | 2 hours |
| 5 | Fix AuthGuard Cognito path (redirect instead of `window.open` + blank page) | Major | 4 hours |
| 6 | Fix `AppResolver` undefined return on missing params | Major | 1 hour |
| 7 | Delete dead code: `AdminGuard`, `NoAuthGuard`, `AuthGuardService`, `RoleGuardService`, `WidebotRoutingModule` | Minor | 2 hours |
| 8 | Wrap APP_INITIALIZER in try/catch — must never reject, use hostname-derived fallback config on error | Critical | 4 hours |
| 9 | Add loading splash screen in `index.html` to prevent FOUC during brand resolution | Major | 2 hours |

*Updated based on review: Added items 8 and 9. Item 8 is critical — if APP_INITIALIZER rejects its promise, Angular never renders and users see a blank page with no error. The initializer must catch all errors and return a fallback config. Item 9 adds a static loading screen in index.html (not Angular-controlled) that is dismissed after theme application, preventing the flash of unstyled/unbranded content.*

**Estimated total: 2-3 sprint days. Ship this before anything else.**

---

## Phase 1: Shell and Infrastructure (2-3 sprints)

Build the new shell structure without touching any feature module internals.

### 1.1 Create WorkspaceShellComponent

A new layout component at `/workspace/:id` that provides:
- Workspace sidenav (built dynamically from feature flags)
- Top bar with workspace selector
- `<router-outlet>` for feature modules
- WorkspaceContextResolver that runs once and caches workspace + role + subscription

All existing feature modules continue to load at their current paths. The shell is added as a new parent route that wraps them.

### 1.2 Create WorkspaceContextResolver

Replaces the 19 redundant `SubscriptionResolverService` calls. Fetches:
- Workspace details
- User's role for this workspace
- Subscription/plan info
- Feature flags for this workspace

Cached in a `WorkspaceContextService` (BehaviorSubject). Only re-fetches when `:id` changes.

*Updated based on review: The resolver MUST include error handling and a timeout (5 seconds). On failure, redirect to `/workspaces` with an error notification rather than silently blocking navigation. Use `switchMap` semantics — if the user rapidly switches workspaces, cancel the pending request for the previous workspace before starting the new one. The resolve key in the route config must be `workspaceContext` (not `botContext` as shown in Doc 01).*

### 1.3 Split the Interceptor

Replace `ServicesInterceptor` with five focused interceptors (registration order matters):
1. `BrandInterceptor` - attaches `x-user-domain` (must be first — needed for brand config fetch itself)
2. `AuthInterceptor` - attaches Bearer token + handles 401 → logout redirect
3. `WorkspaceInterceptor` - attaches `x-workspace` header (from WorkspaceContextService, not session storage)
4. `ErrorInterceptor` - handles 401/403/5xx globally, surfaces user-facing error notifications
5. `RetryInterceptor` (optional) - retries on transient 5xx/network failures with backoff

Fix the viewer write-block as part of this split.

*Updated based on review: Expanded from 3 to 5 interceptors to match Doc 03 §3.1. Added ErrorInterceptor (critical — no global error handling exists currently) and RetryInterceptor. Added a note that registration order is critical and should be tested. Also: ErrorInterceptor should handle 403 on workspace-scoped calls by redirecting to `/workspaces` (covers the "workspace deleted while user is in it" edge case).*

Add a unit test in `CoreModule` that verifies the interceptor registration order matches the expected chain.

### 1.4 Create FeatureGuard and FeatureFlagService

Create `FeatureFlagService` first — a singleton with a simple `isEnabled(flag: string): boolean` API that reads from `BrandConfigService` (brand-level flags) and `WorkspaceContextService` (subscription flags). This hides the two-source complexity from all consumers.

Then create `FeatureGuard` that uses `FeatureFlagService`. For Angular 14/15 compatibility, use the route data pattern: `{ canActivate: [FeatureGuard], data: { feature: 'analytics' } }`. The guard reads `route.data.feature` and calls `featureFlagService.isEnabled()`. Never fails open.

*Updated based on review: The `FeatureGuard('analytics')` syntax shown in Doc 01 is not valid for Angular 14/15 class-based guards. Use the route data pattern now, convert to functional `CanActivateFn` factory during Phase 3 (Angular 16 upgrade). Also: wrap guard logic in try/catch — an unhandled exception in a guard silently blocks navigation.*

### 1.5 Create WorkspaceLandingGuard

Reads user's role from `WorkspaceContextService`, redirects to the appropriate module. This is new functionality (currently everyone lands on `workspace/list`).

### 1.6 Create Route Constants File

A single `route-paths.ts` that defines all path segments as constants. Migrate `router.navigate()` calls to use constants as each module is touched.

### Deliverable: After Phase 1

The app has a new `/workspace/:id` shell wrapping existing feature modules. Old URLs still work via redirects. Workspace context is resolved once. The interceptor chain is clean. Feature flags don't fail open. No feature module internals have changed.

---

## Phase 2: Module-by-Module Migration (1 module per sprint)

Each module is migrated independently in this order (based on risk and dependency):

### Priority Order

| # | Module | Why This Order | Effort |
|---|---|---|---|
| 1 | **Home** (dashboard) | Simplest module (2 components). Good test of the migration pattern. | S |
| 2 | **Logs** (log-manager) | 1 component. Simple. Builds confidence. | S |
| 3 | **Setup** | 1 component. Simple. | S |
| 4 | **Text-to-Speech** | 1 component. Has UnsavedChangesGuard (tests guard migration). | S |
| 5 | **Inbox Activity** | 1 component. Might merge into Inbox later. | S |
| 6 | **Customers** (CRM) | 1 component. Straightforward. | S |
| 7 | **Identity** (identity-manager) | 1 component. Has duplicate guard issue to clean up. | S |
| 8 | **Account Settings** | 1 component today, expand to full account section. | S |
| 9 | **Inbox** (live-chat) | Real-time, SignalR dependency. Critical path. | M |
| 10 | **Analytics** | 15+ components, multiple sub-routes, feature-gated sub-sections. | L |
| 11 | **AI Hub** (QnA) | 10+ components, knowledge base, skills, generative AI. | L |
| 12 | **Campaigns** (broadcast) | 12+ components, multi-step creation flows, channel-specific variants. | L |
| 13 | **Comment Acquisition** | 5+ components, step-based creation. | M |
| 14 | **Marketplace** | 3+ components, own resolvers. | M |
| 15 | **Playground** | Chatbot builder. Complex but self-contained. | L |
| 16 | **Settings** | 26+ components. Largest module. Migrate last because it touches everything. | XL |
| 17 | **Billing/Payment** | Merge payment + subscription-details + billing into unified billing section. | M |

S = Small (1-2 days), M = Medium (3-5 days), L = Large (1 sprint), XL = Extra Large (2 sprints)

### What "Migrate a Module" Means

For each module:

1. Move its route under `/workspace/:id/[module-name]`
2. Remove its own `SubscriptionResolverService` (reads from `WorkspaceContextService` instead)
3. Replace `UnsupportedFeaturesGuard` with `FeatureGuard`
4. Replace hardcoded `router.navigate()` paths with route constants
5. Replace `:id` param reads with `WorkspaceContextService` where appropriate
6. Add redirect from old URL to new URL
7. Clean up unused imports and dead code within the module
8. Update sidenav to include/exclude this module based on feature flags

Do NOT at this point:
- Convert NgModules to standalone (that's Phase 4)
- Convert class-based guards to functional (that's Phase 3)
- Rewrite any component internals
- Change any API contracts

---

## Phase 3: Angular Upgrade (14 to 17+)

After all modules are in the new route structure, upgrade Angular.

### 3.1 Upgrade 14 to 15

- Dependency updates
- No code changes expected
- Adopt `takeUntilDestroyed` / `DestroyRef` pattern for cleaner subscription management in new code
- 1 sprint

### 3.2 Upgrade 15 to 16

- Convert all class-based guards to functional guards (`CanActivateFn`)
- Convert all class-based resolvers to `ResolveFn`
- Convert `FeatureGuard` from route-data pattern to factory function: `featureGuard('analytics')`
- Start writing new components as standalone (note: standalone was available since Angular 14 as opt-in, but Angular 16 makes it the default in `ng generate`)
- 1-2 sprints

### 3.3 Upgrade 16 to 17

- Enable new control flow (`@if`, `@for`, `@defer`) — use the CLI migration schematic: `ng generate @angular/core:control-flow-migration`
- Begin using signals in new code (for simple state holding — keep RxJS for async stream processing like `switchMap`, `debounceTime`)
- Use `@defer` for heavy sub-components within modules
- 2-3 sprints

*Updated based on review: (1) Standalone components were available since Angular 14, not introduced in 16 — corrected the description. (2) Added the control-flow-migration schematic reference. (3) Added nuance on signals vs RxJS — signals replace BehaviorSubjects for simple state, but RxJS is still needed for async stream operations. (4) Moved Nx migration recommendation — see new §3.4 below.*

### 3.4 Nx Migration (Can Start Earlier)

*Updated based on review: The original plan recommended Nx migration during the Angular 17 upgrade. Best practice from the Nx community recommends the opposite — migrate to Nx FIRST (even on Angular 14/15), then upgrade Angular versions separately. Rationale:*

- Nx migration is a tooling change, not a code change. `npx nx init` converts an Angular CLI workspace with minimal disruption.
- Having Nx's `affected` commands and `@nx/enforce-module-boundaries` lint rule during the route migration (Phase 2) is extremely valuable — it catches cross-module import violations automatically.
- Combining Nx migration with Angular version upgrade doubles the risk for no benefit.

**Revised recommendation:** Run `npx nx init` during Phase 1 (sprint 2-3), before module migration begins. This gives the team Nx tooling for the entire migration.

---

## Phase 4: Modernization (Ongoing, No Deadline)

These happen incrementally as modules are touched for feature work:

- Convert NgModules to standalone components (per-module, when touched)
- Replace BehaviorSubjects with signals for simple state holding (per-service, when touched) — keep RxJS for async stream processing
- Replace `[routerLink]` string arrays with typed route helpers
- Eliminate remaining `window.location` usage (40+ files)
- Clean up the 130+ UnsupportedFeatures enum into a structured taxonomy
- Remove old URL redirects (6 months after migration)
- Add a Stylelint rule to flag hardcoded color values (preparation for consistent dark mode support)
- Add global `ErrorHandler` override for uncaught exceptions (client-side error logging)
- Implement custom `PreloadingStrategy` based on user role (e.g., preload inbox for agents, playground for admins)

*Updated based on review: Added 3 items (Stylelint rule, ErrorHandler, PreloadingStrategy) identified as missing from the architecture docs. These are not blockers but are high-value improvements for a mature platform.*

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Old bookmarks break | Redirect routes for all changed URLs. Remove after 6 months. |
| Feature work blocked during migration | One module migrates per sprint. Other teams work on non-migrating modules normally. |
| SignalR breaks during inbox migration | Test SignalR connection lifecycle exhaustively. Keep old inbox route as fallback behind a feature flag. |
| Settings module is too large to migrate safely | Split settings migration into sub-phases: channels first, then team/agents, then billing, then AI settings. |
| 130 feature flags create confusion | Categorize before migrating. Create a feature-flag taxonomy document. Don't touch flag logic during route migration. |
| Team knowledge gap on new architecture | Migrate the simplest modules first (home, logs, setup) so the pattern is well-understood before tackling complex modules. |
| Rapid workspace switching causes race conditions | Use `switchMap` in resolver to cancel pending requests. SignalR `connect()` must fully close any existing connection before opening a new one. |
| Token expiry during SignalR connection | Implement token refresh in `accessTokenFactory`. Handle 401 during reconnection by redirecting to login. |
| Workspace deleted/user removed while user is active | ErrorInterceptor handles 403 on workspace-scoped API calls by redirecting to `/workspaces` with a notification. |
| APP_INITIALIZER failure shows blank page | Initializer must never reject. Wrap in try/catch, use hostname-derived fallback config, log error to monitoring. |
| WorkspaceShellComponent becomes a God Component | Extract SignalR lifecycle to a service triggered by route events. Extract sidenav generation to a SidenavService. Keep the shell as a thin layout component. |

*Updated based on review: Added 5 new risks identified during the architecture review (race conditions, token expiry, workspace deletion, APP_INITIALIZER failure, God Component). These are real risks that could cause production incidents if not addressed.*

---

## Timeline Estimate

| Phase | Duration | Can Ship Features? |
|---|---|---|
| Phase 0: Security fixes | 2-3 days | Yes |
| Phase 1: Shell + infrastructure (includes Nx init) | 3-4 sprints | Yes |
| Phase 2: Module migration (17 modules) | ~12-15 sprints | Yes |
| Phase 3: Angular upgrade (14→15→16→17) | 4-6 sprints | Yes (reduced velocity) |
| Phase 4: Modernization | Ongoing | Yes |

*Updated based on review: Phase 0 expanded from 1-2 days to 2-3 days (added APP_INITIALIZER error handling and FOUC prevention). Phase 1 expanded from 2-3 to 3-4 sprints (added Nx migration, FeatureFlagService, ErrorInterceptor, and interceptor order testing).*

Total estimated time to complete Phases 0-3: **~22-28 sprints (~5.5-7 months)** with a team of 10+ devs where some are dedicated to migration and others continue feature work.

Phase 0 and the security fixes should ship this week.

---

## Changelog

| Change | Section | Reason |
|---|---|---|
| Added Phase 0 items #8 (APP_INITIALIZER error handling) and #9 (FOUC splash screen) | Phase 0 | APP_INITIALIZER rejection causes blank page; FOUC during brand resolution |
| Expanded interceptor split from 3 to 5 interceptors with explicit ordering | Phase 1 §1.3 | ErrorInterceptor and RetryInterceptor were referenced in Doc 03 but missing from the plan |
| Added resolver error handling, timeout, and switchMap guidance | Phase 1 §1.2 | Resolver failure silently blocks navigation; rapid switching causes race conditions |
| Renamed FeatureGuard section to include FeatureFlagService | Phase 1 §1.4 | Guards and components need a unified API; documented Angular 14/15 compatibility pattern |
| Added `takeUntilDestroyed` to Angular 15 upgrade | Phase 3 §3.1 | Useful pattern available from Angular 15 |
| Corrected standalone components timeline (available since Angular 14, not 16) | Phase 3 §3.2 | Factual correction |
| Added control-flow-migration schematic reference | Phase 3 §3.3 | CLI tool that automates template migration |
| Added signals vs RxJS nuance | Phase 3 §3.3 | Signals don't replace RxJS for async streams |
| Moved Nx migration earlier (Phase 1 instead of Phase 3) | Phase 3 §3.4 (new) | Nx tooling is valuable during migration; combining with Angular upgrade doubles risk |
| Added 5 new risks to Risk Mitigation table | Risk Mitigation | Race conditions, token expiry, workspace deletion, APP_INITIALIZER, God Component |
| Added 3 items to Phase 4 (Stylelint, ErrorHandler, PreloadingStrategy) | Phase 4 | Missing from architecture docs, high-value improvements |
| Updated timeline estimates | Timeline | Phase 0 and Phase 1 scope increased |
