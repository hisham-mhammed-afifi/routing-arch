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

## Build and Deployment

One build, all brands, all deployments.

```
CI: build once (ng build --prod)
  --> one artifact
  --> deploy to SaaS (brand resolved at runtime by hostname)
  --> same artifact deployed to on-prem (brand config served by on-prem backend)
```

No per-brand builds. No per-client builds. When upgrading to Angular 17+, consider migrating to Nx monorepo for library boundaries, build caching, and affected-only CI runs. This is high-value with 10+ devs but should coincide with the version upgrade to avoid two migrations.
