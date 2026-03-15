# Architecture Overview

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

| Decision | Choice | Why |
|----------|--------|-----|
| Workspace context | Single resolver at `/workspace/:id`, shared via `WorkspaceContextService` | Eliminates 19 redundant subscription resolver calls. One fetch per workspace, cached until workspace changes. |
| Route structure | Nested under `/workspace/:id` | Every feature module gets workspace context for free. URL is bookmarkable and self-describing. |
| Module access control | `FeatureGuard` as the single gating mechanism | Checks brand flags + subscription tier. Replaces the broken 130-value `UnsupportedFeatures` enum with a structured system. No separate role guard. |
| Landing page | `WorkspaceLandingGuard` redirects by role | Agent lands on inbox, analyst on analytics, admin/owner on home. Redirect happens before any module chunk downloads. |
| Layout shells | 4 shells (Auth, App, Account, Workspace) + 1 sub-shell (Settings) | Each shell owns its chrome (sidenav, topbar). Modules render inside the shell's router-outlet. |
| Lazy loading | Every feature module lazy-loaded | 17 modules, most users use 2-3 per session. Initial bundle stays small. |
| Brand resolution | Runtime via APP_INITIALIZER | One build serves all brands. Brand config fetched using `x-user-domain` header derived from hostname. |
| API header | HTTP interceptor injects `x-user-domain` on every request | Derived from hostname before config loads, then from resolved config. Non-negotiable on all requests including pre-auth. |
| SignalR | Per-workspace connection, tied to `WorkspaceShellComponent` lifecycle | Connect on init, disconnect on destroy. No orphaned connections. |
| On-prem | Same artifact, same code paths | On-prem backend serves brand config for the single configured brand. No build-time branching. |

---

## Document Index

| # | Document | What It Covers |
|---|----------|----------------|
| 01 | This file | Context, constraints, decisions |
| 02 | [Route Architecture](./02-route-architecture.md) | Route tree, layout shells, guards, workspace context, SignalR lifecycle |
| 03 | [Module Reference](./03-module-reference.md) | All 17 feature modules: routes, guards, feature flags, ownership |
| 04 | [Supporting Infrastructure](./04-supporting-infrastructure.md) | Brand resolution, interceptors, theming, state management |
| 05 | [Current State & Gap](./05-current-state-gap.md) | How the current codebase differs, key gaps, what to address first |
