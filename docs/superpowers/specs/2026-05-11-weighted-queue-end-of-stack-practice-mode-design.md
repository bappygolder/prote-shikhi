# Design: Weighted Queue, End-of-Stack Refresher & Practice Mode

**Date:** 2026-05-11  
**Status:** Approved  
**Scope:** `lib/learning.ts` + `lib/learning.test.ts`  
**Related CTX:** CTX-18 (creator UX branch); this is a new algorithm upgrade

---

## Problem Statement

Three related issues with the current learning algorithm:

1. **End-of-stack stagnation.** When `waitingPool` is empty and only 1–2 cards remain unmastered, those cards appear once per cycle alongside higher-level cards. They don't get enough repetition to progress, so they stagnate.

2. **Graduated cards disappear forever.** Once a card graduates it never comes back, even when the last unmastered card needs graduated cards as comparison context to learn in.

3. **No practice mode.** When all cards are mastered and a user re-enters the preset, there is no session — the app has no defined behavior for this state.

---

## Design

### 1. Weighted Queue (core change to `buildCycleQueue`)

**Current behavior:** Every card in `spaces` gets exactly 1 slot per cycle.

**New behavior:** Each card earns weighted slots based on how much attention it needs.

#### Learning mode weights (based on `level`)

| Card level | Slots per cycle | Why |
|---|---|---|
| 0 (new) | 3 | New card needs maximum repetition |
| 1 | 2 | Still building fluency |
| 2 (near mastery) | 1 | Almost there — normal exposure |
| Graduated refresher | 1 | Context only, not being taught |

Weight formula: `slots = max(1, SESSION_MASTERY_LEVEL - p.level)`

#### Practice mode weights (based on error rate)

`slots = 1 + Math.round((p.wrongCount / (p.seenCount + 1)) * 2)`

Cards with higher error rate get more slots. Cards with equal accuracy get 1 slot. Converges toward equal exposure over time.

#### Anti-consecutive rule

At cycle boundaries: if `cycleQueue[0] === previousCardId`, rotate that card to the back of the queue. Prevents A, B, B, A patterns — produces clean A, B, A, B instead. Applied once after building the new queue, before returning.

`buildCycleQueue` signature gains two new parameters: `graduatedPool: string[]` and `waitingPool: string[]` (for end-of-stack detection), and `practiceMode: boolean` (for weight selection).

---

### 2. End-of-Stack Refresher

**Trigger:** `waitingPool.length === 0` AND `graduatedPool.length > 0`

When triggered, `buildCycleQueue` pulls graduated cards back into the cycle as refreshers alongside whatever is still in `spaces`. They are NOT added to `spaces` permanently — they participate in the cycle queue only for that cycle.

**Ordering within the refresher pool:**
1. Unmastered cards first, weighted by level (Section 1)
2. Graduated refreshers ordered by error rate (higher error rate = shown earlier); ties broken by shuffle (Fisher-Yates)

**Practical example** — 1 unmastered card Z (level 0) + 3 graduated cards A, B, C:
- Z gets 3 slots
- A, B, C each get 1 slot
- Resulting cycle: `[Z, A, Z, B, Z, C]`
- Anti-consecutive rule applied at boundary if needed

Z is shown 3× per cycle alongside all graduated cards until it masters. Once Z graduates, all cards are mastered and practice mode takes over.

---

### 3. Practice Re-Session (All Mastered)

**Trigger:** All cards in the path have `mastered === true` when `initSessionState` is called.

**`SessionState` change:** Add `practiceMode: boolean` field.

**`initSessionState` in practice mode:**
- Sets `practiceMode = true`
- Puts ALL cards into `spaces` (no unmastered filter)
- `waitingPool = []`
- `graduatedPool = []` for the session (all cards are in spaces)

**`tickCycle` in practice mode:**
- Skips graduate/backfill logic — no card moves out of spaces
- Skips grow/shrink logic — spaces size is fixed
- Still increments `currentCycleIndex` and rebuilds the queue

**`buildCycleQueue` in practice mode:**
- Uses error-rate weights (Section 1, practice mode formula)
- Anti-consecutive rule still applies

**Data integrity:** `applyGrade` is still called normally — `correctCount`, `wrongCount`, `seenCount` continue to accumulate. `mastered` and `level` are not changed. No data is reset.

---

## Data Model Changes

### `SessionState`
```ts
practiceMode: boolean;  // new field — defaults to false
```

No other type changes. `spaces`, `waitingPool`, `graduatedPool` semantics are unchanged.

### Constants
No new constants needed. Existing constants used:
- `SESSION_MASTERY_LEVEL` — used in weight formula
- `SPACES_MAX`, `SPACES_MIN` — still respected in learning mode

---

## Affected Functions

| Function | Change |
|---|---|
| `buildCycleQueue` | Add weighted slots, refresher logic, anti-consecutive rule; add `graduatedPool`, `waitingPool`, `practiceMode` params |
| `initSessionState` | Detect all-mastered → set `practiceMode = true`, put all cards in spaces |
| `tickCycle` | Pass `graduatedPool`/`waitingPool` to `buildCycleQueue`; skip graduate/grow/shrink in practice mode |
| `SessionState` type | Add `practiceMode: boolean` |

`applyGrade`, `chooseNextCard`, `computeGlobalProgress`, `migrateProgress` — no changes.

---

## Testing Plan

- Weighted slots: level-0 card appears 3× in a cycle with a level-2 card
- Level-1 card appears 2× in a cycle with a level-2 card  
- Graduated refreshers appear when `waitingPool` empty + `graduatedPool` non-empty
- Refresher cycle format matches `[Z, A, Z, B, Z, C]` pattern
- Anti-consecutive: `cycleQueue[0]` never equals `previousCardId` after rotation
- Practice mode init: all cards in spaces, `practiceMode = true`, `waitingPool = []`
- Practice mode tick: no graduation/shrink/grow
- Practice mode weighting: higher error-rate card gets more slots
- Existing tests continue to pass (no regressions)
