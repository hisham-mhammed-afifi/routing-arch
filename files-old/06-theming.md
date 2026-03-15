# 06. Theming

## 6.1 Approach: CSS Custom Properties (Runtime)

Since you own the design system (no Angular Material to fight), CSS custom properties are the cleanest path.

---

## 6.2 Token Categories

```
Category            Examples                          Scope
--------            --------                          -----
Color               --color-primary                   Brand
                    --color-primary-hover
                    --color-accent
                    --color-surface
                    --color-text-primary
                    --color-text-secondary
                    --color-error
                    --color-success

Typography          --font-family-base                Brand
                    --font-family-heading
                    --font-size-base
                    --font-weight-heading

Spacing             --spacing-xs through --spacing-xl  Global (same across brands)

Shape               --border-radius-sm                Brand (if brands differ)
                    --border-radius-md
                    --border-radius-lg

Elevation           --shadow-sm                       Brand (if brands differ)
                    --shadow-md
                    --shadow-lg
```

---

## 6.3 How Tokens Are Applied

On APP_INITIALIZER completion, after fetching BrandConfig:

```
1. Read config.theme.cssVars (a flat key-value map)
2. Iterate and set each on document.documentElement.style
3. Update document.title from config
4. Update favicon from config.assets
5. Preload logo and other critical assets
```

### Diagram: Theming Pipeline

<svg width="100%" viewBox="0 0 680 400" xmlns="http://www.w3.org/2000/svg" style="max-width:680px;font-family:system-ui,sans-serif">
  <style>
    .box-purple { fill: #EEEDFE; stroke: #534AB7; stroke-width: 0.5; }
    .box-teal { fill: #E1F5EE; stroke: #0F6E56; stroke-width: 0.5; }
    .box-amber { fill: #FAEEDA; stroke: #854F0B; stroke-width: 0.5; }
    .box-coral { fill: #FAECE7; stroke: #993C1D; stroke-width: 0.5; }
    .box-blue { fill: #E6F1FB; stroke: #185FA5; stroke-width: 0.5; }
    .box-gray { fill: #F1EFE8; stroke: #888780; stroke-width: 0.5; }
    .th { font-size: 14px; font-weight: 500; }
    .ts { font-size: 12px; }
    .th-purple { fill: #3C3489; } .ts-purple { fill: #534AB7; }
    .th-teal { fill: #085041; } .ts-teal { fill: #0F6E56; }
    .th-amber { fill: #633806; } .ts-amber { fill: #854F0B; }
    .th-coral { fill: #712B13; } .ts-coral { fill: #993C1D; }
    .th-blue { fill: #0C447C; } .ts-blue { fill: #185FA5; }
    .th-gray { fill: #444441; } .ts-gray { fill: #5F5E5A; }
    .arr { stroke: #888780; stroke-width: 1.5; }
    .arr-light { stroke: #B4B2A9; stroke-width: 0.5; }
  </style>
  <defs><marker id="a4" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>

  <text class="th th-gray" x="40" y="30">Theming: brand config to rendered UI</text>

  <rect class="box-purple" x="40" y="50" width="160" height="56" rx="8"/>
  <text class="th th-purple" x="120" y="70" text-anchor="middle" dominant-baseline="central">Brand config API</text>
  <text class="ts ts-purple" x="120" y="88" text-anchor="middle" dominant-baseline="central">Returns theme data</text>
  <line class="arr" x1="200" y1="78" x2="250" y2="78" marker-end="url(#a4)"/>

  <rect class="box-teal" x="252" y="50" width="180" height="56" rx="8"/>
  <text class="th th-teal" x="342" y="70" text-anchor="middle" dominant-baseline="central">BrandConfigService</text>
  <text class="ts ts-teal" x="342" y="88" text-anchor="middle" dominant-baseline="central">Stores + distributes</text>

  <line class="arr-light" x1="342" y1="106" x2="130" y2="160" marker-end="url(#a4)"/>
  <line class="arr-light" x1="342" y1="106" x2="342" y2="160" marker-end="url(#a4)"/>
  <line class="arr-light" x1="342" y1="106" x2="554" y2="160" marker-end="url(#a4)"/>

  <rect class="box-amber" x="40" y="162" width="180" height="100" rx="10"/>
  <text class="th th-amber" x="130" y="186" text-anchor="middle">CSS variables</text>
  <text class="ts ts-amber" x="130" y="206" text-anchor="middle">--color-primary</text>
  <text class="ts ts-amber" x="130" y="222" text-anchor="middle">--color-accent</text>
  <text class="ts ts-amber" x="130" y="238" text-anchor="middle">--font-family-base</text>

  <rect class="box-coral" x="252" y="162" width="180" height="100" rx="10"/>
  <text class="th th-coral" x="342" y="186" text-anchor="middle">Document meta</text>
  <text class="ts ts-coral" x="342" y="206" text-anchor="middle">document.title</text>
  <text class="ts ts-coral" x="342" y="222" text-anchor="middle">Favicon link</text>
  <text class="ts ts-coral" x="342" y="238" text-anchor="middle">OG tags</text>

  <rect class="box-blue" x="464" y="162" width="180" height="100" rx="10"/>
  <text class="th th-blue" x="554" y="186" text-anchor="middle">Dynamic assets</text>
  <text class="ts ts-blue" x="554" y="206" text-anchor="middle">Logo URL</text>
  <text class="ts ts-blue" x="554" y="222" text-anchor="middle">Login background</text>
  <text class="ts ts-blue" x="554" y="238" text-anchor="middle">Brand illustrations</text>

  <line class="arr" x1="130" y1="262" x2="130" y2="300" marker-end="url(#a4)"/>
  <line class="arr" x1="342" y1="262" x2="342" y2="300" marker-end="url(#a4)"/>
  <line class="arr" x1="554" y1="262" x2="554" y2="300" marker-end="url(#a4)"/>

  <rect class="box-gray" x="40" y="302" width="604" height="80" rx="14" stroke-dasharray="4 3"/>
  <text class="th th-gray" x="342" y="330" text-anchor="middle">Components (brand-unaware)</text>
  <text class="ts ts-gray" x="342" y="350" text-anchor="middle">Use var(--color-primary), never hardcoded hex. Read asset URLs from service.</text>

  <rect class="box-teal" x="464" y="50" width="180" height="56" rx="8"/>
  <text class="th th-teal" x="554" y="70" text-anchor="middle" dominant-baseline="central">Feature flags</text>
  <text class="ts ts-teal" x="554" y="88" text-anchor="middle" dominant-baseline="central">Sidenav + guards</text>
  <line class="arr" x1="432" y1="78" x2="462" y2="78" marker-end="url(#a4)"/>
</svg>

---

## 6.4 Component Usage

Components never reference brand-specific values. Everything goes through variables:

```css
/* CORRECT */
.button-primary {
  background: var(--color-primary);
  border-radius: var(--border-radius-md);
  font-family: var(--font-family-base);
}

/* WRONG */
.button-primary {
  background: #2E75B6;  /* hardcoded widebot blue */
}
```

---

## 6.5 Dark Mode (If Applicable)

If any brand needs dark mode, add a second set of tokens scoped to a class or attribute:

```css
:root { --color-surface: #FFFFFF; --color-text-primary: #1A1A1A; }
[data-theme="dark"] { --color-surface: #1E1E1E; --color-text-primary: #F0F0F0; }
```

The BrandConfig can include a `supportsDarkMode` flag and a `darkCssVars` map.

---

## 6.6 Assets Per Brand

Assets (logo, favicon, login background, email headers) are loaded dynamically from URLs in BrandConfig. Components that display branded assets read from `BrandConfigService`:

```html
<img [src]="brandConfig.assets.logoUrl" [alt]="brandConfig.displayName" />
```

No assets are bundled per brand in the build. All served from CDN or backend.
