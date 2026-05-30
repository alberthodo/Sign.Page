# Cloud landing — design reference

Sign.page Cloud marketing follows a **monochrome** palette with layout and typography informed by [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) and [Cal.com’s design basics](https://design.cal.com/).

Implementation: `src/cloud/marketing/marketing-palette.css` + `marketing-primitives.tsx`.

## Color

| Token | Role | Cal.com analogue |
|-------|------|------------------|
| Paper | Page background | Canvas `#ffffff` |
| Surface card | Muted bands, fills | `#f5f5f5` |
| Ink | Body text, labels | `#111111` |
| Ink deep | Primary buttons | Black CTA |
| Footer | Closing band | `#101010` |

No accent color on marketing—hierarchy comes from type and product UI (Cal.com pattern).

## Spacing

- **Base unit:** 4px (Cal.com).
- **Rhythm:** prefer 8, 16, 24, 32, 48, 96px (Apple 8pt grid; Cal section = 96px).
- **Section padding:** 80px mobile / 96px desktop (`mkt-section`).
- **Card padding:** 32px (`mkt-card` = `p-8`).

## Typography

| Class | Size | Use |
|-------|------|-----|
| `mkt-display` | clamp 36–56px | Hero only; tight tracking |
| `mkt-title-1` | 28px | Section headings |
| `mkt-title-2` | 24px | Card titles |
| `mkt-title-3` | 20px | Subsections |
| `mkt-body-lg` | 16px | Hero subcopy |
| `mkt-body` | 14px | Body, nav, cards |
| `mkt-caption` | 12px | Meta, footer legal |
| `mkt-eyebrow` | 12px | Section labels |

**Apple HIG:** system font stack (SF on Apple platforms), line-height ≥ 1.5 for body, `text-balance` / `text-pretty` on headings.

**Cal.com:** tight negative letter-spacing on display type only; positive spacing if display sizes go below ~20px.

## Radius

| Element | Radius |
|---------|--------|
| Buttons | 8px |
| Cards | 12px |
| Hero mock | 16px |
| Badges / pills | full |

## Page grid

Minimal full-page graph paper (reference: Linear, Cal.com hero textures):

- **Cell size:** 64px (`--marketing-grid-size`)
- **Line:** ~4.5% black on light sections; ~6% white on the dark footer
- **Mask:** radial fade so lines never compete with copy; separate layer on footer
- **Implementation:** `.mkt-page-grid` on the shell, `.mkt-page-grid-footer` on footer

## Components

| Element | Practice |
|---------|----------|
| **Header** | Borderless sticky bar; logo · centered links · **Go to app** → `/login`. Mobile menu panel. |
| **Hero** | Left-aligned copy (Cal); product mock right; single primary + secondary action. |
| **Sections** | One idea per band; centered section titles; generous whitespace. |
| **Cards** | Border + light fill, not heavy shadow (Apple: deference). |
| **Buttons** | Min 44px height (Apple touch); black fill primary (Cal). |
| **Footer** | Dark closing surface (Cal); muted links; inverted logo. |
| **Motion** | Respect `prefers-reduced-motion`. |

## Accessibility

- Semantic headings (`h1` → `h2` → `h3`).
- Decorative mocks: `aria-hidden`.
- Focus rings on links and buttons (`focus-visible`).
- Sufficient contrast: ink on paper, paper on footer.

## Preview

```bash
SIGNOFF_EDITION=cloud npm run dev
```

Open `/` with Cloud edition enabled.
