# Design

## Theme

Light only. The physical salon is light pink with cream sofas; the site mirrors it. No dark mode.

## Color Palette

Public site tokens (`:root` in `src/app/globals.css`):

| Token | Value | Role |
|---|---|---|
| `--color-background` | `#FFFAFC` | Page background (pink-tinted, never pure white) |
| `--color-surface` | `#FFFFFF` | Cards, nav when scrolled |
| `--color-text` | `#3D2C2E` | Headings + body (warm near-black, never `#000`) |
| `--color-text-muted` | `#826E72` | Secondary text |
| `--color-accent` | `#C97B8E` | Kickers, labels, small accents (AA on cream at ≥14px bold) |
| `--color-border` | `#F0E0E4` | Hairlines, card borders |
| `--gradient-rose-gold` | `linear-gradient(135deg, #F8B4B4, #DDA0BA)` | Primary buttons only |

Strategy: **Restrained-plus.** Pink-tinted neutrals everywhere; the rose gradient appears only on primary actions and the odd decorative moment. The dashboard uses a separate `salon-*` token set (`@theme`); don't mix the two systems.

## Typography

- **Headings:** Playfair Display 600 (loaded via `next/font`, variable `--font-serif`). Fluid `clamp()` scales: `.heading-xl` and `.heading-lg` in globals.css.
- **Body/UI:** Inter 400/500/600 (variable `--font-sans`). Body 1rem/1.7, max width 65ch for paragraphs.
- Kickers (section labels): Inter 600, 0.8rem, uppercase, 2px letter-spacing, `--color-accent`.

## Motion

- Ease: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint) everywhere, 0.5–0.8s reveals, 100–150ms stagger.
- One orchestrated whileInView reveal per section, `viewport={{ once: true }}`.
- Banned: bounce/elastic springs, 3D rotations, shimmer sweeps, infinite float loops.
- `prefers-reduced-motion` respected via MotionConfig `reducedMotion="user"` + global CSS fallback.

## Components

- **Buttons:** pill radius (50px), `.button-primary` (rose gradient, white text) and `.button-outline` (1px text-color border). Both have hover lift ≤2px, visible `:focus-visible` ring.
- **Section rhythm:** `.section-padding` (5rem/2rem mobile, 8rem/4rem desktop), `.container` max 1200px.
- **Imagery:** real salon photos (`public/*.webp`), rounded 16–24px, no filters heavier than a soft warm overlay.
- **Cards:** used sparingly (services grid); soft shadow `0 4px 24px rgba(107,58,63,0.08)`, full border `1px --color-border`, no side-stripes.
