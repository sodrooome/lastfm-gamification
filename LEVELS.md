# Level Progression System

## Overview

The level system combines five XP sources into a single pool that drives progression across **10 levels** (0–2,585 max XP).

| Source | Max XP | % of Raw |
|---|---|---|
| Scrobbles | 785 | 27.2% |
| Achievements | 1,800 | 62.4% |
| Unique Artists | 300 | 10.4% |
| **Raw total** | **2,885** | **100%** |
| **Capped at** | **2,585** | |

---

## Level Thresholds

| Level | Cumulative XP Required | XP from Previous Level |
|---|---|---|
| 1 | 0 | — |
| 2 | 110 | 110 |
| 3 | 275 | 165 |
| 4 | 500 | 225 |
| 5 | 775 | 275 |
| 6 | 1,100 | 325 |
| 7 | 1,450 | 350 |
| 8 | 1,800 | 350 |
| 9 | 2,150 | 350 |
| 10 | 2,585 | 435 |

XP increases are not linear — they escalate to reward sustained engagement.

---

## XP Sources

### 1. Scrobbles (Cumulative Playcount)

Each tier is **cumulative**, meaning reaching a higher threshold automatically grants XP from all lower tiers.

| Playcount Threshold | XP Awarded |
|---|---|
| 1 | 5 |
| 100 | 20 |
| 1,000 | 40 |
| 10,000 | 80 |
| 100,000 | 180 |
| 1,000,000 | 460 |
| **Max** | **785** |

**Example:** A user with 15,000 scrobbles earns:
- 5 (tier 1) + 20 (tier 2) + 40 (tier 3) + 80 (tier 4) = **145 XP**

### 2. Achievements (Per Unlock)

Each unlocked achievement grants a flat **150 XP**. There are 12 total lifetime achievements available.

| # of Unlocked Achievements | XP Awarded |
|---|---|
| 1 | 150 |
| 2 | 300 |
| 3 | 450 |
| 4 | 600 |
| 5 | 750 |
| 6 | 900 |
| 7 | 1,050 |
| 8 | 1,200 |
| 9 | 1,350 |
| 10 | 1,500 |
| 11 | 1,650 |
| 12 | 1,800 |

**Available achievements:**
1. **Welcome to the Club, Folks!** — 1+ total scrobbles
2. **A New Journey Ahead** — 1,000+ total scrobbles
3. **Obsessive Listener, Huh** — 10,000+ total scrobbles
4. **Even AI Can't Stop Me** — 100,000+ total scrobbles
5. **No Life? Pure Life** — 1,000,000+ total scrobbles
6. **Your Loved Ones** — 1+ unique top artists
7. **Explorer** — 100+ unique top artists
8. **How About Touch Some Grass?** — 1,000+ unique top artists
9. **Are You an Elitist or Identity Crisis?** — 5,000+ unique top artists
10. **LGTM** — 10,000+ unique top artists
11. **Spotify Wasn't Even Born Yet** — Account registered 10+ years ago
12. **The Completion** — Profile has real name, image, and country set

### 3. Unique Artists (Cumulative Milestones)

Each tier is **cumulative**, meaning reaching a higher artist count grants XP from all lower tiers.

| Unique Artists Threshold | XP Awarded |
|---|---|
| 50 | 30 |
| 100 | 60 |
| 500 | 90 |
| 1,000 | 120 |
| **Max** | **300** |

**Example:** A user with 750 unique artists earns:
- 30 (tier 1) + 60 (tier 2) + 90 (tier 3) = **180 XP**

---

## Calculation Formula

```
total_xp = scrobbles_xp + (achievements_count × 150) + artists_xp
total_xp = min(total_xp, 2585)
```

The result is capped at the max XP (2,585). Once a user hits the cap, no additional XP is earned.

### Level Determination

The level is determined by finding the highest threshold the user's total XP meets or exceeds:

```python
level = 1
for threshold in LEVEL_THRESHOLDS:
    if total_xp >= threshold:
        level = index + 1
```

### Progress Percentage

```
progress_pct = (total_xp / MAX_XP) × 100
```

---

## Example Calculations

### Casual Listener

- **Scrobbles:** 5,000 → 5 + 20 + 40 = 65 XP
- **Achievements:** 3 unlocked → 3 × 150 = 450 XP
- **Unique Artists:** 25 → 0 XP
- **Total:** 515 XP → **Level 4** (775 required for Lv 6)
- **Progress:** 515 / 2,585 = 19.9%

### Active Listener

- **Scrobbles:** 500,000 → 5 + 20 + 40 + 80 + 180 = 325 XP
- **Achievements:** 7 unlocked → 7 × 150 = 1,050 XP
- **Unique Artists:** 600 → 30 + 60 + 90 = 180 XP
- **Total:** 1,555 XP → **Level 7** (1,800 required for Lv 8)
- **Progress:** 1,555 / 2,585 = 60.2%

### Power Listener (Maxed)

- **Scrobbles:** 1,000,000+ → 785 XP
- **Achievements:** 12 unlocked → 1,800 XP
- **Unique Artists:** 1,000+ → 300 XP
- **Raw total:** 2,885 XP — **capped at 2,585 XP**
- **Total:** 2,585 XP → **Level 10**
- **Progress:** 100%

---

## Files

| File | Responsibility |
|---|---|
| `backend/achievements.py` | XP calculation logic, level thresholds, helper functions |
| `backend/main.py` | Calls `calculate_xp()`, returns XP data in API response |
| `frontend/index.html` | Progress bar DOM structure, tooltip content |
| `frontend/style.css` | Progress bar styling, tooltip styles |
| `frontend/app.js` | Renders progress bar width and label from API data |
