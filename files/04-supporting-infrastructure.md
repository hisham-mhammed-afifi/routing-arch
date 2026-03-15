# Supporting Infrastructure

Concise coverage of the systems that support routing. Each topic is covered only to the depth that routing depends on.

---

## Brand Resolution

On app bootstrap, an `APP_INITIALIZER` reads the hostname, derives the brand domain, and fetches brand configuration via `GET /api/brand-config` with the `x-user-domain` header. The app does not render until this completes.

```
platform.hulul.net loads
  --> APP_INITIALIZER fires
  --> Derives "hulul" from hostname
  --> GET /api/brand-config, header: x-user-domain: hulul
  --> BrandConfigService stores response
  --> CSS variables applied to :root, favicon/title set
  --> App renders
```

**What BrandConfig provides to routing:**

- `features: Record<string, boolean>` -- brand-level feature flags. These feed into `FeatureGuard` alongside subscription flags.
- `theme.cssVars` -- applied to `:root`, consumed by all components via `var(--color-primary)` etc.
- `assets` -- logo URLs, login background. Loaded dynamically, not bundled.
- `defaultLocale` -- determines initial language. Users can override in account settings.

**Caching:** Cached in `localStorage` with a 15-minute TTL. On subsequent visits, the app boots from cache and revalidates in the background (stale-while-revalidate). If the API is unreachable and no cache exists, show a branded error page using a static hostname-to-brand fallback map.

**On-prem:** Same code path. The on-prem backend serves the brand config endpoint returning the single configured brand.

**Local dev:** `proxy.conf.json` maps localhost to a brand. Dev-only query param `?brand=hulul` overrides for testing.

---

## HTTP Interceptors

Three interceptors, ordered:

| Order | Interceptor | What it does |
|-------|-------------|--------------|
| 1 | BrandInterceptor | Attaches `x-user-domain` header. Before config loads, derives from `window.location.hostname`. After config loads, reads from `BrandConfigService`. |
| 2 | AuthInterceptor | Attaches `Authorization: Bearer <token>` when authenticated. Handles 401 responses by clearing session and redirecting to login. |
| 3 | ErrorInterceptor | Catches 403/5xx globally. Shows error notifications. Does not retry (optional retry interceptor can be added later). |

**Why this order matters:** The brand interceptor must fire first because the brand config fetch itself needs the `x-user-domain` header. If auth interceptor ran first and the token was expired, it would redirect to login before the brand config call even happens.

**Current state note:** The existing `ServicesInterceptor` combines all three concerns in one file and also attaches `x-bot` (workspace ID). In the new architecture, workspace ID is not an interceptor concern. It's part of the API call made by `WorkspaceContextResolver` and individual module services that include the workspace ID in their request paths (since it's in the URL: `/workspace/:id/...`).

---

## Error Handling at Async Boundaries

Every async boundary in the app is a potential failure point. Routing depends on several of these boundaries completing successfully before the user sees anything. Each one must fail gracefully with clear user feedback.

### APP_INITIALIZER Failure

The brand config fetch is the first async boundary. It runs before the app renders.

- **API fails, no cache exists:** Show a static error page with brand-agnostic styling (a minimal HTML page bundled in `index.html` as a `<noscript>`-style fallback, or toggled via a root-level `*ngIf`). This page uses no CSS variables since brand config never loaded. It tells the user to retry or contact support. The app must never boot without brand config -- the initializer blocks rendering.
- **API fails, cache exists:** Boot from the cached brand config (stale-while-revalidate). Show a subtle "offline mode" indicator (e.g., a thin banner at the top of the viewport). The app is fully functional but running on potentially stale config. The banner includes a manual "Retry" action that re-fetches config and reloads if successful.
- **Timeout:** Treat the same as a failure. The initializer should enforce a reasonable timeout (e.g., 10 seconds) rather than hanging indefinitely.

### Resolver Failure (WorkspaceContextResolver)

The resolver fetches workspace context before any workspace route activates. If it fails, the user cannot enter the workspace.

- **Current behavior:** `catchError` returns `EMPTY`, which cancels navigation silently. The user stays on the previous page, or sees nothing on initial load (blank screen).
- **Recommended behavior:** On resolver error, clear context, show an error toast, and redirect to `/workspaces` so the user can pick another workspace or retry.

```typescript
resolve(route: ActivatedRouteSnapshot): Observable<WorkspaceContext> {
  const workspaceId = route.paramMap.get('workspaceId');
  return this.workspaceApi.getContext(workspaceId).pipe(
    tap((ctx) => this.ctx.set(ctx)),
    catchError((err) => {
      this.ctx.clear();
      this.notification.error('Could not load workspace');
      this.router.navigate(['/workspaces']);
      return EMPTY;
    })
  );
}
```

This ensures the user always lands somewhere actionable. The redirect to `/workspaces` is safe because that route does not depend on workspace context.

### Guard Failure (Unhandled Exception)

If a guard throws an unhandled exception (as opposed to returning `false` or a `UrlTree`), the Angular router cancels navigation silently. On initial load this results in a blank page.

- **Rule:** All guards must catch their own errors internally. On failure, return a `UrlTree` redirect -- never throw.
- **Pattern:** Wrap guard logic in a try/catch. Log the error, then return a safe redirect (e.g., `/workspaces` or `/login` depending on the guard's responsibility).

### HTTP Interceptor Error Propagation

Interceptors form the last async boundary. They handle transport-level errors before any component or service sees the response.

| Status | Interceptor | Behavior |
|--------|-------------|----------|
| 401 Unauthorized | AuthInterceptor | Clear session, redirect to `/login?returnUrl=<current>`. Do not show a toast -- the redirect is the feedback. |
| 403 Forbidden | ErrorInterceptor | Show "You don't have permission" notification. Do not redirect (the page may still be partially usable). |
| 5xx Server Error | ErrorInterceptor | Show "Something went wrong" notification with a correlation ID if available. |
| Network Error (status 0) | ErrorInterceptor | Show a persistent "Connection lost" banner with a retry button. Dismiss the banner when connectivity is restored. |

**Key principle:** Never swallow errors silently in interceptors. Every error must produce user-visible feedback -- either a redirect, a toast, or a banner. Silent failures are the hardest bugs to diagnose and the worst user experience.

---

## State Management

### Pattern

Every state service follows the same structure:

```typescript
@Injectable()
export class SomeModuleState {
  // private writeable
  private _items$ = new BehaviorSubject<Item[]>([]);
  private _loading$ = new BehaviorSubject<boolean>(false);

  // public read-only
  readonly items$ = this._items$.asObservable();
  readonly loading$ = this._loading$.asObservable();

  // named mutation methods
  setItems(items: Item[]): void { this._items$.next(items); }
  setLoading(loading: boolean): void { this._loading$.next(loading); }
}
```

Rules:
- State services expose observables, never raw subjects
- Mutation through named methods, never `.next()` from outside
- Module-scoped state is `providedIn` the feature module, destroyed on navigation away
- Global state (`WorkspaceContextService`, `AuthService`, `BrandConfigService`) is `providedIn: 'root'`

### State layers

| Layer | Scope | Examples | Lifetime |
|-------|-------|----------|----------|
| Global | App-wide singleton | AuthState, BrandConfigState, NotificationState | App lifetime |
| Workspace | Active workspace | WorkspaceContextService (workspace, role, subscription, features) | Until workspace changes |
| Module | Feature module | InboxState, AnalyticsState, CampaignsState | Until user navigates away from module |

### Signals migration path (Angular 17+)

When upgrading:

```
BehaviorSubject       -->  WritableSignal (private)
.asObservable()       -->  .asReadonly()
combineLatest(a$, b$) -->  computed(() => ...)
```

Incremental. New code uses signals. Old code stays on BehaviorSubjects until touched.

### State Management Rules

Concrete rules that prevent the most common state-related bugs in Angular applications.

**Rule 1: Never subscribe in constructors.**
Constructors are for dependency injection only. Side-effectful subscriptions belong in `ngOnInit` (for components/directives) or should be triggered by explicit method calls (for services). Better yet, avoid manual subscriptions entirely and use the `async` pipe in templates.

**Rule 2: Unsubscribe on destroy.**
Every manual `.subscribe()` must have a corresponding teardown. Preferred approaches, in order:

1. `async` pipe (automatic, no teardown needed)
2. `takeUntilDestroyed()` from `@angular/core/rxjs-interop` (Angular 16+, cleanest imperative option)
3. `takeUntil(this.destroy$)` with a `Subject` that emits in `ngOnDestroy`

Leaked subscriptions cause stale callbacks, memory growth, and subtle bugs that only appear after repeated navigation.

**Rule 3: Module state must be scoped.**
Module-level state services are provided in the feature module, not in root. This ensures the state is created when the module loads and destroyed when the module unloads.

```typescript
// Module-scoped: provided in the module, destroyed when module unloads
@Injectable()  // NOT providedIn: 'root'
export class InboxState { ... }

// In the module:
@NgModule({
  providers: [InboxState],  // scoped to this module
})
export class InboxModule {}
```

If a module-scoped service were `providedIn: 'root'`, it would survive navigation away from the module and hold stale data when the user returns.

**Rule 4: Derived state uses combineLatest or computed.**
Never duplicate state. Derive it.

```typescript
// RxJS (current)
readonly canSend$ = combineLatest([this.role$, this.features$]).pipe(
  map(([role, features]) => role !== 'viewer' && features.messaging)
);

// Signals (Angular 17+)
readonly canSend = computed(() => this.role() !== 'viewer' && this.features().messaging);
```

Duplicated state drifts. Derived state is always consistent by construction.

**Rule 5: Reset module state on workspace change.**
When a user switches workspaces, all module-level state must be reset. This happens naturally for module-scoped state because the module unloads and reloads (lazy-loaded modules get a fresh injector). Global state that is workspace-dependent (`WorkspaceContextService`) is explicitly reset by the `WorkspaceContextResolver` before it sets the new context. Any global service that caches workspace-specific data must listen for context changes and clear its cache accordingly.

---

## Theming

CSS custom properties set at runtime from `BrandConfig.theme.cssVars`.

Token categories:
- **Color** (brand-scoped): `--color-primary`, `--color-accent`, `--color-surface`, `--color-text-primary`, `--color-error`, `--color-success`
- **Typography** (brand-scoped): `--font-family-base`, `--font-family-heading`
- **Shape** (brand-scoped if brands differ): `--border-radius-sm`, `--border-radius-md`, `--border-radius-lg`
- **Spacing** (global, same across brands): `--spacing-xs` through `--spacing-xl`

Components use variables, never hardcoded values:

```css
.button-primary { background: var(--color-primary); }
```

Assets (logo, favicon, login background) loaded from URLs in BrandConfig. Not bundled per brand.

---

## Angular Upgrade Path

Relevant to routing because standalone components and functional guards change how routes are defined.

```
14 --> 15    Dependency updates. No routing changes.
15 --> 16    Standalone components available. Start writing NEW components as standalone.
             Convert class-based guards to CanActivateFn.
             Convert class-based resolvers to ResolveFn.
16 --> 17    New control flow (@if, @for). @defer for heavy sub-components.
             Signals stabilize. New state code uses signals.
17 --> 18+   Zoneless change detection. Full signal reactivity.
```

Migration rule: convert when you touch a file for a feature or bug fix, not as a standalone effort.

---

## Testing Strategy

Routing infrastructure is critical path code. A broken guard or resolver can lock users out of the app entirely. Every layer needs targeted tests.

### Guard Unit Tests

Test each guard in isolation with mocked services. Every guard has at least two test cases: the allow path and the deny path. For guards that return `UrlTree` redirects, assert the exact redirect URL.

```typescript
describe('FeatureGuard', () => {
  it('should allow navigation when feature is enabled', () => {
    ctx.set(mockContext({ brandFeatures: { inbox: true } }));
    const route = createMockRoute({ data: { feature: 'inbox' } });
    expect(guard.canActivate(route)).toBe(true);
  });

  it('should redirect to home when feature is disabled', () => {
    ctx.set(mockContext({ brandFeatures: { inbox: false } }));
    const route = createMockRoute({ data: { feature: 'inbox' } });
    const result = guard.canActivate(route) as UrlTree;
    expect(result.toString()).toBe('/workspace/123/home');
  });
});
```

Key assertions for guard tests:
- The correct boolean or `UrlTree` is returned
- Redirect URLs include necessary params (e.g., `returnUrl` for `AuthGuard`)
- Edge cases: missing route data, undefined context, expired tokens

### Resolver Unit Tests

- **Success path:** Verify the API service is called with the correct workspace ID, verify `WorkspaceContextService.set()` is called with the response, verify the resolved value is emitted.
- **Error path:** Verify `WorkspaceContextService.clear()` is called, verify the error notification is shown, verify navigation to `/workspaces` is triggered, verify `EMPTY` is returned (navigation cancels).
- **Cache path:** When the resolver detects the user is navigating to the same workspace that is already loaded, verify the API is NOT called and the existing context is reused. This prevents unnecessary network calls during in-workspace navigation.

### Integration Tests (RouterTestingModule)

Integration tests verify that guards, resolvers, and route config work together correctly. Use `RouterTestingModule.withRoutes(...)` to set up a realistic route tree and test navigation outcomes.

Key scenarios:
- **Full guard chain:** `AuthGuard` -> `WorkspaceMemberGuard` -> `WorkspaceContextResolver` -> `FeatureGuard`. Verify that failing any guard in the chain produces the correct redirect.
- **Redirect chains:** An unauthenticated user hits `/workspace/123/inbox` -> redirected to `/login?returnUrl=...` -> logs in -> redirected back to `/workspace/123/inbox` -> resolver runs -> lands on inbox.
- **Deep linking with auth:** User pastes a deep link while authenticated. Verify the full resolution path works without intermediate redirects.
- **Deep linking without auth:** User pastes a deep link while not authenticated. Verify they land on login, and the `returnUrl` captures the full deep link.

### E2E Tests (Cypress / Playwright)

E2E tests cover the scenarios that unit and integration tests cannot: real browser behavior, real network timing, real DOM state.

Priority scenarios:
- **Role-based landing:** Log in as an agent -> verify landing on `/workspace/:id/inbox`. Log in as an admin -> verify landing on `/workspace/:id/home`.
- **Feature gating:** Disable a feature in brand config -> navigate to that feature's route -> verify redirect to home with appropriate feedback.
- **Workspace switching:** Switch from workspace A to workspace B -> verify SignalR disconnects from A and reconnects to B -> verify module state is fresh (no stale data from workspace A).
- **Brand resolution:** Access the app via different hostnames -> verify correct theme, logo, and feature set for each brand. (Requires test infrastructure that can serve the app on multiple hostnames.)

---

## Build and Deployment

One build, all brands, all deployments.

```
CI: build once (ng build --prod)
  --> one artifact
  --> deploy to SaaS (brand resolved at runtime by hostname)
  --> same artifact deployed to on-prem (brand config served by on-prem backend)
```

No per-brand builds. No per-client builds. When upgrading to Angular 17+, consider migrating to Nx monorepo for library boundaries, build caching, and affected-only CI runs. This is high-value with 10+ devs but should coincide with the version upgrade to avoid two migrations.
