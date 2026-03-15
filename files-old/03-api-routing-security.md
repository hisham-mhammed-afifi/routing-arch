# 03. API Routing & Security

## 3.1 Frontend: HTTP Interceptor

A single HTTP interceptor attaches two things to every outgoing request:

1. `x-user-domain` header (from BrandConfig, or derived from hostname during bootstrap)
2. `Authorization` header (from auth token, when authenticated)

```
Interceptor Chain Order:
  1. BrandInterceptor      -- attaches x-user-domain
  2. AuthInterceptor        -- attaches Bearer token
  3. ErrorInterceptor       -- handles 401/403/5xx globally
  4. (optional) RetryInterceptor -- retries on transient failures
```

The BrandInterceptor must be registered first. During bootstrap (before BrandConfig is resolved), the interceptor derives the domain directly from `window.location.hostname`. Once BrandConfig is available, it reads from the resolved config. This ensures the brand config fetch itself carries the correct `x-user-domain` header.

### Diagram: Full Request Lifecycle

<svg width="100%" viewBox="0 0 680 880" xmlns="http://www.w3.org/2000/svg" style="max-width:680px;font-family:system-ui,sans-serif">
  <style>
    .box-gray { fill: #F1EFE8; stroke: #888780; stroke-width: 0.5; }
    .box-purple { fill: #EEEDFE; stroke: #534AB7; stroke-width: 0.5; }
    .box-teal { fill: #E1F5EE; stroke: #0F6E56; stroke-width: 0.5; }
    .box-coral { fill: #FAECE7; stroke: #993C1D; stroke-width: 0.5; }
    .box-blue { fill: #E6F1FB; stroke: #185FA5; stroke-width: 0.5; }
    .box-amber { fill: #FAEEDA; stroke: #854F0B; stroke-width: 0.5; }
    .box-pink { fill: #FBEAF0; stroke: #993556; stroke-width: 0.5; }
    .th { font-size: 14px; font-weight: 500; }
    .ts { font-size: 12px; }
    .th-gray { fill: #444441; } .ts-gray { fill: #5F5E5A; }
    .th-purple { fill: #3C3489; } .ts-purple { fill: #534AB7; }
    .th-teal { fill: #085041; } .ts-teal { fill: #0F6E56; }
    .th-coral { fill: #712B13; } .ts-coral { fill: #993C1D; }
    .th-blue { fill: #0C447C; } .ts-blue { fill: #185FA5; }
    .th-amber { fill: #633806; } .ts-amber { fill: #854F0B; }
    .th-pink { fill: #72243E; } .ts-pink { fill: #993556; }
    .arr { stroke: #888780; stroke-width: 1.5; }
    .leader { stroke: #B4B2A9; stroke-width: 0.5; stroke-dasharray: 4 3; fill: none; }
  </style>
  <defs><marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>

  <!-- Phase 1 -->
  <text class="th th-gray" x="40" y="30">Phase 1: Brand resolution</text>
  <rect class="box-gray" x="40" y="46" width="180" height="44" rx="8"/>
  <text class="th th-gray" x="130" y="68" text-anchor="middle" dominant-baseline="central">Browser loads URL</text>
  <line class="arr" x1="130" y1="90" x2="130" y2="116" marker-end="url(#a)"/>
  <rect class="box-purple" x="40" y="118" width="180" height="56" rx="8"/>
  <text class="th th-purple" x="130" y="138" text-anchor="middle" dominant-baseline="central">APP_INITIALIZER</text>
  <text class="ts ts-purple" x="130" y="156" text-anchor="middle" dominant-baseline="central">Derive domain from host</text>
  <line class="arr" x1="220" y1="146" x2="300" y2="146" marker-end="url(#a)"/>
  <rect class="box-teal" x="302" y="118" width="220" height="56" rx="8"/>
  <text class="th th-teal" x="412" y="138" text-anchor="middle" dominant-baseline="central">GET /api/brand-config</text>
  <text class="ts ts-teal" x="412" y="156" text-anchor="middle" dominant-baseline="central">x-user-domain: hulul</text>
  <line class="arr" x1="130" y1="174" x2="130" y2="206" marker-end="url(#a)"/>
  <rect class="box-purple" x="40" y="208" width="180" height="56" rx="8"/>
  <text class="th th-purple" x="130" y="228" text-anchor="middle" dominant-baseline="central">Apply theme</text>
  <text class="ts ts-purple" x="130" y="246" text-anchor="middle" dominant-baseline="central">CSS vars, favicon, title</text>

  <!-- Phase 2 -->
  <text class="th th-gray" x="40" y="300">Phase 2: Authentication</text>
  <rect class="box-coral" x="40" y="316" width="180" height="56" rx="8"/>
  <text class="th th-coral" x="130" y="336" text-anchor="middle" dominant-baseline="central">POST /api/auth/login</text>
  <text class="ts ts-coral" x="130" y="354" text-anchor="middle" dominant-baseline="central">x-user-domain: hulul</text>
  <line class="arr" x1="220" y1="344" x2="300" y2="344" marker-end="url(#a)"/>
  <rect class="box-coral" x="302" y="316" width="220" height="56" rx="8"/>
  <text class="th th-coral" x="412" y="336" text-anchor="middle" dominant-baseline="central">JWT returned</text>
  <text class="ts ts-coral" x="412" y="354" text-anchor="middle" dominant-baseline="central">domain claim = hulul</text>

  <!-- Phase 3 -->
  <text class="th th-gray" x="40" y="412">Phase 3: Workspace selection</text>
  <rect class="box-blue" x="40" y="428" width="180" height="56" rx="8"/>
  <text class="th th-blue" x="130" y="448" text-anchor="middle" dominant-baseline="central">GET /api/bots</text>
  <text class="ts ts-blue" x="130" y="466" text-anchor="middle" dominant-baseline="central">AuthGuard passes</text>
  <line class="arr" x1="130" y1="484" x2="130" y2="510" marker-end="url(#a)"/>
  <rect class="box-blue" x="40" y="512" width="180" height="44" rx="8"/>
  <text class="th th-blue" x="130" y="534" text-anchor="middle" dominant-baseline="central">User selects Workspace ABC</text>

  <!-- Phase 4 -->
  <text class="th th-gray" x="40" y="596">Phase 4: Workspace context + landing</text>
  <rect class="box-amber" x="40" y="612" width="200" height="56" rx="8"/>
  <text class="th th-amber" x="140" y="632" text-anchor="middle" dominant-baseline="central">WorkspaceContextResolver</text>
  <text class="ts ts-amber" x="140" y="650" text-anchor="middle" dominant-baseline="central">Fetch workspace + user role</text>
  <line class="arr" x1="240" y1="640" x2="300" y2="640" marker-end="url(#a)"/>
  <rect class="box-amber" x="302" y="612" width="200" height="56" rx="8"/>
  <text class="th th-amber" x="402" y="632" text-anchor="middle" dominant-baseline="central">WorkspaceLandingGuard</text>
  <text class="ts ts-amber" x="402" y="650" text-anchor="middle" dominant-baseline="central">role=agent --> /inbox</text>
  <line class="arr" x1="402" y1="668" x2="402" y2="700" marker-end="url(#a)"/>
  <rect class="box-teal" x="302" y="702" width="200" height="44" rx="8"/>
  <text class="th th-teal" x="402" y="724" text-anchor="middle" dominant-baseline="central">Lazy load InboxModule</text>

  <!-- Phase 5 -->
  <text class="th th-gray" x="40" y="790">Phase 5: Real-time connection</text>
  <rect class="box-pink" x="40" y="806" width="260" height="56" rx="8"/>
  <text class="th th-pink" x="170" y="826" text-anchor="middle" dominant-baseline="central">SignalR.connect(ABC)</text>
  <text class="ts ts-pink" x="170" y="844" text-anchor="middle" dominant-baseline="central">?botId=ABC + token</text>
  <line class="arr" x1="300" y1="834" x2="360" y2="834" marker-end="url(#a)"/>
  <rect class="box-pink" x="362" y="806" width="240" height="56" rx="8"/>
  <text class="th th-pink" x="482" y="826" text-anchor="middle" dominant-baseline="central">Live connection</text>
  <text class="ts ts-pink" x="482" y="844" text-anchor="middle" dominant-baseline="central">Scoped to Workspace ABC only</text>

  <!-- Interceptor annotation -->
  <rect class="box-gray" x="530" y="118" width="130" height="260" rx="10" stroke-dasharray="4 3"/>
  <text class="th th-gray" x="595" y="148" text-anchor="middle">Interceptor</text>
  <text class="ts ts-gray" x="595" y="168" text-anchor="middle">Every request:</text>
  <text class="ts ts-gray" x="595" y="200" text-anchor="middle">x-user-domain</text>
  <text class="ts ts-gray" x="595" y="220" text-anchor="middle">Authorization</text>
</svg>

---

## 3.2 SignalR Connection

The SignalR hub connection already uses `botId` as a query param and the auth token via `accessTokenFactory`. Brand context is derived server-side from the token. No changes needed unless the backend requires `x-user-domain` on the WebSocket handshake as well. If so, pass it as an additional query param during connection negotiation:

```
SignalR negotiation URL:
  /hub/chat?botId=abc123&domain=hulul
  + Authorization header via accessTokenFactory
```

---

## 3.3 Backend Security (Recommended, Not Frontend-Owned)

Three-layer defense for the shared database:

```
Layer 1: JWT domain claim
  - Login issues a token with domain = 'hulul'
  - Backend validates x-user-domain matches token claim
  - Mismatch = 403 Forbidden

Layer 2: Middleware scoping
  - A request-scoped context sets the current domain
  - All service/repository calls read from this context

Layer 3: Query-level filtering
  - ORM global filter: WHERE domain = @currentDomain
  - Last line of defense, catches any bypass of Layer 1 or 2
```

### Diagram: Backend Security Layers

<svg width="100%" viewBox="0 0 680 440" xmlns="http://www.w3.org/2000/svg" style="max-width:680px;font-family:system-ui,sans-serif">
  <style>
    .box-gray { fill: #F1EFE8; stroke: #888780; stroke-width: 0.5; }
    .box-purple { fill: #EEEDFE; stroke: #534AB7; stroke-width: 0.5; }
    .box-teal { fill: #E1F5EE; stroke: #0F6E56; stroke-width: 0.5; }
    .box-coral { fill: #FAECE7; stroke: #993C1D; stroke-width: 0.5; }
    .th { font-size: 14px; font-weight: 500; }
    .ts { font-size: 12px; }
    .th-gray { fill: #444441; } .ts-gray { fill: #5F5E5A; }
    .th-purple { fill: #3C3489; } .ts-purple { fill: #534AB7; }
    .th-teal { fill: #085041; } .ts-teal { fill: #0F6E56; }
    .th-coral { fill: #712B13; } .ts-coral { fill: #993C1D; }
    .arr { stroke: #888780; stroke-width: 1.5; }
    .leader { stroke: #B4B2A9; stroke-width: 0.5; stroke-dasharray: 4 3; fill: none; }
  </style>
  <defs><marker id="a2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>

  <text class="th th-gray" x="40" y="30">Shared database: defense in depth</text>

  <rect class="box-gray" x="40" y="50" width="160" height="56" rx="8"/>
  <text class="th th-gray" x="120" y="70" text-anchor="middle" dominant-baseline="central">HTTP request</text>
  <text class="ts ts-gray" x="120" y="88" text-anchor="middle" dominant-baseline="central">x-user-domain: hulul</text>
  <line class="arr" x1="200" y1="78" x2="250" y2="78" marker-end="url(#a2)"/>

  <rect class="box-purple" x="252" y="50" width="390" height="100" rx="14"/>
  <text class="th th-purple" x="447" y="76" text-anchor="middle">Layer 1: Header vs JWT validation</text>
  <text class="ts ts-purple" x="447" y="96" text-anchor="middle">x-user-domain must match token's domain claim</text>
  <text class="ts ts-purple" x="447" y="114" text-anchor="middle">Mismatch = 403 rejected</text>
  <line class="arr" x1="447" y1="150" x2="447" y2="176" marker-end="url(#a2)"/>

  <rect class="box-teal" x="252" y="178" width="390" height="100" rx="14"/>
  <text class="th th-teal" x="447" y="204" text-anchor="middle">Layer 2: Request-scoped context</text>
  <text class="ts ts-teal" x="447" y="224" text-anchor="middle">Middleware sets current domain on context</text>
  <text class="ts ts-teal" x="447" y="244" text-anchor="middle">All services read domain from context</text>
  <line class="arr" x1="447" y1="278" x2="447" y2="304" marker-end="url(#a2)"/>

  <rect class="box-coral" x="252" y="306" width="390" height="100" rx="14"/>
  <text class="th th-coral" x="447" y="332" text-anchor="middle">Layer 3: ORM global filter</text>
  <text class="ts ts-coral" x="447" y="352" text-anchor="middle">WHERE domain = @currentDomain</text>
  <text class="ts ts-coral" x="447" y="372" text-anchor="middle">Applied to every query automatically</text>

  <text class="ts" x="60" y="170" fill="#A32D2D">Reject early</text>
  <line class="leader" x1="110" y1="162" x2="250" y2="130"/>
  <text class="ts ts-gray" x="60" y="250">Scope context</text>
  <line class="leader" x1="120" y1="242" x2="250" y2="228"/>
  <text class="ts ts-gray" x="60" y="360">Last defense</text>
  <line class="leader" x1="110" y1="352" x2="250" y2="356"/>

  <line class="arr" x1="447" y1="406" x2="447" y2="430" marker-end="url(#a2)"/>
  <text class="ts ts-gray" x="447" y="438" text-anchor="middle">Shared SQL Server (hulul data only)</text>
</svg>

---

## 3.4 Pre-Auth Requests

Login, registration, forgot-password, and other unauthenticated endpoints have no JWT to validate against. For these, the backend trusts the `x-user-domain` header. This is acceptable because pre-auth endpoints don't return sensitive data scoped to a brand. They create or authenticate users within the specified brand.
