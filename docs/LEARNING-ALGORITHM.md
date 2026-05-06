# Bornomala — Learning Algorithm Specification

**Version**: v2.0
**Last updated**: 2026-05-06
**Status**: Implemented in CTX-05 / CTX-06 / CTX-07. Iterate via review cadence.
**Authors**: Bappy + Claude (Opus 4.7)
**Review cadence**: After every real teaching session, this spec gets a review pass. See [`docs/inbox/do/2026-05-05-bornomala-spec-review-cadence.md`](inbox/do/2026-05-05-bornomala-spec-review-cadence.md).

> This document is the **single source of truth** for how Bornomala decides what letter to show next. The code in [`lib/learning.ts`](../lib/learning.ts) implements this spec. The tests verify this spec. When we improve the algorithm, we improve this document FIRST, then the code.
>
> This is a living document. Every real teaching session feeds it. Open questions are tracked at the bottom and resolved iteratively.

---

## Table of contents

1. [Why this exists](#1-why-this-exists)
2. [Design principles](#2-design-principles)
3. [Vocabulary](#3-vocabulary)
4. [Per-card state](#4-per-card-state)
5. [Session state](#5-session-state)
6. [Tunable parameters](#6-tunable-parameters)
7. [Lifecycle hooks](#7-lifecycle-hooks)
8. [The visibility score](#8-the-visibility-score)
9. [Active-set policy](#9-active-set-policy)
10. [Card selection](#10-card-selection)
11. [Mastery and the sticky flag](#11-mastery-and-the-sticky-flag)
12. [Sprinkle-mastered (retention)](#12-sprinkle-mastered-retention)
13. [Top progress bar formula](#13-top-progress-bar-formula)
14. [Per-card streak indicator](#14-per-card-streak-indicator)
15. [Teacher overrides](#15-teacher-overrides)
16. [Worked example walkthrough](#16-worked-example-walkthrough)
17. [Open questions (iterate)](#17-open-questions-iterate)
18. [Rejected alternatives](#18-rejected-alternatives)
19. [Change log](#19-change-log)

---

## 1. Why this exists

The first real teaching session ([journal](inbox/discuss/2026-05-04-bornomala-first-teaching-session-ux.md)) revealed that the MVP scheduler doesn't adapt: it shows the same path to every learner, never shrinks under struggle, and uses a cumulative-correct mastery rule that doesn't match how Bappy actually teaches. This document defines the v2 algorithm so it can be implemented carefully, tested rigorously, and evolved deliberately.

**The algorithm is the product.** Everything else (UI, audio, login) is in service of choosing the right next card.

---

## 2. Design principles

1. **Adapt to the learner.** Same path for everyone is wrong.
2. **Tiny active set first.** Confidence > coverage at the start.
3. **Mistakes surface fast and fade slow.** The struggling card gets disproportionate attention.
4. **Warm up before counting.** The learner shouldn't feel scored from rep #1.
5. **Mastery is a streak signal, not an attempt count.** 10 in a row, no mistakes.
6. **Mastered ≠ forgotten.** Sprinkle reviews of mastered cards to keep them fresh.
7. **Teacher overrides are first-class inputs**, not exceptions.
8. **Top bar is monotonic-up.** Adult learners abandon if visible global progress regresses.
9. **Defaults must be safe.** When the algorithm is unsure, it favors the learner's confidence over "efficiency."

---

## 3. Vocabulary

| Term | Meaning |
|---|---|
| **Path** | The full ordered set of cards the learner is working through (e.g. all consonants). |
| **Active set** | The small subset of cards currently being practiced this session. 1–N cards. |
| **Visibility score** | Per-card priority weight. Higher = surfaced sooner / more often. Recomputed every grade. |
| **Streak** | Current consecutive-correct count for a card. Resets to 0 on a wrong. |
| **Mastered** | Card has hit `MASTERY_TARGET` streak at least once. **Sticky** — does not unmaster. |
| **Penalty** | "Debt" accumulated by consecutive mistakes on a card. Doubles per consecutive miss. Drives visibility. |
| **Warm-up** | Initial reps that don't contribute to the top bar. |
| **Sprinkle** | Surfacing a mastered card during practice for retention. |
| **Struggle mode** | Adaptive state where the active set shrinks. Triggered by recent error rate. |

---

## 4. Per-card state

```ts
type CardState = {
  // identity
  cardId: string;                  // e.g. "vowel-01"

  // attempt counters (cumulative, never decrease)
  attempts: number;                // total times shown
  correctCount: number;            // total correct
  wrongCount: number;              // total wrong

  // streak (mastery signal)
  streak: number;                  // current consecutive correct, resets on wrong
  bestStreak: number;              // highest streak ever
  mastered: boolean;               // STICKY: true once streak ever ≥ MASTERY_TARGET

  // mistake dynamics (visibility signal)
  penalty: number;                 // 0 = clean, doubles on consecutive miss, halves on correct, capped at PENALTY_MAX
  consecutiveMistakes: number;     // current run of wrongs, resets on correct

  // recency (selection signal)
  lastSeenAt: string | null;       // ISO timestamp
  cardsAgoSeen: number;            // how many other cards shown since this one (live in session)
  recentResults: Array<'c' | 'w'>; // rolling window, max RECENT_WINDOW

  // active-set lifecycle
  attemptsSinceEnteringActive: number; // 0 on entry; drives newcomer boost
  enteredActiveAt: string | null;      // ISO timestamp the card joined the active set this time
  cardsShownSinceMastered: number;     // 0 at moment of mastery; drives newly-mastered quiet period

  // interleaving (post-mastery)
  sprinkleCooldown: number;        // shown N cards ago as a sprinkle; counts down

  // reserved (not populated yet — see OQ-10, OQ-CPS)
  timeSpentMs: number;             // optional, defer
  // confusionPairs?: Record<string, number>;  // future: how often this card was missed when X was previous

  // timestamps
  firstSeenAt: string | null;
};
```

**Migration rule** from v1 schema: preserve `attempts`, `correctCount`, `wrongCount`, `mastered`, `lastSeenAt`. Initialize `streak = 0`, `penalty = 0`, `recentResults = []` (no way to recover from v1 data). Set `attemptsSinceEnteringActive` based on whether the card is in the (recomputed) initial active set.

---

## 5. Session state

```ts
type SessionState = {
  startedAt: string;
  cardsShown: number;                    // count of grades this session
  recentGrades: Array<'c' | 'w'>;        // rolling window of last RECENT_WINDOW outcomes
  inStruggleMode: boolean;
  consecutiveCorrectInSession: number;   // resets on any wrong
  previousCardId: string | null;
  twoBackCardId: string | null;          // currently unused; reserved if we re-introduce a triple-repeat rule
  activeSet: string[];                   // ordered list of card IDs currently in active rotation
  prePushedActiveSet: string[] | null;   // saved during struggle mode so we can restore on exit
};
```

Note: warm-up budget is per-card (`WARMUP_PER_CARD`) so it lives on `CardState.attempts`, not on session state. There is no `unlockEventsThisSession` counter — unlocks are event-driven, not count-driven.

---

## 6. Tunable parameters

These are the knobs. Every behavior change should change one of these and re-run tests, not bury logic deeper in code.

```ts
const MASTERY_TARGET = 10;             // streak required to set mastered=true
const RECENT_WINDOW = 6;               // size of recent-results rolling buffer
const WARMUP_PER_CARD = 5;             // per-card warm-up budget: 5 cumulative CORRECTS before counting starts
                                       // wrongs during warm-up don't penalize the budget; they still affect penalty
                                       // streak counting begins on the 6th correct of the card

// active set
const ACTIVE_SET_START = 2;            // session begins with this many cards in the active set
const ACTIVE_SET_STEADY = 3;           // size after first counted-correct; replacement-only after that
const ACTIVE_SET_STRUGGLE = 2;         // shrink to this in struggle mode

// unlock policy
const UNLOCK_ON_FIRST_COUNTED_CORRECT = true;  // active grows from 2 → 3 on the first counted correct
const UNLOCK_ON_MASTERY = true;                // each mastery brings one new card from the path

// struggle detection
const STRUGGLE_WRONG_THRESHOLD = 2;    // ≥ 2 wrongs in RECENT_WINDOW → enter struggle mode
const STRUGGLE_RECOVERY_STREAK = 6;    // 6 consecutive correct → exit struggle mode

// penalty
const PENALTY_MAX = 16;                // cap on doubling: 1 → 2 → 4 → 8 → 16
const PENALTY_HALVE_ON_CORRECT = true; // halve (true) vs decrement-by-1 (false). Halving is humane.

// newcomer boost
const NEW_CARD_BOOST_DURATION = 8;     // a newly-active card carries the boost for its first N attempts
const NEW_CARD_BOOST_WEIGHT = 8;       // additive bonus at attempt #1, decays linearly to 0 at attempt N

// sprinkle (post-mastery review)
const SPRINKLE_EVERY_N_CARDS = 7;      // every Nth card shown is a mastered review, when eligible
const SPRINKLE_COOLDOWN = 15;          // a mastered card waits this many cards before re-sprinkling
const NEWLY_MASTERED_QUIET_PERIOD = 10; // see OQ-NMC (§17): cards just-mastered stay quiet this many cards

// visibility weights (for scoring formula in §8)
const W_BASE = 1;
const W_RECENT_MISS = 4;
const W_PENALTY = 1.5;
const W_STREAK_GAP = 0.3;
const W_FRESHNESS = 0.5;
const W_SPRINKLE = 2.5;
// Anti-immediate-repeat is a HARD rule, not a weight.
// A card whose id == state.previousCardId returns visibility 0,
// UNLESS it is the only card in the active set (single-card fallback).
```

---

## 7. Lifecycle hooks

### 7.1 `onCorrect(card, state)`

```
  card.attempts        += 1
  card.correctCount    += 1

  // streak only counts AFTER warm-up clears (5 cumulative corrects)
  isWarmupActive = card.correctCount <= WARMUP_PER_CARD
  if (not isWarmupActive):
    card.streak       += 1
    card.bestStreak    = max(card.bestStreak, card.streak)
    if (card.streak >= MASTERY_TARGET):
      wasJustMastered = not card.mastered
      card.mastered = true                              // STICKY
      if (wasJustMastered):
        card.cardsShownSinceMastered = 0

  card.consecutiveMistakes = 0
  card.penalty          = PENALTY_HALVE_ON_CORRECT
                            ? floor(card.penalty / 2)
                            : max(0, card.penalty - 1)
  card.recentResults    = pushBounded(card.recentResults, 'c', RECENT_WINDOW)
  card.lastSeenAt       = now()
  card.cardsAgoSeen     = 0
  bumpCardsAgoForOthers(state, card.id)

  state.recentGrades = pushBounded(state.recentGrades, 'c', RECENT_WINDOW)
  state.consecutiveCorrectInSession += 1

  // first counted-correct on this card AND active set still at start size → unlock 3rd card
  isFirstCountedCorrect = (not isWarmupActive) AND (card.correctCount == WARMUP_PER_CARD + 1)
  if (isFirstCountedCorrect AND state.activeSet.size < ACTIVE_SET_STEADY):
    addNextPathCardToActive(state, path)

  // mastery just fired → 1-for-1 replacement (newly-mastered card leaves; new card enters)
  if (card.mastered AND wasJustMastered):
    state.activeSet.remove(card.id)
    addNextPathCardToActive(state, path)

  maybeExitStruggleMode(state)
```

### 7.2 `onWrong(card, state)`

```
  card.attempts            += 1
  card.wrongCount          += 1
  card.streak               = 0    // safe even during warm-up; streak was 0 already
  card.consecutiveMistakes += 1
  card.penalty              = card.consecutiveMistakes == 1
                                ? 1
                                : min(card.penalty * 2, PENALTY_MAX)
  card.recentResults        = pushBounded(card.recentResults, 'w', RECENT_WINDOW)
  card.lastSeenAt           = now()
  card.cardsAgoSeen         = 0
  bumpCardsAgoForOthers(state, card.id)

  // wrongs DO NOT consume warm-up budget. correctCount is unchanged on wrong, so warm-up keeps its progress.

  state.recentGrades                 = pushBounded(state.recentGrades, 'w', RECENT_WINDOW)
  state.consecutiveCorrectInSession  = 0

  maybeEnterStruggleMode(state)
```

Note: `onWrong` does NOT decrement any cumulative counter. The top bar uses `correctCount` (post-warmup), which is monotonic-up. Wrongs only affect the per-card streak indicator (§14).

### 7.3 `onSessionStart(state, path)`

**Cross-session policy (locked):** ALL per-card state carries across sessions — `penalty`, `streak`, `recentResults`, `sprinkleCooldown`, `consecutiveMistakes`, etc. The learner returns into the exact same state they left. Yesterday's struggle on a card is today's struggle.

Only `SessionState` resets at session start. Per-card state is untouched.

```
  state.recentGrades                = []
  state.cardsShown                  = 0
  state.consecutiveCorrectInSession = 0
  state.inStruggleMode              = false   // recomputed by maybeEnterStruggleMode after first grades
  state.previousCardId              = null
  state.twoBackCardId               = null
  state.prePushedActiveSet          = null

  // build active set from the path's first un-mastered cards
  unmastered = path.filter(c => not c.mastered)
  state.activeSet = (unmastered.length >= ACTIVE_SET_START)
                      ? unmastered.slice(0, ACTIVE_SET_START)
                      : unmastered

  // newcomer boost: only reset attemptsSinceEnteringActive for cards just entering active fresh
  // cards already in active set keep their progress — their boost has decayed naturally
```

---

## 8. The visibility score

This is the heart of the algorithm. Every adaptation rule contributes one term. **Anti-immediate-repeat is a hard rule, not a weight** — it returns visibility 0 outright, except in the single-card fallback case (see §10).

```
visibilityScore(card, state):
  // HARD RULES (return 0 outright)
  if card.id is in teacher.excludedCardIds:
    return 0
  if card.id == state.previousCardId AND activeSetSize > 1:
    return 0   // never the same card twice in a row
  if card.mastered AND inNewlyMasteredQuietPeriod(card, state):
    return 0   // just-mastered cards take a breather before any sprinkles
  if card.mastered AND not eligibleForSprinkle(card, state):
    return 0   // mastered cards stay quiet unless it's their sprinkle turn

  // ADDITIVE TERMS
  score = W_BASE

  // newcomer boost — drives the X-Z-Y-Z-X-Z pattern when a new card enters
  if card.attemptsSinceEnteringActive < NEW_CARD_BOOST_DURATION:
    decay = 1 - (card.attemptsSinceEnteringActive / NEW_CARD_BOOST_DURATION)
    score += NEW_CARD_BOOST_WEIGHT * decay

  // active mistake → strongly surface
  if card.recentResults[-1] == 'w':
    score += W_RECENT_MISS

  // accumulated penalty from consecutive misses
  score += card.penalty * W_PENALTY

  // farther from streak target → more practice
  score += max(0, MASTERY_TARGET - card.streak) * W_STREAK_GAP

  // freshness — nudges variety; falls off after a few cards
  score += min(card.cardsAgoSeen, 5) * W_FRESHNESS

  // sprinkle bonus (only if mastered AND eligible AND past quiet period)
  if card.mastered AND eligibleForSprinkle(card, state):
    score += W_SPRINKLE

  return score
```

**Why a score, not a queue?** A queue is brittle — the moment one rule conflicts with another, you're rewriting the queue. A score lets every rule contribute a term and we tune weights, not control flow.

**Why anti-repeat as a hard rule?** Yesterday's teaching session saw the same letter repeating after a sequence ended. A weighted suppression (e.g. ×0.10) admits edge cases where math allows the repeat anyway. A hard zero leaves no edge case. The single-card fallback in §10 is the only carve-out.

---

## 9. Active-set policy

The active set is small and bounded. It does NOT keep growing. New cards enter only when an active card is mastered (1-for-1 replacement) or when the learner first proves traction (2 → 3 transition).

**Lifecycle:**

```
session start:
  activeSet = first ACTIVE_SET_START cards of path (i.e. 2 cards)
  for each card in activeSet:
    card.attemptsSinceEnteringActive = 0

on first counted-correct on any active card (state-machine event):
  if activeSet.size < ACTIVE_SET_STEADY:
    next = nextUnentered card from path
    if next exists:
      activeSet.add(next)
      next.attemptsSinceEnteringActive = 0   // newcomer boost begins

on mastery of any active card:
  remove that card from activeSet  // it leaves the active rotation
  next = nextUnentered card from path
  if next exists:
    activeSet.add(next)
    next.attemptsSinceEnteringActive = 0   // newcomer boost begins

on entering struggle mode:
  shrink activeSet to top ACTIVE_SET_STRUGGLE cards by struggleScore
  cards pushed out re-enter when struggle exits
  // see OQ-SC (§17): which card gets pushed when a new card is mid-boost?

on exiting struggle mode:
  restore the cards pushed out (preserve their attemptsSinceEnteringActive)
  if the active set has room and the path has untouched cards, follow the regular unlock policy
```

```
computeActiveSet(state, path, teacher):
  if teacher.activeSetOverride is not null:
    return teacher.activeSetOverride        // teacher pinning wins

  // teacher exclusions filter out cards from the active rotation entirely
  return state.activeSet.exclude(teacher.excludedCardIds)
```

**Helper:**

```
struggleScore(card) =
    card.consecutiveMistakes * 3
  + card.penalty
  + count(card.recentResults, 'w')
```

**Struggle-mode transitions:**

```
maybeEnterStruggleMode(state):
  if not state.inStruggleMode
     AND count(state.recentGrades, 'w') >= STRUGGLE_WRONG_THRESHOLD:
    state.inStruggleMode = true
    shrink active set per the lifecycle above

maybeExitStruggleMode(state):
  if state.inStruggleMode
     AND state.consecutiveCorrectInSession >= STRUGGLE_RECOVERY_STREAK:
    state.inStruggleMode = false
    restore active set per the lifecycle above
```

**Counted-correct vs raw correct.** A "counted correct" is a correct answer that occurs after the card has cleared its per-card warm-up budget (`WARMUP_PER_CARD`). Warm-up corrects are real corrects (they bump the streak) but they don't trigger the 2 → 3 unlock and they don't move the top bar. See §13 and OQ-W.

---

## 10. Card selection

```
chooseNextCard(path, state, teacher, rng = Math.random):
  active = computeActiveSet(state, path, teacher)

  // single-card fallback: only one card in active set → must show it
  if active.size == 1:
    return active[0]

  scores   = active.map(c => [c, visibilityScore(c, state)])
  filtered = scores.filter(([_, s]) => s > 0)

  if filtered.isEmpty():
    // very rare; means every active card is the previous card (impossible if size>1)
    // or every card is in newly-mastered quiet period. Fall through to next-best:
    return active.find(c => c.id != state.previousCardId) ?? active[0]

  return weightedRandomPick(filtered, rng)
```

**Weighted-random, not argmax.** Deterministic argmax produces ping-pong patterns. A weighted sample lets the second- and third-most-needy cards still appear ~30–40% of the time, which feels human and avoids drilling.

**Anti-immediate-repeat is enforced inside `visibilityScore` as a hard 0**, not in the selection function. The only exception is the single-card fallback above.

After picking, the caller updates session state:

```
  state.twoBackCardId   = state.previousCardId
  state.previousCardId  = chosen.id
  state.cardsShown     += 1
  chosen.attemptsSinceEnteringActive += 1
```

---

## 11. Mastery and the sticky flag

- A card becomes `mastered = true` the first time `streak ≥ MASTERY_TARGET` (and `streak` only increments after warm-up clears).
- `mastered` is **sticky**. A subsequent wrong drops `streak` to 0 but does NOT set `mastered = false`. Rationale: teachers re-test for fun and reassurance; un-mastering would feel punitive.
- When a card becomes mastered, it leaves the active set immediately. A new card from the path joins (1-for-1 replacement).
- A mastered card stops appearing in the active set unless:
  - It's eligible for a sprinkle (§12), OR
  - The teacher manually re-includes it.

### Path completion

When **every card in the active path is mastered**:

1. The algorithm enters **path-complete state**.
2. UI surface displays a "You've mastered this path" celebration. (Visual specifics live in `bornomala-shiki-continuous-progress.md`.)
3. The user is offered two options:
   - **Move on** — switch to a new path (e.g. vowels → vowel signs).
   - **Keep going** — stay on this path; the algorithm enters **sprinkle-only mode**.
4. In sprinkle-only mode, every card shown is a mastered card chosen via the sprinkle eligibility rule (§12). The active-set policy is suspended; the entire mastered path is the candidate pool. Anti-immediate-repeat still applies.

This behavior is **locked for v2.0**. Refinement (e.g. variable cadence, retention-decay-based selection in sprinkle-only mode) is deferred to future revisions per the review cadence.

---

## 12. Sprinkle-mastered (retention)

A mastered card should resurface occasionally so the learner doesn't forget it.

```
eligibleForSprinkle(card, state):
  return card.mastered
     AND card.sprinkleCooldown == 0
     AND state.cardsShown % SPRINKLE_EVERY_N_CARDS == 0
     AND not state.inStruggleMode    // never sprinkle while struggling
     AND not state.warmupRemainingThisSession > 0  // never sprinkle during warmup
```

When a sprinkle is shown:
- Reset `card.sprinkleCooldown = SPRINKLE_COOLDOWN`.
- Decrement all other mastered cards' `sprinkleCooldown` by 1 each card shown.
- A wrong on a sprinkle behaves identically to a wrong on any card: `streak = 0`, `consecutiveMistakes++`, `penalty` doubles, but `mastered` stays sticky.

---

## 13. Top progress bar formula

The top bar reflects path completion. It is **monotonic non-decreasing** — wrongs never reduce it.

Per-card warm-up: the first `WARMUP_PER_CARD` corrects on each card do not contribute to the bar. After warm-up, every correct counts up to the per-card cap.

```
postWarmupCorrect(c) = max(0, c.correctCount - WARMUP_PER_CARD)
contribution(c)      = c.mastered
                         ? (MASTERY_TARGET - WARMUP_PER_CARD)
                         : min(postWarmupCorrect(c), MASTERY_TARGET - WARMUP_PER_CARD)

topBarPercent(path, state) =
  sum over c in path of contribution(c)
  ──────────────────────────────────────────  × 100
  path.length × (MASTERY_TARGET - WARMUP_PER_CARD)
```

With `MASTERY_TARGET = 10` and `WARMUP_PER_CARD = 5`, each card contributes 0–5 to the numerator and exactly 5 to the denominator. 100% requires every card to have either reached mastered (sticky) or accumulated ≥ 10 corrects.

**Properties:**
- Monotonic non-decreasing — `correctCount` only grows.
- Mastered cards always contribute their max (5/5), regardless of later wrongs.
- Wrongs do not move the bar.
- The bar starts moving only after each card has cleared its warm-up.

**Color shift**: the bar's color shifts as percentage grows. This is a presentation concern, not algorithmic — see [`bornomala-shiki-continuous-progress.md`](plans/bornomala-shiki-continuous-progress.md).

---

## 14. Per-card streak indicator

A small visual element (under or near the current card) representing the learner's relationship with this card right now. **It is signed** — it can go below zero — and visualizes both streak progress AND accumulated penalty in one bar.

```
indicatorValue(card):
  if card.consecutiveMistakes > 0:
    return -card.penalty                      // negative: shows debt accumulated
  else:
    return card.streak                        // positive: shows streak toward mastery

indicatorRange = [-PENALTY_MAX, +MASTERY_TARGET]    // i.e. [-16, +10]
```

Animation policy:
- **On correct** (streak resumed): animate +1 step (fast). If the previous state was negative penalty and this is the first correct after wrongs, the animation rises from `-penalty/2` (after halving) toward 0 and beyond.
- **On wrong** (streak broken): animate down. The bar visibly drops past 0 into negative territory if penalty is accumulating. ~600ms duration — gives the learner a beat to register the reset.
- **Color**: positive side may use a "growing" color; zero is neutral; negative side may use a "warning" color. UI specifics left to the continuous-progress plan.

This single signed bar is the bar Bappy referred to as "drops to zero, can go negative." It is fully algorithmic — every value derives from `card.streak`, `card.penalty`, and `card.consecutiveMistakes`.

---

## 15. Teacher overrides

Modeled as inputs to `chooseNextCard`, not as escape hatches. The teacher is a first-class actor.

```ts
type TeacherOverrides = {
  excludedCardIds: Set<string>;        // never surface these
  pinnedActiveSet: string[] | null;    // if set, replaces the computed active set entirely
  forceNextCardId: string | null;      // one-shot: next call returns this card
  manualMasteredCardIds: Set<string>;  // mark mastered without 10-streak
  manualResetCardIds: Set<string>;     // wipe progress on these
};
```

- Overrides are persisted alongside the path so they survive sessions.
- The Occor tab redesign exposes UI for these. UI scope lives in [`bornomala-occor-tab-redesign.md`](plans/bornomala-occor-tab-redesign.md). This spec only commits to the data contract.

---

## 16. Worked example walkthrough

**Setup**: path = [অ, আ, ই, ঈ, …]. Fresh learner. All defaults.

Notation: `streak` and `penalty` are for the card just shown. `active` lists card IDs in current active set. `barCounts?` = "does this rep contribute to the top bar?" (No until that card has cleared its 5-rep warm-up.)

| # | Card shown | Result | streak | penalty | active | barCounts? | notes |
|--:|---|---|--:|--:|---|---|---|
| 1 | অ | ✓ | 1 | 0 | [অ, আ] | no (অ wu 1/5) | first rep on অ; never repeat → next must be আ |
| 2 | আ | ✓ | 1 | 0 | [অ, আ] | no (আ wu 1/5) | |
| 3 | অ | ✗ | 0 | 1 | [অ, আ] | no | wrong; penalty=1, indicator drops to -1 |
| 4 | আ | ✓ | 2 | 0 | [অ, আ] | no (আ wu 2/5) | anti-repeat forces আ; অ has high score (penalty + recent miss) but is the prev card |
| 5 | অ | ✓ | 1 | 0 | [অ, আ] | no | অ now penalty=0 (halved from 1), back on streak |
| 6 | আ | ✓ | 3 | 0 | [অ, আ] | no (আ wu 3/5) | |
| 7 | অ | ✓ | 2 | 0 | [অ, আ] | no | |
| ... | ... | ... | ... | ... | [অ, আ] | ... | continue alternating until one card clears warm-up |
| n | অ | ✓ | (warm-up cleared) | 0 | [অ, আ, ই] | YES — first counted correct! | অ hits its 5th raw correct → counted → **unlock ই**. ই enters with newcomer boost (weight=8) |
| n+1 | ই | ✓ | 1 | 0 | [অ, আ, ই] | no (ই wu 1/5) | newcomer boost makes ই dominate; X-Z-Y-Z pattern starts |
| n+2 | অ or আ | ✓ | up | 0 | [অ, আ, ই] | maybe | not ই (anti-repeat); newcomer boost still dominant on next pick |
| n+3 | ই | ✓ | 2 | 0 | [অ, আ, ই] | no (ই wu 2/5) | ই still boosted (decays linearly over 8 attempts) |
| ... | ... | ... | ... | ... | ... | ... | as ই's boost decays, the three-card rotation evens out |
| later | অ | ✓ | 10 | 0 | active becomes [আ, ই, ঈ] | yes | অ hits streak=10 → **mastered=true** (sticky). Replaced by ঈ from the path. ঈ enters with newcomer boost. অ enters its 10-rep newly-mastered quiet period before any sprinkles. |
| ... | ... | ✗✗ | — | doubles | active shrinks to [আ, ই] in struggle | varies | 2 wrongs in last 6 → struggle mode; ঈ is pushed out (newest, but per OQ-SC we may revisit). |

**Observations:**
- Anti-repeat is a hard rule — অ gets a wrong on rep 3, and even though its visibility is sky-high, rep 4 must be আ.
- Per-card warm-up of 5 means the top bar is silent until ~rep 8-10.
- The unlock of ই is event-driven, not count-driven — the moment অ posts its first counted correct, ই joins. No batch unlocks.
- The newcomer boost gives ই disproportionate visibility for ~8 reps, producing the X-Z-Y-Z rhythm Bappy described, automatically.
- Penalty halving recovers fast: a 4-mistake card (penalty=8) recovers in 4 corrects.

> This walkthrough is illustrative. The exact numbers depend on rng seed and on the resolution of OQ-W (warm-up exit condition).

---

## 17. Open questions (iterate)

Each becomes a small decision chat as we lock it. **LOCKED** items are decisions made; they remain in the table for traceability.

| # | Question | Options | State |
|--:|---|---|---|
| OQ-1 | Warm-up scope | session-level vs per-card | **LOCKED**: per-card, 5 reps |
| OQ-2 | Penalty recovery | halve vs -1 on correct | **LOCKED**: halve |
| OQ-3 | Active-set start size | 1 vs 2 | **LOCKED**: 2 |
| OQ-4 | Unlock trigger (2 → 3) | first correct / first 2-in-a-row / first counted-correct | **LOCKED**: first counted-correct (after warm-up) |
| OQ-5 | Sprinkle cadence | every 5 / 7 / 10 cards | open. recommend 7 |
| OQ-6 | Top bar denominator | `path × MASTERY_TARGET` vs `unlocked × MASTERY_TARGET` | **LOCKED**: `path.length × (MASTERY_TARGET − WARMUP_PER_CARD)` |
| OQ-7 | Big batch unlock | jump +2 when all mastered? | **LOCKED**: no — 1-for-1 replacement on mastery only |
| OQ-8 | Struggle-mode visible to teacher? | silent vs indicator | open. recommend silent for v2 |
| OQ-9 | Wrong on a sprinkle un-masters? | sticky vs unmaster | **LOCKED**: sticky |
| OQ-10 | Time-spent tracking | now vs defer | **LOCKED**: defer (field reserved) |
| OQ-11 | Cross-session decay (penalty) | carry vs reset | open. recommend carry |
| OQ-12 | Cross-session sprinkle cooldown | persist vs reset | open. recommend reset |
| **OQ-AR** | Anti-immediate-repeat | weighted vs hard rule | **LOCKED**: HARD rule — visibility 0 if id == previousCardId, except single-card fallback |
| **OQ-PCB** | (see locked entry below) | — | — |
| **OQ-W** | Warm-up exit condition | (a) 5 attempts any outcome. (b) 5 corrects any order. (c) 5 corrects in a row | **LOCKED**: (b) — 5 cumulative corrects per card; wrongs during warm-up don't consume budget |
| **OQ-XSP** | Cross-session persistence — what carries? | varies per field | **LOCKED**: ALL per-card state carries (penalty, streak, recentResults, sprinkleCooldown, consecutiveMistakes). Only SessionState resets. |
| **OQ-PC** | Path-completion behavior | endless practice / "complete" celebration / sprinkle-only | **LOCKED**: celebration + offer "move on" or "keep going" (sprinkle-only mode). Refine later from user feedback. |
| **OQ-NMC** | Newly-mastered quiet period | reps a just-mastered card stays out of rotation before sprinkles | **LOCKED**: 10 cards |
| **OQ-SC** | Struggle mode + new card collision | push out the old card vs the brand-new one | **DEFERRED** — Bappy: "we will decide all those later". Default for implementation: keep top-N by struggleScore (newcomer typically pushed out; its boost-attempt counter pauses, resumes on re-entry). |
| **OQ-PSW** | Path-switching mid-session | reset session state vs carry | open. need real-use observation |
| **OQ-CPS** | Confusion-pair signaling (e.g. learner mistakes অ↔আ) | track now vs defer | **DEFERRED** — Bappy: "we need to talk about this later". No schema field added in v2.0. |
| **OQ-XPR** | Cross-path retention (older path's cards sprinkled into a new path) | now vs deferred | **LOCKED**: deferred (Bappy explicitly noted as future improvement) |
| **OQ-ATR** | Algorithm transparency for teacher (show *why* this card was picked) | now vs deferred | open. likely deferred to Occor redesign |
| **OQ-PCB** | Per-card bar visualization | one signed bar (-16…+10) vs split visuals | **LOCKED**: single signed bar |

---

## 18. Rejected alternatives

Captured so we don't re-litigate.

- **SM-2 / FSRS spaced-repetition intervals.** Too complex for v2; we don't have due-date scheduling, just within-session selection. Revisit when we have multi-day adoption data.
- **Pure argmax selection.** Produces deterministic ping-pong on ties; weighted random is the right primitive.
- **Soft anti-repeat (weighted ×0.10).** Yesterday's session showed weighted suppression isn't enough — we kept seeing the same card after a sequence ended. Hard rule it is.
- **Top bar drops on wrong.** Demoralizing for adult learners. Per-card streak bar drains and goes negative; top bar is monotonic.
- **"Show 20× before mastery" as a separate rule.** Redundant — the streak rule with mistake-resets already produces this in practice.
- **Decrement penalty by 1 on correct.** Too punitive; halving recovers in 4 corrects which feels right.
- **Unlock the third card on first raw correct.** Too eager — a single lucky guess during warm-up shouldn't expand the workload. We require "first counted correct" (post-warm-up).
- **Active set keeps growing (5 → 7 → ...)** as the learner masters cards. Replaced with strict 1-for-1 replacement at steady state of 3 — keeps cognitive load constant, lets the visibility score do its job.
- **Two separate visuals for streak and penalty.** A single signed bar tells one story instead of two. Single bar wins.

---

## 19. Change log

| Version | Date | Author | Change |
|---|---|---|---|
| v2.0-draft-1 | 2026-05-05 | Bappy + Claude | Initial pseudocode spec drafted from teaching-session #1 findings. |
| v2.0-draft-2 | 2026-05-05 | Bappy + Claude | Anti-repeat → HARD rule; per-card bar signed (-16…+10); active set steady at 3 with 1-for-1 replacement (no batch unlock); newcomer visibility boost added; warm-up scoped per-card; first-counted-correct unlock trigger; newly-mastered quiet period; bar denominator uses `MASTERY_TARGET − WARMUP_PER_CARD`. New OQs added: AR, PCB, W, XSP, PC, NMC, SC, PSW, CPS, XPR, ATR. |
| v2.0-draft-3 | 2026-05-05 | Bappy + Claude | Locked: OQ-W = 5 cumulative corrects per card (wrongs don't consume warm-up budget); OQ-XSP = ALL per-card state carries cross-session; OQ-PC = celebration + sprinkle-only on path complete. OQ-SC and OQ-CPS deferred with default behaviors so implementation isn't blocked. onCorrect/onWrong updated to enforce streak-only-after-warmup. Path-completion semantics added to §11. |
| v2.0 | 2026-05-06 | Bappy + Claude | Implemented across CTX-05 (schema + applyGrade with streak-after-warmup + migration), CTX-06 (chooseNextCard, active-set lifecycle, struggle mode, visibility score), CTX-07 (sprinkle eligibility, post-mastery counters, path-complete event — silent `console.log`, no UI). User-facing docs (`LEARNING-LOGIC.md`, `PRODUCT-LOGIC.md`) aligned to v2. Banner promoted from -draft-3 to v2.0. |

---

## Implementation status

- **Spec**: this document — DRAFT
- **Plan**: [`docs/plans/bornomala-learning-algorithm-v2.md`](plans/bornomala-learning-algorithm-v2.md) — needs update to point at this spec instead of redefining rules inline
- **Code**: [`lib/learning.ts`](../lib/learning.ts) — currently v1; v2 not yet implemented
- **Tests**: not yet written; see [§ Verification of the plan](plans/bornomala-learning-algorithm-v2.md#verification)

When the open questions in §17 are locked, we update this doc to v2.0 (no -draft suffix), then implement.
