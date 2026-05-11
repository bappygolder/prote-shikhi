# Bornomala — Algorithm Redesign (CTX-14)

**Correct project path:** `docs/plans/bornomala-algorithm-redesign.md`
*(move here after plan mode exits)*

---

## Context

The current learning algorithm has several problems surfaced in review:
- Warmup phase (5 correct) is invisible to the learner — no progress feedback
- One wrong after 9 correct resets the full streak to zero (brutal cliff)
- "New card boost" decays to zero by attempt 8, leaving healthy new cards with low selection weight
- Active set is fixed at 3 — no growth/shrink response to performance
- Freshness score uses `recentResults.length` as a proxy, not actual cards-ago-shown
- Cards unlock in batches of 2 regardless of how many are in the path (too slow for long paths)

This plan redesigns the algorithm around a **Memory Spaces + Cycle + Level** model that matches how the user described the intended learning experience.

---

## New Mental Model

```
WAITING POOL (all unmastered cards, in path order)
       │
       │  card enters when space grows or another card graduates
       ↓
ACTIVE SPACES  [A]  [B]  [C]  ...  (starts at 2, grows to 4 max)
       │
       │  cards rotate in cycles — each card shown once per cycle
       │  cycle order varies — no same order 3× in a row
       │
       │  card graduates a level every 5 correct answers within level
       │  wrong → reset to start of current level (not a full drop)
       │
       │  card exits space when it reaches session mastery (Level 2)
       ↓
GRADUATED POOL (Level 2+ cards — occasional review sprinkles)
```

---

## Level System (replaces streak/warmup)

| Level | Color   | Correct answers to reach | Description         |
|-------|---------|--------------------------|---------------------|
| 0     | Gray    | 0 (starting state)       | Being introduced    |
| 1     | Blue    | 5                        | Learning            |
| 2     | Purple  | 10                       | Session mastery     |
| 3     | Green   | 15 *(deferred)*          | Long-term mastery   |

**Data model:** store `levelCorrect: number` (0–4, progress within current level) and `level: number` (0–3).

**On correct answer:**
- `levelCorrect++`
- If `levelCorrect >= 5`: `level++`, `levelCorrect = 0`
- If `level >= 2`: card is eligible to exit active space at end of current cycle

**On wrong answer:**
- `levelCorrect = 0` (reset to start of current level only — level number does not drop)
- Card gets `wrongFlag = true` → shown earlier in next cycle

**Visual (5 dot pips per card, color = current level):**
```
Level 0: [●][●][●][○][○]  gray   ← 3/5 in L0
Level 1: [●][●][○][○][○]  blue   ← 2/5 in L1
Level 2: [●][●][●][●][●]  purple ← full L2 = session mastered
```

---

## Memory Spaces System (replaces fixed active set)

### Initialization
```
spaces = first 2 unmastered cards from path
cycleQueue = shuffled order of spaces (e.g. [B, A])
cycleCount = 0        // consecutive all-correct cycles
cycleHistory = []     // last 3 cycle orders, for anti-repeat
```

### Within a Cycle
- Show every card in `spaces` exactly once — **cycle integrity is mandatory**
- Card order within the cycle is determined at cycle start (shuffled, anti-repeat enforced)
- Cards with `wrongFlag = true` are placed earlier in the cycle order
- Same card never shown twice in a row (anti-repeat hard rule)

### Anti-Repeat Pattern Rule
At the start of each new cycle, generate the order. If the new order matches the last 2 cycle orders identically → regenerate (shuffle again). Max 3 attempts to find a non-repeating order; if all match (only possible with 2 cards), accept as edge case.

### Space Growth Triggers (either trigger adds 1 space)

**Trigger A — 3 all-correct cycles:**
```
cycleCount++  on each cycle where every card was answered correctly
if cycleCount >= 3:
    addNextCardFromWaitingPool()
    cycleCount = 0
```

**Trigger B — card graduation:**
```
When a card reaches Level 2 (session mastery) at end of cycle:
    card exits spaces → moves to graduatedPool
    addNextCardFromWaitingPool() enters the vacated slot
    (net space size stays the same or grows by 1 if below max)
```

### Space Shrink (struggle detection)
```
If wrong answers > 2 in a single cycle:
    if spaces.length > 2:
        remove the card with lowest level+levelCorrect score
        cycleCount = 0
```

### Space Size Bounds
- Minimum: 2
- Maximum: 4 (can grow if user is consistently strong)
- Space grows beyond 3 only after 3 more all-correct cycles at size 3

---

## Card Selection / Ordering within a Cycle

Determine cycle order once at cycle start:

1. Shuffle `spaces`
2. Move cards with `wrongFlag = true` to front
3. Enforce anti-repeat (not same as last 2 cycle orders)
4. Show cards in that fixed order for the cycle

No weighted-random mid-cycle — the weight is determined by position in cycle order.

**New card priority:** A card that entered the space this session (within last 3 cycles) is treated as if it has `wrongFlag = true` for its first 3 cycles, ensuring it gets front-of-cycle placement.

---

## Freshness Tracking (replaces recentResults.length proxy)

Add `lastShownCycleIndex: number` to `LetterProgress`. Update it each time the card is shown. Use `currentCycle - lastShownCycleIndex` as the true freshness gap. Cards not seen for 3+ cycles get a freshness boost in cycle ordering.

---

## Data Model Changes

### `LetterProgress` — fields to add/replace

```typescript
// Replace streak/bestStreak/penalty/consecutiveMistakes with:
level: number;              // 0–3 (current mastery level)
levelCorrect: number;       // 0–4 (correct answers within current level)
wrongFlag: boolean;         // got a wrong in last cycle → show early next cycle
lastShownCycleIndex: number; // for freshness tracking

// Remove (deprecated):
// streak, bestStreak, penalty, consecutiveMistakes
// recentResults, attemptsSinceEnteringActive, NEW_CARD_BOOST_*

// Keep:
correctCount, wrongCount, seenCount, mastered, lastSeenAt, firstSeenAt, dayHistory
```

### `SessionState` — fields to add/replace

```typescript
// Replace activeSet with:
spaces: string[];                // card IDs in active memory spaces
waitingPool: string[];           // remaining path cards not yet activated
graduatedPool: string[];         // Level 2+ cards (for sprinkle)

// Add:
cycleQueue: string[];            // ordered card IDs for current cycle
cycleIndex: number;              // position within current cycle
cycleCount: number;              // consecutive all-correct cycles
cycleHistory: string[][];        // last 3 cycle orders (for anti-repeat)
currentCycleIndex: number;       // global cycle counter (for freshness)

// Remove: prePushedActiveSet, inStruggleMode (replace with space shrink logic)
```

---

## Global Progress Bar (updated formula)

```
Per card max = 4 levels × 5 = 20 (but level 3 deferred → effective max = 15 for now)
Per card earned = (level × 5) + levelCorrect
Bar % = sum(earned) / (15 × total cards) × 100
```

---

## Files to Change

| File | Change |
|------|--------|
| `lib/learning.ts` | Full redesign: new level system, memory spaces, cycle logic, selection |
| `App.tsx` | Update `handleGrade`, progress bar formula, session init |
| `components/learn/` | Add level dots UI to card display (5 pips, color by level) |
| `docs/ALGORITHM.md` | New file: human-readable algorithm spec for future reference |

---

## Functions to Add / Replace in `lib/learning.ts`

| Function | Action |
|----------|--------|
| `applyGrade()` | Rewrite — use level/levelCorrect instead of streak |
| `initSessionState()` | Rewrite — use spaces/waitingPool/cycleQueue model |
| `applyActiveSetOnCorrect()` | Remove — replaced by `tickCycle()` |
| `applyActiveSetOnMastery()` | Remove — graduation handled inside `tickCycle()` |
| `maybeEnterStruggleMode()` | Remove — replaced by `maybeShrinkSpace()` |
| `maybeExitStruggleMode()` | Remove |
| `visibilityScore()` | Remove — replaced by cycle ordering logic |
| `chooseNextCard()` | Simplify — pull from `cycleQueue[cycleIndex]` |
| `computeGlobalProgress()` | Rewrite — use level × 5 + levelCorrect formula |
| `tickCycle()` | New — called at end of each cycle: check growth/shrink, graduate cards, build next cycle queue |
| `buildCycleQueue()` | New — shuffle spaces, enforce anti-repeat, front-load wrongFlag cards |
| `maybeShrinkSpace()` | New — removes weakest card if >2 wrongs in cycle |
| `addNextFromWaiting()` | New — brings next pool card into spaces |

---

## Deferred (out of scope for this plan)

- Level 3 (dark green / long-term mastery) — model supports it, UI/logic deferred
- Cross-preset card introduction (cards from other unfinished presets entering the space)
- Session stop / exit trigger (when to tell the user the session is done)
- Daily review / spaced repetition across sessions

---

## Verification Plan

1. Run `npx tsc --noEmit` — zero TypeScript errors
2. Run existing tests: `npx jest` — update any that rely on old `streak`/`penalty` fields
3. Manual session walkthrough:
   - Start a preset → confirm 2 spaces init, dots show 0/5 gray
   - Answer correct 5× → confirm level advances to blue, `levelCorrect` resets
   - Answer wrong → confirm dots reset within current level, not full drop
   - Continue 3 all-correct cycles → confirm 3rd card enters space
   - Reach Level 2 → confirm card exits, new card enters
   - Deliberately struggle (3 wrongs in cycle) → confirm space shrinks to 2
4. Confirm global progress bar moves on every correct answer (no invisible warmup phase)
5. Confirm no same card is shown twice in a row across 20+ answers

---

## Recommended Model

- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: High
- Reason: Full algorithm redesign touching core state machine, data model, and UI feedback
