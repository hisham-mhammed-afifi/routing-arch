# 07. Feature Flags

## 7.1 Approach: Brand Config Carries Flags

Given the current scale (3-10 brands, no per-user flag needs), a dedicated feature flag service is overkill. Feature flags live in the `BrandConfig.features` object.

---

## 7.2 Where Flags Are Enforced

```
Layer 1: Route Guards (FeatureGuard)
  - Prevents navigation to disabled modules
  - Redirects to a fallback route

Layer 2: Sidenav Rendering
  - WorkspaceShellComponent reads features and builds nav items dynamically
  - Disabled modules don't appear in navigation

Layer 3: UI Elements
  - Buttons, cards, or links that reference a feature-gated module
    check the flag before rendering
```

All three layers must be consistent. A module should never appear in the sidenav if its route guard would reject navigation.

---

## 7.3 Subscription-Level Flags

Some features may depend on the workspace's subscription plan, not just the brand. These come from the workspace context (resolved by WorkspaceContextResolver) rather than BrandConfig:

```
Brand-level flags:    "Does hulul even offer analytics?"
Subscription flags:   "Does this workspace's plan include analytics?"
```

A module is accessible only if both say yes. FeatureGuard checks both layers in sequence.
