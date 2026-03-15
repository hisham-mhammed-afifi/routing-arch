# 09. i18n / RTL

## 9.1 Current State

Full multi-language + RTL support already exists. Architecture just needs to ensure brand config integrates with it.

---

## 9.2 Brand Default Locale

`BrandConfig.defaultLocale` sets the initial language. Users can override in their account settings. The language preference is stored per-user in the backend.

```
Resolution order:
  1. User's saved language preference (from profile API)
  2. BrandConfig.defaultLocale
  3. Browser language (navigator.language)
```

---

## 9.3 RTL Considerations for Theming

Directional spacing tokens should use logical properties:

```css
/* CORRECT - works in both LTR and RTL */
.card { padding-inline-start: var(--spacing-md); }

/* WRONG - breaks in RTL */
.card { padding-left: var(--spacing-md); }
```

This should already be in place given existing RTL support.
