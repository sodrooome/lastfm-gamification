## Overview

tastecheck.me is a small, playful "gamified profile" app: enter a Last.fm username, get back stats, unlockable achievement badges, an XP/level bar, and an optional AI roast. The visual system is a warm off-white paper canvas with near-black ink type, and **one accent color** — coral/red — carrying every moment of emphasis: unlocked badges, XP progress, primary buttons, the brand mark. There is no atmospheric gradient, no multi-hue "candy" palette; cards are flat white or ink on the paper background, differentiated by a single hairline border or soft shadow.

**Key characteristics:**
- Background is `{colors.bg-page}` (#f3f0e6, a warm paper tone) — not pure white. Cards (`{colors.canvas}`) sit on top of it in white.
- One accent family carries all brand/interactive emphasis: `{colors.brand-red}` for brand/identity chrome (the logo mark, avatar ring, level pill), `{colors.ach-accent}` for achievement-specific icons and interactions (unlocked badge fills, achievement dialog status, the flame variant of the rotating example bubble). They're both "coral/red" but are deliberately two different tokens — don't swap them.
- Primary buttons and the dashboard sidebar are near-black ink (`{colors.primary}`), never colored.
- Achievement badges use a "vinyl record" motif: a rim (dashed + muted grey when locked, solid ink when unlocked... see Known Gaps) around a solid label circle holding the icon.
- Locked/unlocked is always communicated by desaturation + a lock icon, never by hiding content.

## Rollout status

This design language was introduced gradually, page by page. As of this writing, every page is migrated:

| Page | Status |
|---|---|
| `index.html` (landing + dashboard) | ✅ Migrated — ink + coral throughout. The **landing view and the dashboard (with its dialogs)** were further moved to the *Refined Editorial* language (see below) |
| `compare.html` | ✅ Migrated, then moved to the *Refined Editorial* language (see below): paper/serif/mono tokens, ink hero sample card, joined-hairline How it works grid, hairline-bordered result cards, joint-roast result/limit states. Earlier migration notes — verdict card (`.compare-score-card`) now sits on `{colors.primary}` instead of legacy sage, with its percentage value (`.compare-score-value`) in `{colors.ach-accent}`; the "how it works"/"recent roasts" eyebrows (`.compare-how-heading`, `.compare-recent-heading`) and the recent-roast card's accent border are now `{colors.muted}` / removed; the head-to-head user cards (`.compare-user-card`) now show a `{colors.primary}` "VS" badge on the divider and each user's top 3 artists (plain numbered text, not colored badges — kept equal-weight per the stat-box rule) instead of a single top artist |
| `about.html` | ✅ Migrated, since redesigned in the *Refined Editorial* language. Earlier notes — feature-card icons/CTA/status pill, the "how it works" step icons, and the `.about-eyebrow` labels all moved off legacy green/ember to a plain ink/muted neutral treatment |
| `privacy.html`, `terms.html`, `404.html` | ✅ Already compliant — these only ever used ink/muted/canvas, no legacy colors to remove |
| `how-to.html` | ✅ Migrated, since redesigned in the *Refined Editorial* language (the icon lockups and `ach-row` reuse described here were removed). Earlier notes — section headers now carried a small `--ach-accent`-tint icon lockup (matching `about.html`'s recipe); the Daily/Lifetime achievement lists reuse the shared `ach-row` component instead of plain tables (star/badge icons per achievement, "+150 XP" pill on lifetime rows, no pill on daily); XP calculation cards get a matching icon each and their tier values recolor to `--ach-accent`; the Level Thresholds table's level number renders as a pill, with Level 10 highlighted in the solid `--brand-red` "max level" treatment the dashboard already uses |
| `release.html` | ✅ Native — built directly on the ink + coral system (no legacy version existed); uses the `guide-page` shell shared with `about.html`/`how-to.html`, plus the new `release-entry`/`release-tag` components (see Components below) |

`{colors.legacy-sidebar-bg}` and `{colors.legacy-sage-deep}` have been removed from `style.css` entirely — nothing references them anymore. `{colors.ach-green}` / `{colors.ach-brown}` remain defined and in use, but only for their legitimate job: the "Shared Setlist" artist-pill color cycle on `compare.html` (see Variety accent below) — not as a general green/brown accent.

## Refined Editorial (landing view + compare page)

The landing view (`#landingView` in `index.html`) and `compare.html` are redesigned from the "Refined Editorial" canvas. It keeps the same warm-paper / ink / coral identity but swaps tinted boxes and shadows for hairline structure and adds a serif display voice. **Page bodies are scoped** — the tokens are declared on `.landing-view, .compare-view, .site-nav-wrap, .page-footer, .dash-nav` in `style.css`, so the dashboard body, about, how-to, legal, 404 and release content keep their current tokens until migrated. The **nav and footer, however, are the shared editorial chrome on every page** (see *Site chrome* below).

**Scoped tokens** (override the global ones only inside these wrappers): `--paper #f3f0e6` (page), `--canvas #fffdf9` (cards/inputs), `--ink #17181c`, `--body-text #3a3d44`, `--muted #726f64`, `--hairline #d9d2bd`, radii `--r-sm 4px / --r-md 8px / --r-lg 14px`, and the font vars `--serif` (Newsreader) and `--mono` (DM Mono). The global `{colors.bg-page}` is now `#f3f0e6` (was `#f0f0e8`) so the body, nav and footer share one paper tone on every page.

**Accent:** the coral is the *global* `{colors.brand-red}` (#e8503a), not the canvas's darker `#c8402a` — so the logo, the italic emphasis word in each headline ("gamified.", "worse?"), the quote mark, step numerals, the compare percentage, VS badge, and the unlocked landing badge all match. `{colors.ach-accent}` is no longer used on the landing view (the unlocked showcase badge uses brand-red by design decision; this supersedes the `showcase-badge` note below).

**Typography:** Newsreader (500; italic for emphasis and quotes) is loaded only on `index.html` and `compare.html` and is used for display headings, pulled quotes, section titles and the compare "vs". DM Mono carries eyebrows (`.landing-eyebrow`: 11px, +14% tracking, uppercase), stat figures and status text. DM Sans stays the UI/body face.

**Site chrome (every page)**
- **Nav** — the `.landing-nav` strip (logo left; How it works / Compare / About right; current page in ink/500 via `aria-current="page"`) inside `.site-nav-wrap` (1144px column, 24px side padding, 16px on mobile). Used on landing, compare, about, how-to, release, privacy, terms and 404. The old `dash-nav` + hamburger + "Turn your listening into identity" tagline are gone from those pages. The **dashboard** keeps its search box (and `dash-nav` class for the mobile search layout) but now uses the identical strip: it sits inside the same `.site-nav-wrap`, uses the `.landing-logo`, the same three text links on desktop, and the search box between them; it is no longer a sticky full-width bar. Compare is also in its mobile menu.
- **Footer** — `page-footer-split` on every page: "Powered by Last.fm" left, © / About / Privacy / Terms / Release Notes right on desktop; stacks and centers under 700px.
- **`page-shell`** — privacy, terms and 404 are single-card pages; they sit in a flex column (`.page-shell`, min-height 100vh) so the card fills the space between the nav and footer. The logo that used to sit inside those cards was removed because the nav now carries it.

**Components**
- **`landing-nav`** — logo + How it works / Compare / About on a hairline-bottomed strip. Below 400px "About" is hidden (the landing page previously had no nav, so nothing is lost).
- **`landing-hero`** — two columns (1.15fr / hairline / 0.85fr), stacks under 900px with the divider hidden. Search box keeps the original rounded input, drop shadow and round coral send button (deliberately *not* the canvas's square ink button).
- **`example-bubble`** (landing right column) — ink pulled-quote card rotating three real sample roasts (`HERO_EXAMPLES` in `app.js`) in 17px italic serif (16px on mobile). All roasts are rendered stacked in one grid cell (`.example-quote`, active one `is-active`), so the card is always as tall as the longest roast and rotating never shifts layout. Rotation is 7s, paused on hover/focus. No icon.
- **`stat-proof`** — mono figures (`250+` searched, `120+` roasted, constants in `app.js`), left-aligned over a hairline.
- **`showcase-badge`** — now cells of a joined hairline grid (1px gaps over `{colors.hairline}`, 8px radius) with a mono "unlocked"/"locked" status line. Unlocked: solid brand-red disc. Locked: 1.5px dashed `#c9c3ae` rim, `#a8a290` icon, lock badge with a canvas-colored border. 4 columns → 2 under 600px.
- **`compare-sample`** — the compare hero's ink "sample joint roast" card: two real roasts (`SAMPLE_ROASTS` in `compare.js`) rotating every 7s in 16px italic serif (15px on mobile), stacked in one grid cell so the card never changes height; paused on hover, and not rotated at all under `prefers-reduced-motion`. Hero is a 1.1fr/0.9fr grid, stacks under 900px; the card is hidden by JS (`#compareExampleBubble`) once results show.
- **Compare button** — 36px tall, 13px text, 4px radius (smaller than the shared 44px `button-primary`) so it sits comfortably inside the search window.
- **`compare-how-grid`** — *How it works* is a 3-up joined hairline grid (same recipe as the badge showcase): mono `01/02/03` in brand coral, 15px/600 title, 13px muted description. No visible heading (kept as a visually-hidden `h2` for screen readers). Stacks to one column under 600px. Copy follows the canvas.
- **`compare-recent`** — the "Recent roasts" marquee keeps its behavior unchanged (duplicated cards, 50s `compare-marquee` loop, pause on hover, reduced-motion fallback to a snap-scroll strip); only tokens changed: mono eyebrow heading, canvas cards with a hairline border and no shadow, mono coral percentage, serif italic "vs", edge fades now fade to `--paper`.
- **`compare-score-card`** — ink card, 14px radius, mono eyebrow/stamp, **88px serif** percentage in brand coral (64px on mobile; tabular numerals so the count-up doesn't jitter).
- **`compare-user-card`** — canvas + hairline, 8px radius, left-aligned: 44px avatar (real image, or ink disc with a serif initial), name, mono "You"/"Them" label, then Scrobbles and numbered Top Artists as plain text. A 36px brand-coral "VS" disc sits between the cards on desktop; on mobile the cards stack with the badge between them.
- **`compare-shared-label`** (Shared Setlist) — no card wrapper, serif section title; pills reuse the variety colors but with the canvas's darker teal `#2a5c50` and pink `#8a3d52` scoped to `.compare-view` for contrast.
- **`compare-joint-roast`** — canvas card, hairline border, 14px radius. States driven by `compare.js`: *idle* (title, consent line, ink "Generate Joint Roast"), *loading*, *result* (hairline rule under the title, serif italic roast, ghost "Generate again" button), *limit* (rule + the shared `roast-limit-hint` + the generate button visible but disabled), *error*. "Generate again" re-runs the same request and counts against the daily quota; when it is exhausted the card falls into the limit state. The loading spinner is a compact 16px/2px ring (the global 32px spinner is too heavy inside the card).

**Editorial guide pages (`about.html`, `how-to.html`)** — opt-in via `.editorial-page` on `.guide-page` (so `release.html`, which shares the old shell, is unaffected); 1144px column, 24px side padding (16px on mobile).
- **Header** — mono eyebrow, 44px serif H1 (38px on how-to; 32/30px on mobile) and an italic serif subtitle (about) or 14px muted line (how-to). `how-to` keeps a small mono "Back to search" link above it, because it carries the `?user=` param back to the dashboard.
- **Sections** — hairline top rule, 56px above, 32px padding, serif 24px title (21px on how-to).
- **About steps** — three columns with the step icons in brand coral (Font Awesome `fa-magnifying-glass` / `fa-chart-simple` / `fa-award`; no chip, no connector line); one column under 720px. Wording is unchanged.
- **About features** — joined hairline 3-up grid (same recipe as the landing badges and compare How it works). The search and compare icons are Font Awesome (`fa-magnifying-glass`, `fa-scale-balanced`, ink) with `fa-arrow-right` on the CTAs; the **AI Roast** card is deliberately left as it was (inline gradient flame tile and clock SVG). The three step icons are Font Awesome too. About loads the same Font Awesome 6.5.1 stylesheet as `index.html`. The CTA is a plain coral text link and "Unlocks after search" is a mono status line. One column under 720px.
- **About badges** — the Peerlist and Product Hunt embeds are unchanged, left-aligned, stacked on mobile.
- **How-to achievement rows** (`.guide-row`) — flat indexed list instead of the dashboard `ach-row` cards: mono `01…` index, 14px/500 name, 12.5px muted description right-aligned, and a mono coral "+150 XP" on lifetime rows only (daily rows still show no XP). Under 600px the name/description stack. The icons from the previous version were dropped to follow the canvas, and all 12 lifetime achievements are listed.
- **XP cards and tables** — 2-column grid of canvas/hairline cards (1 column under 720px); tables use mono uppercase headers and hairline rows; the level pill is outlined, and Level 10 keeps the solid `{colors.brand-red}` pill on an `{colors.ach-accent-tint}` row.

**Dashboard + dialogs (`#dashboardView`, `<dialog>`s in `index.html`)** — tokens come from the shared scope (`.dashboard-view` and `.ach-dialog` were added to it). Behavior and element IDs are unchanged; only markup that was purely decorative changed.
- **Layout** — a two-column grid (280px sidebar + flexible main, 40px gap) in the same 1144px column / 24px gutters as the nav; the sidebar is sticky (24px from the top). Under 900px it collapses to one column (sidebar on top, 16px padding) and stops being sticky.
- **Sidebar** — ink, 14px radius. 72px avatar with a 2px coral ring; serif username; mono uppercase coral level pill; 2px XP track with the coral→accent gradient and a mono `current / max XP` label; "Activity timeline" is a mono eyebrow over numbered `01`/`02` rows (the old icon chips were removed).
- **"How XP works" tooltip** — same trigger and content; the card now uses a hairline border, 8px radius, a softer single shadow (`0 16px 40px`) and a rotated-square arrow, per the canvas's Tooltip artboard.
- **Stats card** — canvas + hairline (no shadow). Mono eyebrow title, 26px serif coral level, mono percent, 3px track. The six stats are a joined hairline grid (3 columns; 2 under 900px) with mono uppercase labels and mono values (24px; 20px for the longer text values; 20/16px on mobile). The decorative label icons were removed.
- **Achievement lists** — no card wrapper: mono eyebrow, a serif subtitle ("Reset every day", "Permanent milestones"), then flat hairline rows: mono `01…` index, **Font Awesome icon drawn plain** (no chip; coral when unlocked, `#9a968a` when locked), name/description, and on the right a mono `unlocked`/`locked` status on **daily** rows or the "+150 XP" pill (coral on `{colors.ach-accent-tint}` when unlocked, plain grey when locked) on **lifetime** rows. Daily rows still never show XP. Rows remain buttons that open the achievement dialog. The "Roast Me", "Start Scrobbling" and "Compare Yourself →" buttons are 4px-radius ink buttons.
- **Dialogs** — canvas, 14px radius, soft shadow, no border; × in the top-right. Under 900px they remain bottom sheets (14px top corners). *Achievement dialog*: mono status chip (coral on tint when unlocked, grey on paper when locked), 22px serif title, muted requirement. The date line under it is left exactly as before (no "Unlocked …" prefix — there is no unlock-date data for it yet); when a date does exist it renders as a mono coral timestamp. *Roast consent*: two centered tone cards (selected = 1.5px ink border; Casual icon ink, Savage icon coral; the corner check badge is hidden), 19px serif title, 12.5px body/list, ghost Cancel + ink Roast Me. *Roast result*: an **ink** dialog — white serif title, outlined mono "N roasts left today" chip (coral when exhausted), 16.5px serif-italic roast, ghost Retake/Share (Font Awesome icons) and a coral Close; the limit hint is a translucent panel on the dark surface. *Roast loading*: same canvas dialog with a serif title and a 3px progress track.

**Mobile rules:** hero grids and the compare user grid collapse to one column; the compare input row keeps its existing stacked layout (inputs full-width with a ruled "vs" divider, full-width Compare button); content padding drops to 16px; the nav wrapper uses 16px side padding.

## Colors

### Core

- **Primary / Ink** (`{colors.primary}` / `{colors.ink}` — #181d26): Same value, two names for the same role — the dashboard sidebar background, primary button background, and the strongest text color.
- **Primary Active** (`{colors.primary-active}` — #0d1218): Press state for ink buttons; also used as the darker stop in the ink-groove gradient on vinyl badge rims.
- **Canvas** (`{colors.canvas}` — #ffffff): Card and input surfaces.
- **Page Background** (`{colors.bg-page}` — #f3f0e6): The warm paper tone every page sits on.
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

- **Ach Teal / Blue / Brown / Pink / Green / Purple** (`#2a7c6f #3d5a8a #6b4a2a #c0446a #3a7a4a #5a3a8a`): A six-color cycle, used for two specific fixed-category cases — the "Shared Setlist" artist-name pills on the compare results page (open-ended list, solid pill + white text), and the three `release-tag` chips on `release.html` (Feature/Fix/Design, tint background + colored text — see `release-tag` below). Both are legitimate categorical variety for a small number of known categories, not a branding decision — don't read it as license to reintroduce multi-hue accents elsewhere.
- **Tints** (`--ach-green-tint #ebf2ed`, `--ach-blue-tint #eceff3`, `--ach-purple-tint #efebf3`): Light backgrounds for the subset of the variety palette used in `release-tag` chips, following the same "tint bg + solid-color text" recipe as `{colors.ach-accent-tint}`.

### Legacy (removed)

- **Sage** (`{colors.legacy-sidebar-bg}` — #8db87a) and **Sage Deep** (`{colors.legacy-sage-deep}` — #2e5036): The old sidebar/verdict-card green. Fully removed from `style.css` as of the `compare.html`/`about.html` migration — no page references these tokens anymore. Don't reintroduce them.

## Typography

**Font family:** DM Sans (400/500/600) for all UI text (Newsreader serif is added on the landing view and compare page — see *Refined Editorial*), with the system fallback stack `-apple-system, BlinkMacSystemFont, sans-serif`. DM Mono (400/500) is used narrowly for numeric/mono accents — the compare page's compatibility percentage, its "01/02/03" step numbers, and section eyebrow labels like "YOUR MATCHUP" — anywhere a small-caps monospace numeral reads as more "data-like."

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

**`sidebar`** (dashboard; see *Refined Editorial* above for the current version) — Ink background, `{rounded.xl}`. Avatar ring is `{colors.brand-red}`; the level-number pill is a solid `{colors.brand-red}` fill; the mini XP bar is the brand-red→ach-accent gradient on a `rgba(255,255,255,.25)` track. Small chips (activity-timeline icons) are `rgba(255,255,255,.1–.2)` regardless of their legacy `.green`/`.blue` class names — those class names are cosmetic leftovers, not a color system.

**`stat-box`** (now a tile in the joined hairline grid — see *Refined Editorial*) — All tiles in a stats grid use the same neutral treatment: `{colors.surface-soft}` background, `{colors.hairline}` border. There is deliberately no spotlighted/accent tile — every tile in a card reads as equal-weight data, not a hierarchy of importance.

**`ach-row`** (superseded on the dashboard by the indexed hairline row in *Refined Editorial* above — the card/chip recipe below is the pre-redesign version; achievement icons are still Font Awesome) (achievement list item, used for both Daily and Lifetime achievements via one shared renderer; also reused statically on `how-to.html`'s Achievement Guide, always in the `ach-unlocked` visual since the guide has no per-user unlock state to reflect) — Unlocked: `{colors.ach-accent-tint}` row background, bold ink name, `{colors.ach-accent}` unlock-date text, a circular icon chip filled `{colors.ach-accent}` with a white icon, and (lifetime achievements only) a white pill reading "+150 XP" in `{colors.ach-accent}`. Locked: `{colors.ach-locked-bg}` row background, muted name/desc, a circular icon chip in `{colors.ach-locked-chip}`/`{colors.ach-locked-icon}` with a muted-ring border, and for lifetime achievements the same "+150 XP" text with no pill background (signals "not yet earned" vs. "earned"). **Daily achievements never show an XP tag** — they're excluded from XP entirely in `backend/achievements.py`'s `calculate_xp()`.

**`showcase-badge`** (landing page badge preview; superseded by the *Refined Editorial* version above — the text below is the pre-redesign recipe) — A two-layer "vinyl record" shape: an outer rim (`.showcase-ring`, 60px) around an inner label (`.showcase-ring-fill`, 44px unlocked / 60px... see note below). Unlocked: rim is transparent, label fills the full 60px in `{colors.ach-accent}` with a white icon (no separate dark rim — removed after initial drafts made it look like a black ring). Locked: rim is a 2px dashed `#c7c3b4` circle showing the page background through the gap, label is a smaller 44px `#e9e7de` circle with a `#b0aca0` icon and a small lock badge (`{colors.muted}` circle, white lock icon, bg-page border) overlapping the bottom-right edge.

**`ach-dialog`** (achievement detail modal; current styling in *Refined Editorial* above) — White card, `{colors.hairline}` border, `{rounded.lg}`. Status chip: `{colors.ach-accent-tint}`/`{colors.ach-accent}` when unlocked, `{colors.surface-strong}`/`{colors.muted}` when locked.

**`compare-score-card`** (compare page verdict card; see *Refined Editorial* above for the current serif/hairline version) — Same ink-surface-plus-coral-highlight pattern as the sidebar: `{colors.primary}` background, white heading/label/stamp text, and the compatibility percentage itself in `{colors.ach-accent}`. The two head-to-head user cards below it (`.compare-user-card`) stay neutral white/ink — a `{colors.primary}` circular "VS" badge sits on the dotted divider between them (also shown as a horizontal divider on mobile, not hidden), and each side's top 3 artists are listed as plain numbered text, deliberately not accent-colored, to keep the ranked list reading as equal-weight data per the `stat-box` rule.

**`roast-limit-hint`** (shown inside the roast result dialog on `index.html`, and inline on the joint-roast card on `compare.html`, once the daily roast quota is exhausted) — `{colors.ach-accent-tint}` background, `{rounded.md}` corners, title text in `{colors.ach-accent}`. Reads as a gentle limit notice, not a hard error — same treatment as `toast` below, not a red/black alert box.

**`roast-remaining-chip`** (roast result dialog on `index.html`, above the roast text) — same status-chip recipe as `ach-dialog`'s status pill: `{colors.surface-strong}`/`{colors.muted}` while roasts remain, switching to `{colors.ach-accent-tint}`/`{colors.ach-accent}` once exhausted (`.is-exhausted`). Sits beside the `roast-retake-btn` ghost button, which disables itself in the same exhausted state.

**`toast`** (compare page, transient validation feedback — e.g. submitting Compare with an empty username) — Fixed to the bottom center of the viewport, `{colors.ach-accent-tint}` background with a 1px `{colors.ach-accent}` border and `{colors.ach-accent}` text, `{rounded.md}` corners. Fades in/out; auto-dismisses after ~2.5s.

**`release-entry`** (`release.html`, one changelog item) — Flat row, `{colors.hairline}` bottom border (no card wrapper), a fixed-width `release-tag` chip on the left and title/description stacked on the right. The `release-tag` chip is tint background + colored text — `release-tag-feature` (green), `release-tag-fix` (blue), `release-tag-design` (purple) — using the variety-accent tints (see Variety accent above), never `{colors.brand-red}`/`{colors.ach-accent}` since those stay reserved for brand/achievement use.

**`roast-share-card`** (client-side canvas export from the roast result dialog, `app.js`'s `buildShareCardCanvas()`) — A 1080×1080 image reusing the dashboard sidebar's identity-block recipe verbatim: `{colors.primary}` background, `{colors.brand-red}` avatar ring, `{colors.brand-red}` level pill, brand-red→ach-accent XP gradient bar. The roast quote is the dominant element (poster treatment — one big readable thing), with a small `{colors.ach-accent}`-colored decorative quote mark above it. Not a live DOM component — it only exists as canvas-drawn pixels, so its styling is duplicated in JS rather than reading `style.css`; keep it in sync by hand if the sidebar recipe changes.

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
