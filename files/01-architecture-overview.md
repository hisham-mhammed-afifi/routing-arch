# Architecture Overview

## How to Read These Docs

**Who this is for:**

- **New developers** joining the team -- start here, read front to back, and you will understand how the application is wired before touching code.
- **Existing developers** planning a new feature -- jump to the Module Reference (03), then check the Routing Checklist (06) before opening a PR.
- **Architects and tech leads** reviewing structural changes -- focus on this document's principles and decisions, then cross-reference the Gap Analysis (05) for migration priorities.

**Recommended reading order:**

1. **01 -- Architecture Overview** (this file). Understand the constraints, principles, and key decisions that shape everything else.
2. **02 -- Route Architecture**. The route tree, layout shells, guards, resolvers, and SignalR lifecycle. This is the backbone.
3. **03 -- Module Reference**. Every feature module catalogued: its route, guard, feature flags, and owning squad.
4. **04 -- Supporting Infrastructure**. Brand resolution, HTTP interceptors, theming, and state management patterns.
5. **05 -- Current State & Gap Analysis**. Where the codebase stands today versus the target architecture, and what to tackle first.
6. **06 -- Routing Checklist**. Step-by-step checklist for adding a new route, module, or guard -- use this as your pre-PR gate.

**A note on code samples:** Examples throughout these documents use Angular 14/15 syntax (NgModules, `loadChildren`, class-based guards and resolvers). Where the pattern changes meaningfully in Angular 17+, a callout box explains the standalone-component and functional-guard equivalents. The architecture itself is version-agnostic; only the wiring syntax changes.

---

## Architecture Principles

These principles are non-negotiable. Every routing decision, guard, resolver, and module boundary traces back to one of them.

| # | Principle | What It Means in Practice |
|---|-----------|--------------------------|
| 1 | **One workspace context, resolved once** | The workspace object (config, subscription, feature flags, user role) is fetched by a single resolver at `/workspace/:id` and cached in `WorkspaceContextService`. No module, component, or service ever fetches workspace data independently. |
| 2 | **Feature gating through a single guard -- never fail open** | `FeatureGuard` is the only gate between a user and a feature module. It checks brand flags, subscription tier, and role in one pass. If the guard cannot determine access (network error, missing data), it denies. There is no "let them through and check later" path. |
| 3 | **One build artifact serves all brands and on-prem** | There is exactly one `ng build` output. Brand identity, theme tokens, and feature flags are resolved at runtime. Build-time branching does not exist and must never be introduced. |
| 4 | **Lazy load everything, preload intelligently** | Every feature module is lazy-loaded. The preloading strategy prioritises modules the current role is likely to visit (e.g., agents preload Inbox and Live Chat, admins preload Home and Analytics). Initial bundle size stays under budget. |
| 5 | **Layout shells own their chrome, modules render inside outlets** | Each shell (Auth, App, Account, Workspace, Settings) controls its own sidenav, topbar, and structural layout. Feature modules never import or manipulate shell chrome. They render exclusively inside the shell's `<router-outlet>`. |
| 6 | **State flows down through services, never fetched redundantly** | Workspace-scoped state lives in services provided at the workspace shell level. Child modules inject these services and subscribe. No child module triggers a duplicate HTTP call for data the parent already holds. |
| 7 | **Real-time connections scoped to workspace lifecycle** | SignalR hubs connect when the workspace shell initialises and disconnect when it destroys. Navigating between modules within a workspace keeps the connection alive. Leaving the workspace tears it down. No orphaned connections, no reconnection storms. |

---

## Constraints

| Dimension | Detail |
|-----------|--------|
| Framework | Angular 14/15, upgrading to 17+ |
| Backend | .NET + SQL Server, single shared database |
| Multi-tenancy | Logical partition via `x-user-domain` header on every request |
| Brands (SaaS) | 3 today (widebot, hulul, aql), growing to 5-10 |
| On-prem | Same build as SaaS, brand config served by on-prem backend |
| User accounts | Completely separate per brand |
| Roles | Per-workspace. A user can be owner on Workspace A and agent on Workspace B |
| UI library | Custom design system (no Angular Material) |
| State | BehaviorSubjects / RxJS services |
| Real-time | SignalR for live chat and notifications, scoped per workspace |
| i18n / RTL | Full multi-language and RTL support already in place |
| Team | 10+ frontend devs, multiple squads |
| Build | Single Angular CLI project, one build artifact for all brands and on-prem |

---

## Key Decisions

| Decision | Choice | Why | Rejected Alternative |
|----------|--------|-----|----------------------|
| Workspace context | Single resolver at `/workspace/:id`, shared via `WorkspaceContextService` | Eliminates 19 redundant subscription resolver calls. One fetch per workspace, cached until workspace changes. | **Each module fetches its own context.** Rejected because it caused 19 redundant API calls on workspace entry, race conditions between modules loading in parallel, and inconsistent state when one call failed and another succeeded. |
| Route structure | Nested under `/workspace/:id` | Every feature module gets workspace context for free. URL is bookmarkable and self-describing. | **Flat routes with `:id` in each module** (e.g., `/inbox/:workspaceId`, `/analytics/:workspaceId`). Rejected because the URL is not self-describing -- you cannot tell from the structure that inbox and analytics belong to the same workspace -- and every module must independently extract and validate the workspace ID. |
| Module access control | `FeatureGuard` as the single gating mechanism | Checks brand flags + subscription tier. Replaces the broken 130-value `UnsupportedFeatures` enum with a structured system. No separate role guard. | **Separate `RoleGuard` + `FeatureGuard` on every route.** Rejected because splitting access logic across two guards made it unclear which guard was responsible for denial, led to inconsistent error pages, and doubled the configuration surface for every lazy route. |
| Landing page | `WorkspaceLandingGuard` redirects by role | Agent lands on inbox, analyst on analytics, admin/owner on home. Redirect happens before any module chunk downloads. | **Single landing page for all roles.** Rejected because agents do not need the admin dashboard, analysts do not need the inbox, and rendering a universal landing page only to immediately redirect wastes a chunk download and adds a visible flicker. |
| Layout shells | 4 shells (Auth, App, Account, Workspace) + 1 sub-shell (Settings) | Each shell owns its chrome (sidenav, topbar). Modules render inside the shell's router-outlet. | **Single layout with conditional `*ngIf` rendering.** Rejected because the shell component accumulates every possible layout variation, the template becomes a maze of conditionals, and adding a new layout means modifying a shared component that every team touches. |
| Lazy loading | Every feature module lazy-loaded | 17 modules, most users use 2-3 per session. Initial bundle stays small. | **Eager-load common modules** (Home, Inbox, Analytics). Rejected because even the three most common modules add ~400 KB to the initial bundle, and most users within a single session only touch 2-3 modules -- which are not the same 2-3 for every role. |
| Brand resolution | Runtime via APP_INITIALIZER | One build serves all brands. Brand config fetched using `x-user-domain` header derived from hostname. | **Build-time branching** (one build per brand). Rejected because it multiplies CI/CD pipeline complexity by the number of brands, makes on-prem delivery harder (which brand do you ship?), and turns a 5-brand system into 5 parallel build/test/deploy pipelines. |
| API header | HTTP interceptor injects `x-user-domain` on every request | Derived from hostname before config loads, then from resolved config. Non-negotiable on all requests including pre-auth. | -- |
| SignalR | Per-workspace connection, tied to `WorkspaceShellComponent` lifecycle | Connect on init, disconnect on destroy. No orphaned connections. | -- |
| On-prem | Same artifact, same code paths | On-prem backend serves brand config for the single configured brand. No build-time branching. | -- |

---

## Document Index

| # | Document | What It Covers |
|---|----------|----------------|
| 01 | This file | Context, constraints, principles, decisions |
| 02 | [Route Architecture](./02-route-architecture.md) | Route tree, layout shells, guards, workspace context, SignalR lifecycle |
| 03 | [Module Reference](./03-module-reference.md) | All 17 feature modules: routes, guards, feature flags, ownership |
| 04 | [Supporting Infrastructure](./04-supporting-infrastructure.md) | Brand resolution, interceptors, theming, state management |
| 05 | [Current State & Gap](./05-current-state-gap.md) | How the current codebase differs, key gaps, what to address first |
| 06 | [Routing Checklist](./06-routing-checklist.md) | Step-by-step checklist for adding routes, modules, and guards |
