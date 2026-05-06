# Learning Logic — Bornomala

**Last updated**: 2026-05-06

> **Updated to v2** — see [`docs/LEARNING-ALGORITHM.md`](LEARNING-ALGORITHM.md) for the full algorithm spec. This file is the higher-level overview; the spec is the source of truth.

---

## Teaching Model

Bornomala currently uses a teacher-assisted recall model:

1. The app shows only the Bangla glyph.
2. The learner answers out loud or points/identifies.
3. A human teacher decides whether the answer was correct.
4. The app records the outcome and selects the next item.

This keeps the learner focused on recognition and avoids adding audio recognition, typing, or tracing before the core learning loop is proven.

---

## Card Model

Each card represents one Bangla learning item.

| Field | Meaning |
|---|---|
| `id` | Stable identifier, e.g. `vowel-01` |
| `letter` | Bangla glyph shown on the card |
| `group` | `vowel`, `vowelSign`, or `consonant` |
| `order` | Default teaching order |

Current decks live in `data/banglaLetters.ts`:

| Export | Purpose |
|---|---|
| `VOWEL_CARDS` | Bangla independent vowels |
| `VOWEL_SIGN_CARDS` | Bangla vowel signs displayed with a dotted circle prefix in the UI |
| `CONSONANT_CARDS` | Bangla consonants |
| `PRACTICE_PRESETS` | Teacher-facing practice groups |

---

## Progress Model (v2)

Each card carries enough state to drive a streak-based, adaptive scheduler:

| Field | Meaning |
|---|---|
| `correctCount` / `wrongCount` / `seenCount` | Cumulative counters |
| `streak` | Current consecutive correct; resets to 0 on a wrong; only counts after warm-up |
| `bestStreak` | Highest streak ever seen for this card |
| `mastered` | **Sticky** — set true the first time `streak ≥ 10` and never unset |
| `penalty` / `consecutiveMistakes` | Mistake debt; doubles per consecutive wrong (cap 16); halves on correct |
| `recentResults` | Rolling window of the last 6 outcomes (`'c'` / `'w'`) |
| `attemptsSinceEnteringActive` | Drives the newcomer visibility boost |
| `cardsShownSinceMastered` | Drives the post-mastery quiet period before sprinkles |
| `sprinkleCooldown` | Cards remaining before a mastered card may sprinkle again |
| `firstSeenAt` / `lastSeenAt` | ISO timestamps |

Progress is persisted in `AsyncStorage` under a versioned envelope (`schemaVersion: 2`). Legacy v1 data migrates automatically; mastery and counts are preserved, streak/penalty start fresh.

A separate **session state** (`activeSet`, `cardsShown`, `recentGrades`, `inStruggleMode`, `previousCardId`, etc.) is rebuilt at session start and is never persisted. Per-card state always carries across sessions.

---

## Unlock Logic (v2)

The path is opened gradually:

1. The session starts with an **active set of 2 cards** (the first un-mastered cards on the path).
2. On the first **counted-correct** (the 6th correct on any active card, after the 5-rep warm-up clears), the active set grows to **3**.
3. On every mastery thereafter, 1-for-1 replacement: the mastered card leaves the active set, the next un-touched path card joins.
4. There is no "big batch" unlock. The active set stays at 3 until path complete.
5. When the entire path is mastered, the algorithm enters **path-complete state**: only mastered cards are surfaced via the sprinkle rule (UI celebration deferred).

---

## Next Card Logic (v2)

Selection is driven by a **visibility score** computed every grade. Higher score = more likely to be the next card.

Hard rules (return 0 outright):
- Anti-immediate-repeat: `card.id === state.previousCardId` returns 0 unless the active set has only one card (single-card fallback).
- Mastered cards return 0 unless they're eligible for a sprinkle.

Additive terms when un-mastered:
- `W_BASE` (1) — every active card gets a baseline.
- Newcomer boost — a card just added to the active set carries an extra 8 that decays linearly over 8 attempts.
- `W_RECENT_MISS` (4) when the last graded result was a wrong.
- `W_PENALTY × penalty` (1.5×) — surfaces struggling cards.
- `W_STREAK_GAP × (10 − streak) × 0.3` — farther from mastery → more reps.
- `W_FRESHNESS × min(cardsAgoSeen, 5) × 0.5` — gentle variety nudge.

Sprinkle (mastered + eligible) → score = `W_SPRINKLE` (2.5). Eligibility: cooldown is 0, every 7th card shown, not in struggle mode, past the 10-rep newly-mastered quiet period.

The next card is picked by **weighted-random** sample over non-zero scores — not argmax — to avoid deterministic ping-pong patterns.

**Struggle mode** kicks in when 2+ wrongs land in the last 6 grades; the active set shrinks to the 2 cards with the highest `struggleScore`. Six consecutive corrects in the session exit struggle mode and restore the original active set.

For the full algorithm — every weight, every transition, the worked example — see [`docs/LEARNING-ALGORITHM.md`](LEARNING-ALGORITHM.md).

## Practice Preset Logic

The teacher can choose a preset without logging in. The selected preset controls:

- the cards shown in the practice screen
- the cards shown in the letters grid
- the total progress denominator
- the unlock sequence for that practice group

The UI also supports filters for unlocked, all, needs-work, and mastered cards within the selected preset. If a filter would produce no cards for practice, the app falls back to unlocked cards so the session can continue.

---

## Future Learning Extensions

- Teacher-selected custom letter sets
- Practical words built from known letters
- Per-session history
- Daily review scheduling
- Per-learner progress
- Configurable mastery target
