# Architecture Overview

## How to Read These Docs

**Who this is for:**

- **New developers** joining the team -- start here, read front to back, and you will understand how the application is wired before touching code.
- **Existing developers** planning a new feature -- jump to the Module Reference (03), then check the Routing Checklist (06) before opening a PR.
- **Architects and tech leads** reviewing structural changes -- focus on this document's principles and decisions, then cross-reference the Gap Analysis (05) for migration priorities.

**Recommended reading order:**

1. **01 -- Architecture Overview** (this file). Constraints, principles, and key decisions.
2. **02 -- Route Architecture**. Route tree, layout shells, guards, resolvers, Module Federation loading, and SignalR lifecycle.
3. **03 -- Module Reference**. Every remote catalogued: federation config, feature flags, owning squad.
4. **04 -- Supporting Infrastructure**. Brand resolution, HTTP interceptors, theming, signals-based state management, shared library strategy.
5. **05 -- Current State & Gap Analysis**. Where the codebase stands today versus the target architecture, and what to tackle first.

**A note on code samples:** All code uses Angular 21 idioms: standalone components, functional guards (`CanActivateFn`), functional resolvers (`ResolveFn`), functional interceptors (`HttpInterceptorFn`), signals (`signal`, `computed`, `effect`, `linkedSignal`, `resource`), `inject()` instead of constructor injection, `provideRouter`, `provideHttpClient`, `provideAppInitializer`. No NgModules. No class-based guards. No zone.js.

---

## Architecture Principles

These principles are non-negotiable. Every routing decision, guard, resolver, and module boundary traces back to one of them.

| # | Principle | What It Means in Practice |
|---|-----------|--------------------------|
| 1 | **One workspace context, resolved once** | The workspace object (config, subscription, feature flags, user role) is fetched by a single resolver at `/workspace/:id` and cached in `WorkspaceContextService`. No remote, component, or service ever fetches workspace data independently. |
| 2 | **Feature gating through a single guard -- never fail open** | `featureGuard` is the only gate between a user and a feature remote. It checks brand flags, subscription tier, and role in one pass. If the guard cannot determine access (network error, missing data), it denies. There is no "let them through and check later" path. |
| 3 | **One build per remote, one deploy per remote** | Each of the 17 feature remotes is an independently built and deployed Nx application. The shell (host) is also independently built. A squad can ship a remote without rebuilding or redeploying the shell or any other remote. |
| 4 | **Runtime brand resolution, not build-time branching** | There is no per-brand build. Brand identity, theme tokens, and feature flags are resolved at runtime via the `x-user-domain` header derived from hostname. The same deployment artifact serves widebot, hulul, aql, and on-prem. |
| 5 | **Layout shells own their chrome, remotes render inside outlets** | Each shell (Auth, App, Account, Workspace, Settings) controls its own sidenav, topbar, and structural layout. Remotes never import or manipulate shell chrome. They render exclusively inside the shell's `<router-outlet>`. |
| 6 | **Shared singletons via Module Federation, not imports** | Angular core, RxJS, the router, and all shared Nx libraries (`@pwa/workspace-context`, `@pwa/auth`, `@pwa/brand`, `@pwa/ui`) are shared as singletons through webpack Module Federation's `shared` config. Remotes consume them at runtime -- they are never bundled twice. |
| 7 | **Real-time connections scoped to workspace lifecycle** | SignalR hubs connect when the workspace shell initialises and disconnect when it destroys. Navigating between remotes within a workspace keeps the connection alive. Leaving the workspace tears it down. No orphaned connections. |
| 8 | **Signals-first, zoneless by default** | All new state uses Angular signals (`signal`, `computed`, `effect`). The app runs with `provideZonelessChangeDetection()`. No zone.js. Components use `ChangeDetectionStrategy.OnPush` (the default in zoneless mode). |

---

## Constraints

| Dimension | Detail |
|-----------|--------|
| Framework | Angular 21 (standalone components, signals, zoneless, Vitest) |
| Monorepo | Nx 22.3+ with `@nx/angular` plugin |
| Micro-frontends | Webpack Module Federation via Nx (`@nx/angular:module-federation-dev-server`) |
| Backend | .NET + SQL Server, single shared database |
| Multi-tenancy | Logical partition via `x-user-domain` header on every request |
| Brands (SaaS) | 3 today (widebot, hulul, aql), growing to 5-10 |
| On-prem | Same artifacts as SaaS, brand config served by on-prem backend |
| User accounts | Completely separate per brand |
| Roles | Per-workspace. A user can be owner on Workspace A and agent on Workspace B |
| UI library | Custom design system (`@pwa/ui` shared lib), no Angular Material |
| State | Angular signals (`signal`, `computed`, `effect`, `linkedSignal`, `resource`) |
| Real-time | SignalR for live chat and notifications, scoped per workspace |
| i18n / RTL | Full multi-language and RTL support already in place |
| Team | 10+ frontend devs, multiple squads, each squad owns one or more remotes |
| Test runner | Vitest (Angular 21 default) |
| Build | 18 independently built applications (1 shell + 17 remotes) |

---

## Key Decisions

| Decision | Choice | Why | Rejected Alternative |
|----------|--------|-----|----------------------|
| Micro-frontend framework | Webpack Module Federation via Nx | Mature ecosystem, Nx-native generators (`@nx/angular:host`, `@nx/angular:remote`), proven at scale with Angular. Team has existing webpack plugin/loader customizations that require webpack. | **Native Federation (`@angular-architects/native-federation`):** Uses esbuild and ES import maps. Better long-term alignment with Angular CLI's move to esbuild. Rejected because: (1) team relies on custom webpack loaders for SVG sprites and i18n compile-time transforms that have no esbuild equivalents yet, (2) Native Federation's dynamic versioning via import maps is less battle-tested for 17-remote deployments, (3) Nx's webpack MF generators provide scaffolding, dev-server orchestration, and implicit dependency sharing that Native Federation lacks. **Trade-off acknowledged:** By staying on webpack, we forfeit esbuild's 3-5x faster builds. Nx remote caching and `nx affected` partially offset this. Revisit when esbuild loader plugins stabilize. |
| Monorepo tool | Nx 22.3+ | Project graph, affected commands, module boundary lint rules, remote caching, MF generators. 10+ devs need enforced boundaries. | **Turborepo:** No Angular-specific generators, no MF support, no module boundary rules. **Standalone Angular CLI:** No library boundary enforcement, no affected-only CI, no MF generators. |
| Workspace context | Single resolver at `/workspace/:id`, cached in `WorkspaceContextService` (shared singleton) | Eliminates 19 redundant API calls. One fetch per workspace, shared across all remotes via MF singleton. | **Each remote fetches its own context.** Rejected: 19 redundant calls, race conditions, inconsistent state across remotes. |
| Route structure | Nested under `/workspace/:id`, remotes loaded via `loadRemoteModule` | URL is bookmarkable and self-describing. Remotes load into the workspace shell's `<router-outlet>`. | **Flat routes.** Rejected: URL not self-describing, each remote must independently validate workspace ID. |
| Module access control | `featureGuard` (functional `CanActivateFn`) as the single gating mechanism | Checks brand flags + subscription tier from `WorkspaceContextService`. Runs in the shell before the remote is downloaded. | **Separate role guard + feature guard.** Rejected: splits access logic, doubles configuration surface. |
| Landing page | `workspaceLandingGuard` redirects by role | Agent → inbox, analyst → analytics, admin/owner → home. Redirect happens before any remote chunk downloads. | **Single landing page for all roles.** Rejected: wastes a remote download, visible flicker. |
| Layout shells | 4 shells + 1 sub-shell (Auth, App, Account, Workspace, Settings) | Each shell owns its chrome. Remotes render inside the shell's outlet. All shells live in the host app, not in remotes. | **Single layout with conditional rendering.** Rejected: shell logic becomes a maze of conditionals. |
| Brand resolution | Runtime via `provideAppInitializer` | One set of deploy artifacts serves all brands. Brand config fetched using `x-user-domain` header derived from hostname. | **Build-time branching.** Rejected: multiplies CI/CD by number of brands. |
| State management | Angular signals (no NgRx, no BehaviorSubjects in new code) | Signals are framework-native, tree-shakeable, and work with zoneless change detection. `computed()` replaces `combineLatest`. `resource()` replaces manual HTTP-to-state bridging. | **NgRx:** Adds 15+ KB to the shared bundle, requires store/effects/selectors boilerplate. Overkill when signals + services cover our state patterns. **BehaviorSubjects:** Still work but are legacy. New code uses signals; existing BehaviorSubjects are migrated on touch. |
| Testing | Vitest (unit/integration), Playwright (e2e) | Vitest is Angular 21's default. 2-5x faster than Karma/Jest for unit tests. Playwright handles multi-remote e2e scenarios. | **Karma:** Deprecated in Angular CLI. **Jest:** Slower than Vitest, requires custom Angular transforms. |
| Shared dependencies | MF `shared` config: Angular, RxJS, router as singletons with `strictVersion: true` | Prevents duplicate framework instances. `strictVersion` catches version mismatches at deploy time, not as subtle runtime bugs. | **No sharing (each remote bundles its own Angular).** Rejected: 17 copies of Angular in memory, 17x bundle size increase. |

---

## Nx Library Structure

### Options Considered

**Option A: Fine-grained (one library per concern)**

```
libs/
  shared/ui/           # Design system components
  shared/data-access/  # Base HTTP client, API utilities
  shared/auth/         # AuthService, auth guard, token management
  shared/workspace-context/  # WorkspaceContextService, workspace models
  shared/brand/        # BrandConfigService, theming
  shared/signalr/      # SignalR connection management
  shared/models/       # Shared TypeScript interfaces
  shared/utils/        # Pure utility functions
```

- **Pro:** Maximum granularity. A change to `shared/signalr` only affects remotes that import it. Nx `affected` is precise.
- **Pro:** Clear ownership boundaries. Each lib has one purpose.
- **Con:** 8 shared libraries to maintain. More `tsconfig.paths.ts` entries. Higher configuration overhead.

**Option B: Consolidated (fewer libraries)**

```
libs/
  shared/ui/           # Design system
  shared/core/         # Auth + workspace context + brand + SignalR + interceptors + guards
  shared/models/       # Shared interfaces
  shared/utils/        # Pure utilities
```

- **Pro:** 4 libraries instead of 8. Simpler project graph.
- **Con:** `shared/core` becomes a grab bag. A change to the auth guard forces Nx to consider all remotes affected (because they all depend on `shared/core`).
- **Con:** Harder to assign ownership as team grows.

**Option C: Per-domain libraries (remote-specific libs)**

```
libs/
  shared/ui/
  shared/core/
  shared/models/
  shared/utils/
  inbox/data-access/      # Inbox-specific API services
  analytics/data-access/  # Analytics-specific API services
  campaigns/data-access/  # ...
```

- **Pro:** Domain services are co-located with their remote's data layer but shareable if needed.
- **Con:** 17+ additional libraries. Only worth it if remotes share domain logic (they don't -- each remote's API layer is self-contained).

### Decision: Option A (fine-grained)

With 10+ devs across multiple squads, the precision of `nx affected` matters more than configuration simplicity. Each shared library has a single responsibility, a clear owner, and a minimal surface area. The 8-library overhead is manageable with Nx generators and is far less painful than a bloated `shared/core` that triggers full rebuilds.

### Nx Tags and Module Boundary Rules

Every project is tagged by type and scope:

```json
// nx.json (partial)
{
  "targetDefaults": { ... },
  "namedInputs": { ... }
}
```

```json
// apps/shell/project.json (partial)
{
  "tags": ["type:app", "scope:shell"]
}

// apps/inbox/project.json (partial)
{
  "tags": ["type:app", "scope:remote"]
}

// libs/shared/workspace-context/project.json (partial)
{
  "tags": ["type:shared", "scope:workspace-context"]
}
```

```jsonc
// .eslintrc.json (root)
{
  "overrides": [
    {
      "files": ["*.ts"],
      "rules": {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            "depConstraints": [
              // Shell can import any shared lib
              { "sourceTag": "scope:shell", "onlyDependOnLibsWithTags": ["type:shared"] },
              // Remotes can import shared libs, never other remotes, never the shell
              { "sourceTag": "scope:remote", "onlyDependOnLibsWithTags": ["type:shared"] },
              // Shared libs can only import other shared libs
              { "sourceTag": "type:shared", "onlyDependOnLibsWithTags": ["type:shared"] }
            ],
            "allow": []
          }
        ]
      }
    }
  ]
}
```

**What this enforces:**
- Remote A cannot import Remote B (federation boundary).
- Remotes cannot import shell code.
- Shared libs cannot import app code.
- All shared code flows through `libs/shared/*`.

---

## Document Index

| # | Document | What It Covers |
|---|----------|----------------|
| 01 | This file | Context, constraints, principles, decisions, Nx library structure |
| 02 | [Route Architecture](./02-route-architecture.md) | Route tree, layout shells, guards, resolvers, Module Federation loading, SignalR lifecycle |
| 03 | [Module Reference](./03-module-reference.md) | All 17 remotes: federation config, feature flags, team ownership |
| 04 | [Supporting Infrastructure](./04-supporting-infrastructure.md) | Brand resolution, interceptors, theming, signals state management, shared library strategy |
| 05 | [Current State & Gap](./05-current-state-gap.md) | Current vs target, bugs to fix, Nx migration gap, MF migration gap, Angular version gap |
