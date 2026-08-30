# how-to.html Revamp Plan

Status: **implemented on `feat/revamped-guide-page`, not yet reviewed/merged.**
This was the last page in the design rollout (see `DESIGN.md` → Rollout
status) — everything else (landing, dashboard, compare, about, legal, 404)
already shipped the ink + coral system. Implementation follows the plan
below; the "Implementation checklist" section tracks what's done.

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
| Section header icon lockup | `about.html` step-icon / feature-icon recipe (`--ach-accent-tint` bg, `--ach-accent` icon, `--rounded-md`) — new `.guide-section-icon` class |
| Achievement row (daily/lifetime) | The actual production `.ach-row.ach-unlocked` / `.ach-icon-wrap` / `.ach-text` / `.ach-name` / `.ach-desc` / `.ach-xp` classes from the dashboard's shared renderer — reused directly, not reimplemented, since the guide's markup can just hand-write the same DOM shape the renderer builds at runtime |
| Achievement icons | The real per-achievement Font Awesome classes from `app.js`'s `ACHIEVEMENT_ICONS` map (e.g. `fa-door-open`, `fa-headphones`, `fa-infinity`) — same icon a user sees on the dashboard for that badge |
| "+150 XP" pill | `.ach-xp` under `.ach-row.ach-unlocked` — same class, same visual, no new CSS needed |
| "Unique Artists" card icon | `about.html`'s "Compare tastes" two-circle icon |
| Level 10 pill | Dashboard's current-level pill recipe (`--brand-red` solid, white text) — new `.guide-level-pill` / `.guide-level-max` classes, since the dashboard's own `.level-badge` is sized for the sidebar header, not a table cell |

No new CSS custom properties. **Deviation from the original plan:** rather
than inventing parallel `guide-ach-row`/`guide-icon-lockup` classes, the
achievement rows reuse the dashboard's real `.ach-row` family directly —
simpler and guarantees pixel-parity with the dashboard for anything that
already exists there. Only genuinely new pieces (section icon lockups, XP
card icons, the level pill) got new `guide-*`-prefixed classes. The guide
always renders every row in the `ach-unlocked` visual, since it has no
per-user unlock state to reflect — it's documentation, not live data.

## Implementation checklist

- [x] Add the new `guide-*` component styles to `style.css`, near the
      existing `guide-*` block.
- [x] Update `how-to.html` markup for all four sections per above —
      preserve every existing `id`/class hook used by `app.js` /
      `tracking.js` (mobile menu, back-link `href` rewrite for `?user=`).
- [x] Re-checked the existing `@media (max-width: 600px)` block for
      `.guide-page` / `.guide-xp-grid` — no changes needed: `.ach-row`'s
      existing `.ach-text { min-width: 0 }` + `.ach-name`'s ellipsis and
      `.ach-xp { flex-shrink: 0 }` already handle narrow widths (they're
      the same rules the dashboard relies on), and the new section/card
      icons are small and flex-shrink:0 by their own box model.
- [x] Updated `DESIGN.md`'s Rollout status table and the `ach-row`
      Components entry to reflect the new icon/row treatment.
- [x] No automated visual tests or test suites were run — verification is
      manual, by the user, same as every other page in this rollout.

## Branch & commit conventions for this work

- Work happens on `feat/revamped-guide-page`, not directly on `master`.
- Commits stay brief, conventional-style (`feat: revamp achievement guide
  page`, etc.) — no long-form commit bodies unless something non-obvious
  needs explaining.
- Nothing merges or ships until the user reviews the rendered result
  themselves.
