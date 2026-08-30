## Overview

tastecheck.me is a small, playful "gamified profile" app: enter a Last.fm username, get back stats, unlockable achievement badges, an XP/level bar, and an optional AI roast. The visual system is a warm off-white paper canvas with near-black ink type, and **one accent color** — coral/red — carrying every moment of emphasis: unlocked badges, XP progress, primary buttons, the brand mark. There is no atmospheric gradient, no multi-hue "candy" palette; cards are flat white or ink on the paper background, differentiated by a single hairline border or soft shadow.

**Key characteristics:**
- Background is `{colors.bg-page}` (#f0f0e8, a warm paper tone) — not pure white. Cards (`{colors.canvas}`) sit on top of it in white.
- One accent family carries all brand/interactive emphasis: `{colors.brand-red}` for brand/identity chrome (the logo mark, avatar ring, level pill), `{colors.ach-accent}` for achievement-specific icons and interactions (unlocked badge fills, achievement dialog status, the flame variant of the rotating example bubble). They're both "coral/red" but are deliberately two different tokens — don't swap them.
- Primary buttons and the dashboard sidebar are near-black ink (`{colors.primary}`), never colored.
- Achievement badges use a "vinyl record" motif: a rim (dashed + muted grey when locked, solid ink when unlocked... see Known Gaps) around a solid label circle holding the icon.
- Locked/unlocked is always communicated by desaturation + a lock icon, never by hiding content.

## Rollout status

This design language was introduced gradually, page by page. As of this writing, every page is migrated:

| Page | Status |
|---|---|
| `index.html` (landing + dashboard) | ✅ Migrated — ink + coral throughout |
| `compare.html` | ✅ Migrated — verdict card (`.compare-score-card`) now sits on `{colors.primary}` instead of legacy sage, with its percentage value (`.compare-score-value`) in `{colors.ach-accent}`; the "how it works"/"recent roasts" eyebrows (`.compare-how-heading`, `.compare-recent-heading`) and the recent-roast card's accent border are now `{colors.muted}` / removed; the head-to-head user cards (`.compare-user-card`) now show a `{colors.primary}` "VS" badge on the divider and each user's top 3 artists (plain numbered text, not colored badges — kept equal-weight per the stat-box rule) instead of a single top artist |
| `about.html` | ✅ Migrated — feature-card icons/CTA/status pill, the "how it works" step icons, and the `.about-eyebrow` labels all moved off legacy green/ember to a plain ink/muted neutral treatment |
| `privacy.html`, `terms.html`, `404.html` | ✅ Already compliant — these only ever used ink/muted/canvas, no legacy colors to remove |
| `how-to.html` | ✅ Already compliant — plain tables in ink/muted, no accent usage at all |

`{colors.legacy-sidebar-bg}` and `{colors.legacy-sage-deep}` have been removed from `style.css` entirely — nothing references them anymore. `{colors.ach-green}` / `{colors.ach-brown}` remain defined and in use, but only for their legitimate job: the "Shared Setlist" artist-pill color cycle on `compare.html` (see Variety accent below) — not as a general green/brown accent.

## Colors

### Core

- **Primary / Ink** (`{colors.primary}` / `{colors.ink}` — #181d26): Same value, two names for the same role — the dashboard sidebar background, primary button background, and the strongest text color.
- **Primary Active** (`{colors.primary-active}` — #0d1218): Press state for ink buttons; also used as the darker stop in the ink-groove gradient on vinyl badge rims.
- **Canvas** (`{colors.canvas}` — #ffffff): Card and input surfaces.
- **Page Background** (`{colors.bg-page}` — #f0f0e8): The warm paper tone every page sits on.
- **Surface Soft** (`{colors.surface-soft}` — #f8fafc): Neutral stat-tile backgrounds.
- **Surface Strong** (`{colors.surface-strong}` — #e0e2e6): Track background for the large progress bar on the dashboard stats card.
- **Body** (`{colors.body-text}` — #333840): Default running text.
- **Muted** (`{colors.muted}` — #41454d): Secondary text, icon strokes, section labels, uppercase eyebrows.
- **Hairline** (`{colors.hairline}` — #dddddd): 1px borders on inputs, neutral stat tiles, dividers.
- **Link** (`{colors.link}` — #1b61c9): Inline text links only (privacy/terms pages).

### Brand & achievement accent — two reds, two jobs

- **Brand Red** (`{colors.brand-red}` — #e8503a): Identity chrome — the flame logo mark, the sidebar avatar ring, the level-number pill. Represents *the brand*, not an action.
- **Achievement Accent** (`{colors.ach-accent}` — #d9291c): A deeper red reserved for achievements specifically — unlocked badge/icon fills (dashboard achievement rows *and* the landing page's badge showcase), the achievement dialog's "unlocked" status chip, the flame variant of the rotating example bubble. If something represents an unlocked achievement, it's this color, not brand-red.
- **Achievement Accent Tint** (`{colors.ach-accent-tint}` — #fdece9): Background tint for unlocked achievement rows and the achievement-dialog unlocked chip.
- Both reds are also combined as gradient stops (`brand-red → ach-accent`) for every XP/progress bar in the product — sidebar mini bar, main stats card bar, roast-loading progress bar.

### Locked state

- **Locked Background** (`{colors.ach-locked-bg}` — #f4f3ee), **Locked Chip** (`{colors.ach-locked-chip}` — #e7e5db), **Locked Icon** (`{colors.ach-locked-icon}` — #9a968a): The row background / icon-chip background / icon-and-text color for any locked achievement.
- The landing page's badge showcase uses its own (slightly different) locked literals — dashed rim `#c7c3b4`, label fill `#e9e7de`, icon `#b0aca0` — because it's a different component, not a copy-paste error. Keep them distinct; don't try to unify them with `{colors.ach-locked-*}`.

### Variety accent (not brand)

- **Ach Teal / Blue / Brown / Pink / Green / Purple** (`#2a7c6f #3d5a8a #6b4a2a #c0446a #3a7a4a #5a3a8a`): A six-color cycle used *only* for the "Shared Setlist" artist-name pills on the compare results page. This is legitimate categorical variety for an open-ended list of artist names, not a branding decision — don't read it as license to reintroduce multi-hue accents elsewhere.

### Legacy (removed)

- **Sage** (`{colors.legacy-sidebar-bg}` — #8db87a) and **Sage Deep** (`{colors.legacy-sage-deep}` — #2e5036): The old sidebar/verdict-card green. Fully removed from `style.css` as of the `compare.html`/`about.html` migration — no page references these tokens anymore. Don't reintroduce them.

## Typography

**Font family:** DM Sans (400/500/600) for all UI text, with the system fallback stack `-apple-system, BlinkMacSystemFont, sans-serif`. DM Mono (400/500) is used narrowly for numeric/mono accents — the compare page's compatibility percentage, its "01/02/03" step numbers, and section eyebrow labels like "YOUR MATCHUP" — anywhere a small-caps monospace numeral reads as more "data-like."

Base body text is 14px/400/1.4 line-height. There is no display/heading type scale as formal as a marketing site's — headings are set ad hoc per page (e.g. the landing H1 at 40px/400, achievement dialog titles at 20px/600) rather than from a shared ramp. If you're adding a new heading, look at the nearest existing one on that page rather than inventing a new size.

## Layout & Spacing

4px-based spacing scale: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px. Card internal padding is typically `{spacing.xl}` (32px); tighter chips/rows use `{spacing.md}` or `{spacing.sm}`.

This is a compact, app-like product, not a long-scroll marketing site — there's no single universal "section rhythm" constant. The dashboard is a two-column layout (fixed-width sidebar + flexible main panel) that stacks to one column under 900px; achievement rows and stat tiles reflow within their card rather than the page reflowing around large bands.

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 2px | (unused currently — reserved for legal/system-required surfaces) |
| `{rounded.sm}` | 6px | Text inputs, small inline chips |
| `{rounded.md}` | 10px | Compact cards, table containers |
| `{rounded.lg}` | 14px | Buttons, most cards, achievement rows |
| `{rounded.xl}` | 20px | Large section cards (stats card, sidebar, achievements section, dialogs) |
| `{rounded.full}` | 50% | Avatars, achievement/badge icon chips, vinyl badge rims |
| `{rounded.pill}` | 9999px | Search bars, level pill, XP tags, status chips |

## Elevation

Two shadow tokens, both very soft — this system does **not** run a zero-shadow/hairline-only model:

- `{shadow.card}` — `0 1px 3px rgba(0,0,0,.04), 0 2px 10px rgba(0,0,0,.04)`: the default for white cards (stats card, achievements section, compare cards).
- `{shadow.row}` — `0 1px 2px rgba(0,0,0,.03), 0 1px 4px rgba(0,0,0,.03)`: lighter, for individual rows before they're recolored by state (an unlocked/locked achievement row drops this shadow entirely in favor of its background tint doing the differentiation).

## Components

**`button-primary`** — Ink (`{colors.primary}`) background, white text, `{rounded.lg}`, 44px tall (36px `.small` variant). Press state darkens to `{colors.primary-active}`. This is the only button color in the product — there is no separate "secondary" button style; less-important actions are plain text links or ghost buttons instead.

**`text-input`** — White background, `{colors.hairline}` border, `{rounded.sm}`, 44px tall (36px `.small`). Placeholder text is `{colors.muted}`.

**`sidebar`** (dashboard) — Ink background, `{rounded.xl}`. Avatar ring is `{colors.brand-red}`; the level-number pill is a solid `{colors.brand-red}` fill; the mini XP bar is the brand-red→ach-accent gradient on a `rgba(255,255,255,.25)` track. Small chips (activity-timeline icons) are `rgba(255,255,255,.1–.2)` regardless of their legacy `.green`/`.blue` class names — those class names are cosmetic leftovers, not a color system.

**`stat-box`** — All tiles in a stats grid use the same neutral treatment: `{colors.surface-soft}` background, `{colors.hairline}` border. There is deliberately no spotlighted/accent tile — every tile in a card reads as equal-weight data, not a hierarchy of importance.

**`ach-row`** (achievement list item, used for both Daily and Lifetime achievements via one shared renderer) — Unlocked: `{colors.ach-accent-tint}` row background, bold ink name, `{colors.ach-accent}` unlock-date text, a circular icon chip filled `{colors.ach-accent}` with a white icon, and (lifetime achievements only) a white pill reading "+150 XP" in `{colors.ach-accent}`. Locked: `{colors.ach-locked-bg}` row background, muted name/desc, a circular icon chip in `{colors.ach-locked-chip}`/`{colors.ach-locked-icon}` with a muted-ring border, and for lifetime achievements the same "+150 XP" text with no pill background (signals "not yet earned" vs. "earned"). **Daily achievements never show an XP tag** — they're excluded from XP entirely in `backend/achievements.py`'s `calculate_xp()`.

**`showcase-badge`** (landing page badge preview) — A two-layer "vinyl record" shape: an outer rim (`.showcase-ring`, 60px) around an inner label (`.showcase-ring-fill`, 44px unlocked / 60px... see note below). Unlocked: rim is transparent, label fills the full 60px in `{colors.ach-accent}` with a white icon (no separate dark rim — removed after initial drafts made it look like a black ring). Locked: rim is a 2px dashed `#c7c3b4` circle showing the page background through the gap, label is a smaller 44px `#e9e7de` circle with a `#b0aca0` icon and a small lock badge (`{colors.muted}` circle, white lock icon, bg-page border) overlapping the bottom-right edge.

**`ach-dialog`** (achievement detail modal) — White card, `{colors.hairline}` border, `{rounded.lg}`. Status chip: `{colors.ach-accent-tint}`/`{colors.ach-accent}` when unlocked, `{colors.surface-strong}`/`{colors.muted}` when locked.

**`compare-score-card`** (compare page verdict card) — Same ink-surface-plus-coral-highlight pattern as the sidebar: `{colors.primary}` background, white heading/label/stamp text, and the compatibility percentage itself in `{colors.ach-accent}`. The two head-to-head user cards below it (`.compare-user-card`) stay neutral white/ink — a `{colors.primary}` circular "VS" badge sits on the dotted divider between them (also shown as a horizontal divider on mobile, not hidden), and each side's top 3 artists are listed as plain numbered text, deliberately not accent-colored, to keep the ranked list reading as equal-weight data per the `stat-box` rule.

## Do's and Don'ts

### Do
- Use `{colors.ach-accent}` for anything that represents an *unlocked achievement or achievement-specific action* — icon fills, status chips, the flame example-bubble variant.
- Use `{colors.brand-red}` for brand/identity chrome — the logo, the avatar ring, the level pill. If you're not sure which red, ask: "is this the brand, or is this an achievement?"
- Keep every stat tile in a grid the same neutral weight — no spotlighted tile.
- Reuse an existing hex value from `style.css` before introducing a new one. This system was recently cleaned up specifically to remove one-off invented colors (a hardcoded `#c050d0`/`#7040e0` purple that had drifted in from a Figma default, and four unrelated pastel stat-tile tints) — don't reintroduce that pattern.
- When adding a new inline flex child to an existing row (e.g. a tag or badge), set `flex-shrink: 0` on it and confirm the flexible sibling has `min-width: 0` — that combination is what lets text truncate gracefully instead of overflowing on narrow screens.

### Don't
- Don't use `{colors.legacy-sidebar-bg}` (sage green) — it's been removed from the codebase entirely (see Rollout status).
- Don't add a dark ring/border around an *achievement* icon fill — locked icons get a ring (it signals "not filled in yet"), unlocked ones are a plain solid fill.
- Don't invent a new accent color for a single element. The six `ach-teal/blue/brown/pink/green/purple` variety colors exist for one specific case (an open-ended list of artist-name pills) — they are not a general-purpose palette to draw from.
- Don't assume "no shadow" — this system uses soft card/row shadows (`{shadow.card}`, `{shadow.row}`) deliberately; it's not a hairline-only aesthetic.

## Known Gaps

- The badge showcase's locked-state literals (`#c7c3b4`/`#e9e7de`/`#b0aca0`) and the achievement row's locked-state tokens (`{colors.ach-locked-*}`) are intentionally two separate palettes for two separate components, not a naming inconsistency to "fix."
- A deeper "compare your actual unlocked badges side-by-side" feature on the compare results page is blocked on a backend change — `/compare` currently computes achievement overlap internally but never returns it to the frontend.
