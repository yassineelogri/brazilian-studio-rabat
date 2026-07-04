# Design

## Theme

Light only. The physical salon is light pink with cream sofas; the site mirrors it. No dark mode.

## Color Palette

Public site tokens (`:root` in `src/app/globals.css`):

| Token | Value | Role |
|---|---|---|
| `--color-background` | `#FAF3EE` | Page background (warm cream, matches salon interior) |
| `--color-surface` | `#FFFFFF` | Cards, nav when scrolled |
| `--color-blush` | `#F7E9E6` | Alternating sections, tinted chips/recaps |
| `--color-dark` | `#2B1B1E` | Footer, marquee, dark overlays (plum-cocoa, never `#000`) |
| `--color-text` | `#382227` | Headings + body (deep plum-brown) |
| `--color-text-muted` | `#7E6469` | Secondary text |
| `--color-accent` | `#B26478` | Borders, icons, decorative rose |
| `--color-accent-deep` | `#8E4457` | Accent TEXT on light (6.2:1 on cream, AA small text) |
| `--color-accent-soft` | `#E2A7B5` | Accents on dark surfaces only |
| `--color-border` | `#EEDCD7` | Hairlines, card borders |
| `--gradient-rose-gold` | `linear-gradient(135deg, #A85D70, #7E4452)` | Primary buttons (white text passes AA) |

Strategy: **Committed.** Warm cream carries the surface, deep wine-rose carries identity and actions. Richer than pastel: luxury through depth, not darkness. The dashboard uses a separate `salon-*` token set (`@theme`); don't mix the two systems. `/booking` uses the same public tokens (see `src/components/booking/Booking.module.css`), never a separate visual world.

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
