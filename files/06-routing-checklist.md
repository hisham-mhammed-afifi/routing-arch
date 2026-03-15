# Routing Checklist

Single-page PR checklist. Use the relevant section when making routing changes. Every item should be verified before merge.

---

## New Feature Module

When adding a new lazy-loaded feature module under `/workspace/:id`:

- [ ] Module folder created under `src/app/modules/<name>/`
- [ ] Module has its own `<name>.module.ts` and `<name>-routing.module.ts`
- [ ] Root component created and declared in the module
- [ ] Route registered in `workspace-shell-routing.module.ts`
- [ ] `canActivate: [FeatureGuard]` applied on the route
- [ ] `data: { feature: '<featureKey>' }` set on the route
- [ ] Feature key added to backend brand config and subscription config
- [ ] Sidenav entry added (reads from `WorkspaceContextService.hasFeature()`)
- [ ] Module does NOT import any other feature module
- [ ] Module-scoped state service uses `@Injectable()` (not `providedIn: 'root'`)
- [ ] Module-scoped state service is listed in module's `providers` array
- [ ] API service injects `WorkspaceContextService` for workspace ID
- [ ] `loadChildren` uses dynamic import syntax
- [ ] Preload flag set in route data if module is high-frequency
- [ ] Module reference added to `03-module-reference.md`
- [ ] Feature key documented in module reference

---

## New Route (within existing module)

When adding a route to an existing feature module:

- [ ] Route added to the module's routing file (not the parent shell)
- [ ] If feature-gated: `canActivate: [FeatureGuard]` with `data: { feature: '<key>' }`
- [ ] If editing state: `canDeactivate: [UnsavedChangesGuard]`
- [ ] If step-based flow: `StepValidationGuard` with valid step range
- [ ] Route path uses kebab-case
- [ ] Dynamic params use descriptive names (`:broadcastId` not `:id`)
- [ ] Component is declared in the same module
- [ ] No hardcoded route strings in component — use route constants or relative navigation
- [ ] Route accessible via direct URL (deep-link tested)

---

## New Guard

When creating a new guard:

- [ ] **Stop.** Can you use `FeatureGuard` with a new feature key instead? (Almost always yes)
- [ ] If truly new guard needed: placed in `src/app/core/guards/`
- [ ] Guard returns `UrlTree` for redirects (not `Router.navigate()` + `false`)
- [ ] Guard handles errors internally (never throws unhandled)
- [ ] Guard does not make API calls (reads from cached services)
- [ ] Unit tests cover: allow path, deny path, redirect URL correctness
- [ ] Guard registered in route config with correct placement in guard array
- [ ] Guard documented in `02-route-architecture.md` guard inventory table

---

## New Feature Flag

When adding a new feature flag for gating:

- [ ] Feature key follows camelCase convention (e.g., `qualityManagement`, `smsChannel`)
- [ ] Key added to backend brand config API response
- [ ] Key added to backend subscription config API response
- [ ] `FeatureGuard` used on the route with `data: { feature: '<key>' }`
- [ ] Sidenav hides the entry when feature is disabled
- [ ] Direct URL access redirects to home when feature is disabled
- [ ] No separate guard created for this feature
- [ ] Feature key documented in `03-module-reference.md`

---

## Route Removal

When removing a route or module:

- [ ] Route removed from routing file
- [ ] Sidenav entry removed
- [ ] No other module references the removed route path
- [ ] Any guards specific to this route removed (if not shared)
- [ ] Feature key can be deprecated in backend (coordinate with backend team)
- [ ] Redirects added for bookmarked URLs (redirect old path to nearest valid page)
- [ ] Module reference updated in `03-module-reference.md`
- [ ] No orphaned components left in the module

---

## Settings Sub-Route

When adding a new settings section:

- [ ] Route added under `settings-routing.module.ts`, not the parent shell
- [ ] SettingsShellComponent sub-sidenav updated with new entry
- [ ] If feature-gated: `canActivate: [FeatureGuard]` with `data: { feature: '<key>' }`
- [ ] Component renders within the settings shell's `<router-outlet>`
- [ ] If editing state: `canDeactivate: [UnsavedChangesGuard]`
- [ ] Section documented in `03-module-reference.md` under Settings

---

## Quick Reference: Guard Selection

| Scenario | Guard | Config |
|----------|-------|--------|
| Require authentication | `AuthGuard` | Already on `/workspace/:id` parent |
| Require workspace membership | `WorkspaceMemberGuard` | Already on `/workspace/:id` parent |
| Gate by brand/subscription feature | `FeatureGuard` | `data: { feature: 'key' }` |
| Protect unsaved edits | `UnsavedChangesGuard` | `canDeactivate` on the route |
| Validate step parameter | `StepValidationGuard` | `data: { maxStep: N }` on step route |
| Role-based redirect (landing only) | `WorkspaceLandingGuard` | Only on `/workspace/:id` empty path |
| Custom auth flow | `SendEmail2FAGuard` | Specific to 2FA route |

If your scenario isn't in this table, you almost certainly need `FeatureGuard` with a new feature key. Don't create a new guard.

---

## Angular 17+ Notes

When the codebase reaches Angular 17:

- [ ] New guards use `CanActivateFn` (functional), not class-based
- [ ] New resolvers use `ResolveFn` (functional), not class-based
- [ ] New components are standalone (no NgModule needed)
- [ ] Use `inject()` for DI in functional guards/resolvers
- [ ] Consider `canMatch` instead of `canActivate` for routes that shouldn't even be matched
- [ ] Use `@defer` for heavy sub-components within a route
- [ ] Convert existing guards/resolvers when touching them for other changes
