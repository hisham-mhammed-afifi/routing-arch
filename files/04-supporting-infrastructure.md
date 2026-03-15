# Supporting Infrastructure

Coverage of systems that support routing and the federated architecture. Each topic is covered to the depth that routing and Module Federation depend on.

---

## Brand Resolution

On shell bootstrap, `provideAppInitializer` reads the hostname, derives the brand domain, and fetches brand configuration via `GET /api/brand-config` with the `x-user-domain` header. The shell does not render until this completes.

```
platform.hulul.net loads
  → provideAppInitializer fires
  → Derives "hulul" from hostname
  → GET /api/brand-config, header: x-user-domain: hulul
  → BrandConfigService stores response (signal)
  → CSS variables applied to :root, favicon/title set
  → Shell renders, MF manifest loaded, remotes available
```

### Implementation

```typescript
// libs/shared/brand/src/lib/brand-initializer.ts
import { inject } from '@angular/core';
import { BrandConfigService } from './brand-config.service';

export function brandInitializer(): () => Promise<void> {
  return () => {
    const brandConfig = inject(BrandConfigService);
    return brandConfig.load();
  };
}
```

```typescript
// apps/shell/src/app/app.config.ts
import { ApplicationConfig, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { brandInitializer } from '@pwa/brand';
import { brandInterceptor, authInterceptor, errorInterceptor } from '@pwa/data-access';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([brandInterceptor, authInterceptor, errorInterceptor])),
    provideAppInitializer(brandInitializer()),
  ],
};
```

### BrandConfigService (Signals)

```typescript
// libs/shared/brand/src/lib/brand-config.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BrandConfig } from '@pwa/models';

@Injectable({ providedIn: 'root' })
export class BrandConfigService {
  private readonly http = inject(HttpClient);
  private readonly _config = signal<BrandConfig | null>(null);

  readonly config = this._config.asReadonly();
  readonly features = computed(() => this._config()?.features ?? {});
  readonly theme = computed(() => this._config()?.theme ?? null);
  readonly brandName = computed(() => this._config()?.name ?? 'unknown');

  async load(): Promise<void> {
    const domain = this.deriveDomain();
    const cacheKey = `brand-config-${domain}`;

    // Try cache first (stale-while-revalidate)
    const cached = this.readCache(cacheKey);
    if (cached) {
      this._config.set(cached);
      this.applyTheme(cached);
      // Revalidate in background
      this.fetchAndCache(domain, cacheKey).catch(() => {});
      return;
    }

    // No cache: fetch and block
    const config = await this.fetchAndCache(domain, cacheKey);
    this._config.set(config);
    this.applyTheme(config);
  }

  private deriveDomain(): string {
    const host = window.location.hostname;
    // Extract brand from subdomain: platform.hulul.net → hulul
    const parts = host.split('.');
    return parts.length >= 3 ? parts[1] : parts[0];
  }

  private async fetchAndCache(domain: string, cacheKey: string): Promise<BrandConfig> {
    const config = await firstValueFrom(
      this.http.get<BrandConfig>('/api/brand-config', {
        headers: { 'x-user-domain': domain },
      })
    );
    localStorage.setItem(cacheKey, JSON.stringify({ data: config, ts: Date.now() }));
    return config;
  }

  private readCache(key: string): BrandConfig | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > 15 * 60 * 1000) return null; // 15-min TTL
      return data;
    } catch {
      return null;
    }
  }

  private applyTheme(config: BrandConfig): void {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(config.theme.cssVars)) {
      root.style.setProperty(key, value);
    }
    document.title = config.title;
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) favicon.href = config.assets.favicon;
  }
}
```

**What BrandConfig provides to routing:**

- `features: Record<string, boolean>` -- brand-level feature flags. These feed into `featureGuard` alongside subscription flags.
- `theme.cssVars` -- applied to `:root`, consumed by all components via `var(--color-primary)` etc.
- `assets` -- logo URLs, login background. Loaded dynamically, not bundled.
- `defaultLocale` -- determines initial language.

**Caching:** `localStorage` with 15-minute TTL. Stale-while-revalidate on subsequent visits. If the API is unreachable and no cache exists, show a static error page.

**On-prem:** Same code path. The on-prem backend serves the brand config endpoint.

**Local dev:** `proxy.conf.json` maps localhost to a brand. Query param `?brand=hulul` overrides for testing.

**Shared across remotes:** `BrandConfigService` is a shared singleton via MF. Remotes read theme values and brand features from the same instance the shell populated during initialization.

---

## HTTP Interceptors (Functional)

Three interceptors, registered in order via `provideHttpClient(withInterceptors([...]))`:

```typescript
// libs/shared/data-access/src/lib/interceptors/brand.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BrandConfigService } from '@pwa/brand';

export const brandInterceptor: HttpInterceptorFn = (req, next) => {
  const brand = inject(BrandConfigService);
  const domain = brand.brandName() !== 'unknown'
    ? brand.brandName()
    : window.location.hostname.split('.')[1] ?? window.location.hostname.split('.')[0];

  const cloned = req.clone({ setHeaders: { 'x-user-domain': domain } });
  return next(cloned);
};
```

```typescript
// libs/shared/data-access/src/lib/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@pwa/auth';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();

  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((err) => {
      if (err.status === 401) {
        auth.clearSession();
        router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => err);
    }),
  );
};
```

```typescript
// libs/shared/data-access/src/lib/interceptors/error.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { NotificationService } from '@pwa/utils';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((err) => {
      if (err.status === 403) {
        notification.error('You don\'t have permission to perform this action');
      } else if (err.status >= 500) {
        notification.error('Something went wrong. Please try again.');
      } else if (err.status === 0) {
        notification.persistent('Connection lost. Check your network.', 'connection-lost');
      }
      return throwError(() => err);
    }),
  );
};
```

| Order | Interceptor | What it does |
|-------|-------------|--------------|
| 1 | `brandInterceptor` | Attaches `x-user-domain` header. Before config loads, derives from hostname. After, reads from `BrandConfigService`. |
| 2 | `authInterceptor` | Attaches `Authorization: Bearer <token>`. Handles 401 by clearing session and redirecting to login. |
| 3 | `errorInterceptor` | Catches 403/5xx/network errors. Shows notifications. Does not retry. |

**Why this order matters:** The brand interceptor must fire first because the brand config fetch itself needs the `x-user-domain` header. If auth interceptor ran first and the token was expired, it would redirect to login before the brand config call happens.

**Shared across remotes:** Interceptors are registered in the shell's `appConfig`. Since `HttpClient` is a shared singleton via MF, all HTTP requests from remotes pass through the shell's interceptor chain. Remotes do not register their own interceptors.

---

## Error Handling at Async Boundaries

### provideAppInitializer Failure (Brand Config)

- **API fails, no cache:** Show a static error page with brand-agnostic styling. The shell must never render without brand config.
- **API fails, cache exists:** Boot from cache (stale-while-revalidate). Show an "offline mode" banner.
- **Timeout:** Enforce 10-second timeout. Treat as failure.

### Resolver Failure (workspaceContextResolver)

On error, clear context, show toast, redirect to `/workspaces`. Never return silently -- the user must land somewhere actionable.

### Guard Failure (Unhandled Exception)

All guards must catch their own errors. On failure, return a `UrlTree` redirect -- never throw. An unhandled exception in a guard cancels navigation silently, producing a blank screen.

### Remote Load Failure

When `loadRemoteModule` fails (network, 404, JS error), the shell's route config catches the error and shows a fallback component. See doc 02 for the catch pattern.

### HTTP Interceptor Error Propagation

| Status | Interceptor | Behavior |
|--------|-------------|----------|
| 401 | `authInterceptor` | Clear session, redirect to `/auth/login?returnUrl=<current>`. |
| 403 | `errorInterceptor` | Show "no permission" notification. Do not redirect. |
| 5xx | `errorInterceptor` | Show "something went wrong" notification. |
| Network (status 0) | `errorInterceptor` | Show persistent "connection lost" banner with retry. |

---

## State Management (Signals)

### Pattern

Every state service uses Angular signals:

```typescript
@Injectable({ providedIn: 'root' })
export class SomeModuleState {
  // Private writable
  private readonly _items = signal<Item[]>([]);
  private readonly _loading = signal(false);

  // Public read-only
  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();

  // Derived
  readonly count = computed(() => this._items().length);
  readonly isEmpty = computed(() => this._items().length === 0);

  // Named mutation methods
  setItems(items: Item[]): void { this._items.set(items); }
  setLoading(loading: boolean): void { this._loading.set(loading); }
  addItem(item: Item): void { this._items.update(list => [...list, item]); }
}
```

### State Layers

| Layer | Scope | Examples | Lifetime | Shared via MF |
|-------|-------|----------|----------|---------------|
| Global | App-wide singleton | `AuthService`, `BrandConfigService`, `NotificationService` | App lifetime | Yes (singleton) |
| Workspace | Active workspace | `WorkspaceContextService` | Until workspace changes | Yes (singleton) |
| Remote | Feature remote | `InboxState`, `AnalyticsState`, `CampaignsState` | Until user navigates away from remote | No (remote-local) |

### Rules

**Rule 1: Signals everywhere, no new BehaviorSubjects.**
All new state uses `signal()`. Existing BehaviorSubjects are migrated to signals on touch. The app runs zoneless -- signals are the primary change detection mechanism.

**Rule 2: Read-only public surface.**
Never expose a `WritableSignal` publicly. Use `.asReadonly()`. Mutation goes through named methods.

**Rule 3: Derived state uses `computed()`.**
Never duplicate state. Derive it:

```typescript
readonly canSend = computed(() => this.role() !== 'viewer' && this.features().messaging);
```

**Rule 4: Async data uses `resource()`.**
For data that needs to be fetched and cached reactively:

```typescript
readonly workspaceStats = resource({
  request: () => ({ id: this.ctx.currentId() }),
  loader: async ({ request, abortSignal }) => {
    const res = await fetch(`/api/workspaces/${request.id}/stats`, { signal: abortSignal });
    return res.json();
  },
});
// Usage in template: workspaceStats.value(), workspaceStats.status()
```

**Rule 5: Remote-local state is scoped.**
State services inside a remote that are `providedIn: 'root'` create a singleton within the remote's own injector (because each remote has its own Angular platform). When the user navigates away, the remote unloads and the state is garbage-collected. Do not put remote-local state in a shared library.

**Rule 6: Reset shared state on workspace change.**
`WorkspaceContextService.set()` is called by the resolver when entering a new workspace. Any shared service that caches workspace-specific data must listen for context changes:

```typescript
private readonly ctx = inject(WorkspaceContextService);

constructor() {
  effect(() => {
    const id = this.ctx.currentId();
    // Context changed (including to null on clear) -- reset cache
    this.resetCache();
  });
}
```

---

## Shared State Across Host and Remotes

### How Singletons Work with Module Federation

When a service is marked `providedIn: 'root'` and lives in a shared library (e.g., `@pwa/workspace-context`), webpack Module Federation ensures that the same JavaScript module is loaded exactly once. The shell's injector creates the service instance, and all remotes receive the same instance when they `inject()` it.

**This only works if:**
1. The library is listed in the MF `shared` config as a singleton.
2. Both the shell and remote use the same import path (`@pwa/workspace-context`).
3. `strictVersion: true` is set to prevent version mismatches.

Nx's `withModuleFederation()` handles this automatically for all `libs/shared/*` libraries detected in the project graph.

### What is NOT shared

- Components inside a remote (they are remote-local).
- Services defined inside `apps/<remote>/src/` (remote-local, not in shared libs).
- Third-party libraries used by only one remote (e.g., a charting library used only by analytics).

---

## Theming

CSS custom properties set at runtime from `BrandConfig.theme.cssVars`.

Token categories:
- **Color** (brand-scoped): `--color-primary`, `--color-accent`, `--color-surface`, `--color-text-primary`, `--color-error`, `--color-success`
- **Typography** (brand-scoped): `--font-family-base`, `--font-family-heading`
- **Shape** (brand-scoped): `--border-radius-sm`, `--border-radius-md`, `--border-radius-lg`
- **Spacing** (global): `--spacing-xs` through `--spacing-xl`

Components in remotes use CSS variables, never hardcoded values:

```css
.button-primary { background: var(--color-primary); }
```

Assets (logo, favicon, login background) are loaded from URLs in BrandConfig. Not bundled per brand.

### Design System Library (`@pwa/ui`)

All shared UI components live in `libs/shared/ui`. This library is shared as a singleton via MF, so components are not bundled separately in each remote.

```
libs/shared/ui/
  src/lib/
    button/
      button.component.ts
      button.component.css
    input/
    modal/
    table/
    sidenav/
    ...
    index.ts           # Public API barrel
```

Remotes import components from `@pwa/ui`:

```typescript
import { ButtonComponent, ModalComponent } from '@pwa/ui';

@Component({
  standalone: true,
  imports: [ButtonComponent, ModalComponent],
  // ...
})
export class SomeRemoteComponent {}
```

Because `@pwa/ui` is shared via MF, the component code is downloaded once (with the shell) and reused by all remotes at runtime.

---

## Testing Strategy

### Unit Tests (Vitest)

Vitest is the default test runner in Angular 21. All unit tests use `describe`/`it`/`expect` from Vitest.

**Guard tests:**

```typescript
// libs/shared/workspace-context/src/lib/guards/feature.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { featureGuard } from './feature.guard';
import { WorkspaceContextService } from '../services/workspace-context.service';

describe('featureGuard', () => {
  it('should allow navigation when feature is enabled', () => {
    TestBed.configureTestingModule({});
    const ctx = TestBed.inject(WorkspaceContextService);
    ctx.set(mockContext({ brandFeatures: { inbox: true }, subscriptionFeatures: { inbox: true } }));

    const route = { data: { feature: 'inbox' }, parent: { paramMap: { get: () => '123' } } } as unknown as ActivatedRouteSnapshot;

    TestBed.runInInjectionContext(() => {
      expect(featureGuard(route, {} as any)).toBe(true);
    });
  });
});
```

**Resolver tests:**

Test success (API called, context set), error (context cleared, redirect), and cache hit (API not called).

### Integration Tests (provideRouter + RouterTestingHarness)

```typescript
import { RouterTestingHarness, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

it('should redirect unauthenticated user to login', async () => {
  TestBed.configureTestingModule({
    providers: [provideRouter(appRoutes)],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/workspace/123/inbox');
  expect(harness.routeNativeElement?.textContent).toContain('Login');
});
```

### E2E Tests (Playwright)

Priority scenarios:
- Role-based landing (agent → inbox, admin → home)
- Feature gating (disable feature → redirect to home)
- Workspace switching (SignalR reconnect, state reset)
- Remote load failure (fallback component renders)
- Brand resolution (different hostnames → different themes)

---

## Build and Deployment

### Independent Remote Deployment

Each remote builds to its own `remoteEntry.js` and chunk files. Deployment is per-remote:

```
CI: nx affected:build
  → builds only changed remotes and the shell (if affected)
  → each remote produces: remoteEntry.js + chunk-*.js
  → deploy changed remotes to CDN (e.g., cdn.widebot.net/remotes/<name>/)
  → shell reads remote URLs from module-federation.manifest.json
```

### On-Prem

Same artifacts. The on-prem deployment bundles all remote chunks alongside the shell. The manifest points to local paths instead of CDN URLs:

```json
{
  "home": "/remotes/home/remoteEntry.js",
  "inbox": "/remotes/inbox/remoteEntry.js"
}
```

### Version Coordination

All remotes share the same Angular version (enforced by single `package.json` at workspace root). `strictVersion: true` in MF shared config throws a runtime error on mismatch. CI builds all affected projects from the same commit.
