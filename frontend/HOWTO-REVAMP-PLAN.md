# how-to.html Revamp Plan

Status: **drafted, not implemented.** This is the last page in the design
rollout (see `DESIGN.md` → Rollout status) — everything else (landing,
dashboard, compare, about, legal, 404) has already shipped the ink + coral
system. This page is a planning document only; no HTML/CSS changes have
been made yet.

Mockup reference: the "How It Works / Achievement Guide" artboard on the
shared design canvas (same canvas as the other rollout pages).

## Why this page still needs work

`how-to.html` already uses the *correct tokens* — `--ink`, `--muted`,
`--hairline`, `--surface-soft` — so it was marked "already compliant" in
`DESIGN.md`. That's true in the narrow sense (no legacy green/purple), but
it's the flattest page on the site: plain tables, no icons, and zero use of
`--brand-red` / `--ach-accent`, on a page that is *literally* the
achievement guide. Every sibling page now has icon lockups, badge motifs,
or coral accents; this one reads like a stray docs page next to them.

## What changes (and what doesn't)

**Preserved exactly, no exceptions:**
- All copy/wording — every achievement name, requirement string, XP number,
  and level threshold stays byte-for-byte identical. This is a visual-only
  pass.
- Every color used is an existing token already defined in `style.css` /
  documented in `DESIGN.md`. No new hex values.
- Type ramp, spacing scale (`--spacing-*`), radii (`--rounded-*`), and
  shadow tokens — reused as-is, nothing new introduced.
- Nav header, back-link, footer — unchanged structurally.
- All four sections stay in their current order and grouping (Daily →
  Lifetime → XP calculation → Level thresholds).

**Visual changes:**

1. **Section headers** — each `h2.guide-section-title` gains a small
   (32px) icon lockup to its left: `--ach-accent-tint` background,
   `--ach-accent` icon, `--rounded-md` corners. Reuses the exact icon-lockup
   recipe already shipped on `about.html`'s step/feature icons — just
   smaller. One icon per section (calendar/sun → Daily, star → Lifetime,
   lightning → XP, bars → Levels), inline SVG, stroke-based, matching the
   existing icon style (2px stroke, round caps).

2. **Daily & Lifetime achievement tables** — replace the plain
   `<table class="guide-table">` rows with the same achievement-row pattern
   already used on the dashboard (`ach-row` in `DESIGN.md`): a circular
   icon chip (star glyph, `--ach-accent-tint` fill / `--ach-accent` stroke)
   + name + requirement, in a `guide-card`. Lifetime rows keep a `+150 XP`
   pill (`--ach-accent` text on `--ach-accent-tint`, `--rounded-pill`) on
   the right, matching the existing "+150 XP" tag already used in the
   dashboard's lifetime achievement list. Daily rows show no XP tag — 0 XP
   is correct per `backend/achievements.py`'s `calculate_xp()`, and the
   dashboard already follows this rule.
   - All **12** lifetime achievements render, not a subset — the canvas
     mockup only showed 6 for space; the real page keeps every row.

3. **XP calculation cards** (`.guide-xp-grid`) — each of the 4 cards
   (Scrobbles XP, Unique Artists XP, Achievements XP, Bonus XP) gets a
   small (30px) icon matching its content: headphones, two overlapping
   circles (reused from `about.html`'s "Compare tastes" icon), star (same
   glyph as the achievement rows), and a plus-in-circle for bonus. XP
   values in each mini-table switch from plain bold black to
   `--ach-accent` bold, consistent with how XP numbers are colored
   everywhere else in the product.

4. **Level Thresholds table** — the level number becomes a pill (
   `--surface-strong` bg / `--muted` text for levels 1–9, matching the
   existing neutral pill style) and Level 10 — the max level — gets the
   solid `--brand-red` pill treatment the dashboard already uses for the
   current-level badge, plus a subtle `--ach-accent-tint` row background,
   so the max tier reads as a clear destination rather than just another
   row.

## Component reuse map

| New element | Reuses |
|---|---|
| Section header icon lockup | `about.html` step-icon / feature-icon recipe (`--ach-accent-tint` bg, `--ach-accent` icon, `--rounded-md`) |
| Achievement row (daily/lifetime) | `ach-row` pattern from `DESIGN.md` (dashboard achievement list) |
| "+150 XP" pill | Existing dashboard lifetime-achievement XP pill |
| Star glyph | Same path already used for achievement icons in the dashboard/badge components |
| "Unique Artists" card icon | `about.html`'s "Compare tastes" two-circle icon |
| Level 10 pill | Dashboard's current-level pill (`--brand-red` solid, white text) |

No new CSS custom properties. New class names follow the existing
`guide-*` prefix (e.g. `guide-ach-row`, `guide-icon-lockup`,
`guide-level-pill`) rather than reusing dashboard-specific class names
directly, since the DOM structure differs slightly (no unlock state to
toggle here — the guide always renders in the "available" visual, not
locked/unlocked).

## Implementation checklist (for when this rolls out)

- [ ] Add the new `guide-*` component styles to `style.css`, near the
      existing `guide-*` block.
- [ ] Update `how-to.html` markup for all four sections per above —
      preserve every existing `id`/class hook used by `app.js` /
      `tracking.js` (mobile menu, back-link `href` rewrite for `?user=`).
- [ ] Re-check the existing `@media` block for `.guide-page` /
      `.guide-xp-grid` (mobile stacks XP grid to 1 column) — confirm the
      new achievement rows and icon lockups reflow correctly at narrow
      widths; don't regress the existing mobile-safe behavior.
- [ ] Update `DESIGN.md`'s Rollout status table: flip `how-to.html` from
      "✅ Already compliant" to reflect the new icon/row treatment, and
      add the `ach-row`-on-guide-page note to the Components section.
- [ ] No automated visual tests or test suites — verification is manual,
      by the user, same as every other page in this rollout.

## Branch & commit conventions for this work

- Work happens on `feat/revamped-guide-page`, not directly on `master`.
- Commits stay brief, conventional-style (`feat: revamp achievement guide
  page`, etc.) — no long-form commit bodies unless something non-obvious
  needs explaining.
- Nothing merges or ships until the user reviews the rendered result
  themselves.
