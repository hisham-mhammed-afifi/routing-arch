# 02. Brand Resolution

## 2.1 Approach: APP_INITIALIZER (Runtime)

On app bootstrap, an `APP_INITIALIZER` reads the current hostname, derives the brand domain, and fetches brand configuration from the API using the `x-user-domain` header. The app does not render until this completes.

```
Browser loads platform.hulul.net
  --> Angular bootstraps
  --> APP_INITIALIZER fires
  --> Derives domain from window.location.hostname
  --> GET /api/brand-config
      Headers: x-user-domain: hulul (derived from hostname)
  --> BrandConfigService stores the response
  --> App renders with hulul's branding
```

This means the very first HTTP call already uses `x-user-domain`, establishing the pattern from the start. The interceptor (see [API Routing](./03-api-routing-security.md)) handles this by reading the domain from hostname before BrandConfig is available, then switching to the resolved BrandConfig value for all subsequent calls.

---

## 2.2 BrandConfig Shape

```typescript
interface BrandConfig {
  id: string;                      // 'widebot' | 'hulul' | 'aql'
  displayName: string;             // 'WideBot'
  domain: string;                  // 'platform.widebot.net'
  apiBaseUrl: string;              // 'https://api.widebot.net' or relative '/'
  defaultLocale: string;           // 'en' | 'ar'
  supportEmail: string;
  theme: BrandTheme;
  features: FeatureFlags;
  assets: BrandAssets;
}

interface BrandTheme {
  appTitle: string;
  favicon: string;
  cssVars: Record<string, string>; // --color-primary, --color-accent, etc.
}

interface FeatureFlags {
  analytics: boolean;
  activityTracker: boolean;
  billing: boolean;
  // extend as brands grow
}

interface BrandAssets {
  logoUrl: string;
  logoIconUrl: string;
  loginBackgroundUrl: string;
}
```

---

## 2.3 Caching and Resilience

The fetched config should be cached in `localStorage` with a short TTL (e.g., 15 minutes). On subsequent visits, the app boots from cache immediately and revalidates in the background (stale-while-revalidate pattern). If the config API is unreachable, the cached config serves as a fallback. If no cache exists and the API is down, show a branded error page (brand derived from hostname with a static fallback map).

---

## 2.4 On-Prem Behavior

On-prem uses the same code path. The on-prem backend serves the brand config endpoint returning the single configured brand. No build-time branching. The hostname resolves to whatever domain the client uses, and the backend returns the hardcoded brand config for that deployment.

---

## 2.5 Local Development

For local development (`localhost:4200`), provide a `proxy.conf.json` or an environment override that maps localhost to a specific brand for testing. Developers can switch brands via a query param in dev mode only (`?brand=hulul`) which the BrandConfigService intercepts before making the API call.
