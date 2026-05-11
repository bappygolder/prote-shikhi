# Algorithm — Bornomala Learning System

**Last updated**: 2026-05-11

---

## Overview

Bornomala uses a **Memory Spaces + Cycle + Level** algorithm. Cards are not shown randomly. Instead, a small working set of 2–4 cards ("memory spaces") rotates through the learner's attention in predictable cycles. Cards advance through mastery levels based on consecutive correct answers, and the working set grows or shrinks based on performance.

**Three concepts govern everything:**

| Concept | What it is |
|---|---|
| **Level** | Per-card mastery progress (0–3), advanced by streaks of 5 correct answers |
| **Memory Space** | A slot in the active working set (2–4 slots total) |
| **Cycle** | One complete pass through all active cards — every card shown exactly once |

---

## Level System

Each card has a mastery level from 0 to 3.

| Level | Color | Meaning |
|---|---|---|
| 0 | Gray | Being introduced |
| 1 | Blue | Learning |
| 2 | Purple | Session mastery — card exits active spaces |
| 3 | Green | Long-term mastery (data model only; UI/logic not yet built) |

**Advancing a level:** answer correctly 5 times in a row (`CORRECT_PER_LEVEL = 5`). The streak counter is `levelCorrect`.

**Wrong answer:** resets `levelCorrect` to 0 within the current level. The level number itself does NOT drop. Example: at level 1, progress 3/5 — wrong answer → level 1, progress 0/5. Not level 0.

**Session mastery:** `mastered = true` when `level >= SESSION_MASTERY_LEVEL (2)`. A mastered card graduates out of the active spaces.

---

## Memory Spaces

The active spaces are a small working set of cards being practiced simultaneously.

```
WAITING POOL (all unmastered cards, in path order)
       │  card enters when a space opens
       ▼
ACTIVE SPACES [A] [B] [C]  (starts at 2, grows to max 4)
       │  every cycle shows each card once, in rotation
       │  cards advance through levels 0 → 1 → 2
       │  when level 2 reached → card graduates
       ▼
GRADUATED POOL (session-mastered cards)
```

**Bounds:** minimum 2 spaces (`SPACES_MIN`), maximum 4 spaces (`SPACES_MAX`). The set starts at 2 (`SPACES_INIT`).

Cards in the waiting pool are ordered by path position. The first unmastered card in the path always fills the next available space.

---

## Cycle Mechanics

A **cycle** is one complete pass through all active spaces — every card shown exactly once per cycle.

### Cycle Order Rules

At the start of each cycle, cards are ordered as follows:

1. **Wrong-flagged cards first** — cards with `wrongFlag = true` (got wrong in the previous cycle) appear at the front
2. **New cards next** — cards not seen in the last 3 cycles (`NEW_CARD_PRIORITY_CYCLES = 3`) get front placement
3. **Remaining cards shuffled** — Fisher-Yates shuffle on the rest
4. **Anti-repeat check** — if the new order matches any of the 3 most recent cycle orders, reshuffle (up to 3 attempts), then accept the result as an edge case

### Card Selection Within a Cycle

`chooseNextCard()` returns `cycleQueue[cycleIndex]`. The order is fixed at cycle start — no dynamic re-ordering mid-cycle.

One hard rule: the same card is never shown twice in a row (`previousCardId` check). This is enforced as a hard block, separate from the cycle queue.

### End of Cycle

`tickCycle()` runs at the end of every cycle in this order:

1. **Graduate** cards at level ≥ 2 → move to graduated pool, pull next card from waiting pool (Trigger B)
2. **Grow** if 3 consecutive all-correct cycles → add 1 card from waiting pool, reset counter (Trigger A)
3. **Shrink** if >2 wrong answers this cycle AND spaces > 2 → remove weakest card, reset growth counter
4. **Build** the next cycle queue

---

## Space Growth and Shrink

| Trigger | Condition | Effect |
|---|---|---|
| **A — consistent performance** | 3 all-correct cycles in a row | +1 card from waiting pool (spaces grow) |
| **B — graduation** | Card reaches level 2 | Graduated card leaves; next waiting card enters |
| **Shrink** | >2 wrongs in one cycle AND spaces > 2 | Remove weakest card; reset growth counter |

The set grows from 2 → 3 → 4 as the learner performs well. It shrinks when they struggle, keeping the working set at a manageable size. It never drops below 2 or exceeds 4.

---

## Global Progress Bar

The progress bar reflects all cards in the current path, not just active ones.

```
Per card max    = SESSION_MASTERY_LEVEL × CORRECT_PER_LEVEL   = 10
Per card earned = min(level × CORRECT_PER_LEVEL + levelCorrect, 10)
Global %        = sum(earned across all path cards) / (10 × total cards) × 100
```

100% means every card in the path has reached session mastery (level 2). The bar advances on every correct answer, including cards still in the waiting pool (earned = 0 until they enter active spaces).

---

## Key Constants

Defined in `lib/learning.ts`.

| Constant | Value | Meaning |
|---|---|---|
| `LEVEL_COUNT` | 4 | Total levels (0–3) |
| `CORRECT_PER_LEVEL` | 5 | Consecutive correct answers to advance one level |
| `SESSION_MASTERY_LEVEL` | 2 | Level at which a card is considered session-mastered |
| `SPACES_INIT` | 2 | Starting number of memory spaces |
| `SPACES_MIN` | 2 | Minimum spaces (floor) |
| `SPACES_MAX` | 4 | Maximum spaces (ceiling) |
| `CYCLES_TO_GROW` | 3 | All-correct cycles needed to trigger growth |
| `CYCLE_WRONGS_TO_SHRINK` | 2 | Wrongs in one cycle that trigger shrink |
| `NEW_CARD_PRIORITY_CYCLES` | 3 | First N cycles a new card is given front placement |

---

## Data Model

### LetterProgress (per card, persisted to AsyncStorage)

| Field | Type | Description |
|---|---|---|
| `level` | 0–3 | Current mastery level |
| `levelCorrect` | 0–4 | Correct answers within current level (resets on wrong) |
| `wrongFlag` | boolean | True if last answer was wrong → shown early in next cycle |
| `lastShownCycleIndex` | number | Last cycle index when shown (used for freshness check) |
| `mastered` | boolean | True when level ≥ 2 |
| `correctCount` | number | Total correct answers (lifetime) |
| `wrongCount` | number | Total wrong answers (lifetime) |
| `seenCount` | number | Total attempts (lifetime) |
| `lastSeenAt` | ISO string | Timestamp of last attempt |
| `firstSeenAt` | ISO string | Timestamp of first attempt |
| `dayHistory` | string[] | ISO date strings of days the card was practised |

### SessionState (per session, in memory only)

| Field | Type | Description |
|---|---|---|
| `spaces` | string[] | Card IDs currently in active memory spaces |
| `waitingPool` | string[] | Card IDs not yet in active spaces (path order) |
| `graduatedPool` | string[] | Session-mastered card IDs |
| `cycleQueue` | string[] | Ordered card IDs for the current cycle |
| `cycleIndex` | number | Current position within the cycle queue |
| `cycleCount` | number | Consecutive all-correct cycles (for Trigger A) |
| `cycleHistory` | string[][] | Last 3 cycle orders (for anti-repeat check) |
| `currentCycleIndex` | number | Global cycle counter (for freshness check) |
| `currentCycleWrongs` | number | Wrong answers in the current cycle |
| `cardsShown` | number | Total cards shown this session |
| `previousCardId` | string | Last shown card (hard anti-repeat guard) |

---

## Schema Migration

Progress is stored in AsyncStorage as `{ schemaVersion: 4, byCard: { ... } }`.

On load, `migrateProgress()` upgrades old data transparently:

| From | To | What changes |
|---|---|---|
| v1 (flat object) | v4 | Restructures to `byCard` shape; adds all new fields |
| v2 | v4 | Adds fields missing from v2 |
| v3 | v4 | Adds fields missing from v3 |

No user data is deleted during migration — missing fields are filled with defaults.

---

## Deferred Features

These are designed for but not yet implemented:

| Feature | Status | Notes |
|---|---|---|
| **Level 3 long-term mastery** | Model only | Color `#34d399` (green) reserved; spaced repetition logic not built |
| **Daily review / spaced repetition** | Not built | Cards in `graduatedPool` are never resurfaced in the current implementation |
| **Cross-preset reinforcement** | Not built | Cards from other incomplete presets could enter the waiting pool |
| **Session stop signal** | Not built | No exit trigger — session runs indefinitely until user leaves |

---

## Related Docs

| Doc | Purpose |
|---|---|
| `docs/ARCHITECTURE.md` | Tech stack, directory layout, key decisions |
| `docs/SCHEMA.md` | Full database/storage schema |
| `lib/learning.ts` | All algorithm constants and core logic |
