# 10. Build, Deployment & Migration

## 10.1 Current: Single Angular CLI Project

This works for now. With 10+ devs, the main risk is slow builds and accidental cross-module coupling.

---

## 10.2 Recommended: Nx Migration (When Upgrading to 17+)

When upgrading Angular, consider migrating to an Nx monorepo simultaneously. Benefits for a large team:

```
Nx gives you:
  - Library boundaries enforced by lint rules
  - Module-level build caching (only rebuild what changed)
  - Affected commands (only test/lint modules touched by a PR)
  - Dependency graph visualization

Library structure maps to existing modules:
  libs/
    shared/ui/          --> SharedModule components
    core/               --> CoreModule services, guards
    feature/playground/  --> PlaygroundModule
    feature/inbox/       --> InboxModule
    feature/analytics/   --> AnalyticsModule
    ...
```

This is not required but becomes high-value with 10+ devs to prevent architectural erosion.

---

## 10.3 CI/CD: One Build, All Brands

```
CI Pipeline:
  1. Build once (ng build --prod)
  2. Run tests
  3. Produce one Docker image / one artifact
  4. Deploy to SaaS (serves all brands, brand resolved at runtime)
  5. Same artifact deployed to on-prem clients

No per-brand builds. No per-client builds.
```

---

## 10.4 Angular Upgrade Path (14/15 to 17+)

Recommended incremental approach:

```
Step 1: 14 --> 15 (if not already on 15)
  - Minor, mostly dependency updates

Step 2: 15 --> 16
  - Standalone components become available (opt-in)
  - Start writing NEW components as standalone
  - Do NOT convert existing NgModules yet

Step 3: 16 --> 17
  - New control flow (@if, @for, @defer)
  - Signals stabilize
  - Begin converting state from BehaviorSubjects to signals in new code
  - Use @defer for lazy-loading heavy sub-components within modules

Step 4: 17 --> 18/19
  - Zoneless change detection becomes viable
  - Full signal-based reactivity

Migration rule: never convert working code just to be "modern."
Convert when you're already touching a file for a feature or bug fix.
```
