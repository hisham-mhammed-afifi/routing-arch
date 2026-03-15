# Frontend Architecture: Overview

## Context & Constraints

| Dimension | Detail |
|-----------|--------|
| Platform | Angular SaaS + On-prem |
| Angular Version | 14/15 (upgrade to 17+ planned) |
| Backend | .NET + SQL Server, shared database |
| Brand Tenancy | Logical partition via `x-user-domain` header |
| SaaS Brands | 3 today (widebot, hulul, aql), growing to 5-10 |
| On-Prem | Same build as SaaS, no customization |
| User Accounts | Completely separate per brand |
| Roles | Per-workspace (agent, analyst, admin, owner, etc.) |
| UI Library | Custom design system |
| State Management | BehaviorSubjects / RxJS services |
| Real-time | SignalR (live chat + notifications), botId query param + token |
| i18n / RTL | Full multi-language + RTL support already in place |
| Team | 10+ frontend devs, multiple squads |
| Codebase | Single Angular CLI project |

---

## Architecture Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Brand resolution | Runtime APP_INITIALIZER | One build for all brands and on-prem. Scales to 10+ brands without build changes. |
| API header injection | HTTP Interceptor | Guarantees x-user-domain on every request. Single point of control. |
| Backend brand security | Token claim validation + ORM-level scoping | Defense in depth for shared database. |
| Workspace landing page | Route guard with role mapping | No wasted chunk downloads. Redirect before any module loads. |
| Feature flags | Brand config + subscription plan | Simple, sufficient for 3-10 brands. No external flag service needed yet. |
| Module isolation | Lazy-loaded NgModules with strict boundaries | Each squad owns a module. No cross-module imports. |
| State management | Formalized BehaviorSubject pattern | Works today, maps cleanly to signals on upgrade. |
| Theming | CSS custom properties from BrandConfig | Full runtime control. No build-per-brand. Custom design system makes this frictionless. |
| SignalR brand context | Derived from auth token server-side | Already working. No frontend changes needed. |
| Codebase structure | Single CLI project now, Nx monorepo on Angular 17+ upgrade | Nx adds value at team scale but should coincide with the version upgrade to avoid two migrations. |
| On-prem | Same build artifact, brand config served by on-prem backend | Zero customization means zero build variants. |

---

## Document Index

| # | Document | Covers |
|---|----------|--------|
| 01 | [Route Architecture](./01-route-architecture.md) | Route tree, layout shells, lazy loading, role-based landing, guards |
| 02 | [Brand Resolution](./02-brand-resolution.md) | APP_INITIALIZER, BrandConfig shape, caching, on-prem, local dev |
| 03 | [API Routing & Security](./03-api-routing-security.md) | HTTP interceptor, SignalR connection, backend security layers |
| 04 | [Module Architecture](./04-module-architecture.md) | Module boundaries, folder structure, cross-module communication |
| 05 | [State Management](./05-state-management.md) | BehaviorSubject pattern, state layers, signals migration path |
| 06 | [Theming](./06-theming.md) | CSS custom properties, token categories, dark mode, assets |
| 07 | [Feature Flags](./07-feature-flags.md) | Brand config flags, enforcement layers, subscription flags |
| 08 | [Real-Time (SignalR)](./08-realtime.md) | Per-workspace connection lifecycle, brand context, reconnection |
| 09 | [i18n / RTL](./09-i18n-rtl.md) | Brand default locale, RTL theming considerations |
| 10 | [Build, Deployment & Migration](./10-build-deployment.md) | CI/CD, Nx migration, Angular upgrade path |
| 11 | [Migration Map](./11-migration-map.md) | Current-to-target route mapping, guard mapping, feature flag taxonomy |
| 12 | [Migration Plan](./12-migration-plan.md) | Phased approach, priority order, timeline, risk mitigation |
