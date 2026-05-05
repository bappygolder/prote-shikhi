# Bornomala — Algorithm: Newcomer Visibility Boost

**Status**: Draft, awaiting approval
**Owner**: Bappy
**Date**: 2026-05-05
**Scope**: Half-day ship — minimal, no schema migration

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Low
- Reason: Single-file change to `lib/learning.ts`, no schema migration, well-bounded.

---

## Context

**The problem.** First teaching session revealed students cycling on the same 2–3 letters once a few cards are unmastered — the X-Y-X-Y-X bouncing pattern Bappy heard in real time. Diagnosis: the v1 scheduler picks uniformly at random from the top-3 candidates ranked by `remainingCorrects → wrongCount → seenCount → order`. With only 2–3 unmastered cards in scope, you bounce between them. New cards never get *disproportionate* airtime when first introduced, so a learner doesn't get the focused exposure that builds early recognition.

**Why this change first.** The v2.0-draft-2 spec (`docs/LEARNING-ALGORITHM.md`) lists the newcomer boost as a core mechanism for producing the X-Z-Y-Z rhythm Bappy intuitively wants. Of all the v2 mechanisms, this one:
- requires **no schema migration** (uses existing `seenCount` from `LetterProgress`)
- is **isolated to one function** (`chooseNextCard` in `lib/learning.ts`)
- **directly addresses the loudest student-facing complaint** from the teaching session
- is **independent** of the 5 open spec questions (OQ-W, OQ-XSP, OQ-PC, OQ-SC, OQ-CPS)

The hard anti-repeat rule is already shipped in v1 (`lib/learning.ts:127-130`), so the next-highest-leverage minimal ship for student learning is the newcomer boost.

**Intended outcome.** After ship, when a new card enters scope (first 8 interactions with `seenCount < 8`), it appears noticeably more often than seasoned cards — producing focused exposure during the introduction window without permanently dominating the pool. Bouncing breaks; rhythm matches what Bappy described.

---

## Approach

Modify the candidate-selection logic inside `chooseNextCard` ([lib/learning.ts:95-133](../../lib/learning.ts#L95-L133)) to compute a numeric **visibility score** per candidate and pick **weighted-random** instead of uniform-random.

Three changes inside one function:

1. **Widen the practice pool** from top-3 (`Math.min(3, ...)`) to top-5. With newcomer boost active, the newcomer reliably stays in the top picks regardless; the wider pool lets the score do its work without being clipped.

2. **Compute visibility score** per candidate as the sum of three terms:
   - `remainingTerm = MASTERY_TARGET - correctCount` (existing intent — preserves prioritization of unmastered cards)
   - `wrongTerm = wrongCount * W_WRONG` (existing intent — keep struggling cards in rotation)
   - `newcomerTerm = max(0, NEWCOMER_BOOST_MAX * (1 - seenCount / NEWCOMER_DECAY_REPS))` (NEW — the boost; decays linearly over `NEWCOMER_DECAY_REPS` reps)

3. **Weighted-random pick** by score across the pool (with the existing hard anti-repeat exclusion of `previousCardId` still applied).

Tunables, defined as module-level constants for easy adjustment:
- `NEWCOMER_BOOST_MAX = 6` — strong enough to make a brand-new card the top pick when it enters scope (`remainingTerm` starts at `MASTERY_TARGET = 10`, so `+6` lands the newcomer above any seasoned candidate with seenCount > 0)
- `NEWCOMER_DECAY_REPS = 8` — matches spec; boost reaches 0 after 8 reps
- `W_WRONG = 2` — weight on wrong-count term so struggling cards stay visible
- `POOL_SIZE = 5` — top-N pool

Why these numbers: a card with `correctCount=0, seenCount=0, wrongCount=0` scores `10 + 0 + 6 = 16`. A card with `correctCount=0, seenCount=8, wrongCount=0` scores `10 + 0 + 0 = 10`. A card mid-mastery `correctCount=5, seenCount=8, wrongCount=2` scores `5 + 4 + 0 = 9`. The newcomer dominates for ~8 reps, then blends.

**No changes to**: `LetterProgress` schema, AsyncStorage format, `App.tsx` call sites, mastery rules, unlock logic. `chooseNextCard` signature stays identical.

---

## Files Modified

| File | What changes |
|---|---|
| `lib/learning.ts` | Replace `chooseNextCard` body with scored, weighted-random selection. Add 4 module-level tunable constants. |

That's the entire blast radius.

---

## Code-Level Changes

In [lib/learning.ts](../../lib/learning.ts):

**Add (above `chooseNextCard`):**
```ts
const NEWCOMER_BOOST_MAX = 6;
const NEWCOMER_DECAY_REPS = 8;
const W_WRONG = 2;
const POOL_SIZE = 5;

function visibilityScore(progress: LetterProgress): number {
  const remainingTerm = Math.max(0, MASTERY_TARGET - progress.correctCount);
  const wrongTerm = progress.wrongCount * W_WRONG;
  const newcomerTerm = Math.max(
    0,
    NEWCOMER_BOOST_MAX * (1 - progress.seenCount / NEWCOMER_DECAY_REPS),
  );
  return remainingTerm + wrongTerm + newcomerTerm;
}

function weightedRandomPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
```

**Replace `chooseNextCard` body (keep signature):**
```ts
export function chooseNextCard(
  cards: LetterCard[],
  progress: ProgressByCard,
  previousCardId: string,
): LetterCard {
  const unmasteredCards = cards.filter(
    (card) => !getProgressForCard(progress, card.id).mastered,
  );
  const candidateCards = unmasteredCards.length > 0 ? unmasteredCards : cards;

  // Rank by visibility score (desc), tiebreak by order for determinism.
  const ranked = [...candidateCards].sort((a, b) => {
    const sa = visibilityScore(getProgressForCard(progress, a.id));
    const sb = visibilityScore(getProgressForCard(progress, b.id));
    if (sa !== sb) return sb - sa;
    return a.order - b.order;
  });

  const pool = ranked.slice(0, Math.min(POOL_SIZE, ranked.length));

  // Hard anti-repeat: visibility = 0 for previousCardId when pool > 1.
  const eligible = pool.length > 1
    ? pool.filter((card) => card.id !== previousCardId)
    : pool;

  const weights = eligible.map((card) =>
    visibilityScore(getProgressForCard(progress, card.id)),
  );

  return weightedRandomPick(eligible, weights);
}
```

---

## Verification

### Static checks
- `npx tsc --noEmit` — passes (no signature/type changes, only function body and new helpers).

### Behavioral checks (manual, in app)
Run `npx expo start --web` and verify:

1. **Newcomer dominance.** Start a fresh preset, mark first card correct once. Next pick should be the newly-introduced card much more often than uniform-random would suggest. Repeat with 5 turns — confirm newcomer (lowest seenCount) appears in ~3-4 of those 5 turns.

2. **Bouncing fixed.** With 3 unmastered cards in scope (A, B, C) where A is newcomer (seenCount=0), pattern should look like A-B-A-C-A-B-A-... not B-C-B-C bouncing. The X-Z-Y-Z rhythm Bappy described.

3. **Decay works.** After 8 reps on the newcomer, scoring should level out and rotation should diversify (no single card dominates).

4. **Anti-repeat preserved.** Same card never appears twice in a row when pool > 1 (existing behavior).

5. **Mastery progression unchanged.** Cards still master at `correctCount >= MASTERY_TARGET`. Unlock logic still fires correctly.

6. **No regressions.** Letters tab, paths tab, reset flows, persistence across reload — all behave as before.

### Optional: unit-test seam
Not in scope for this ship, but `visibilityScore` and `weightedRandomPick` are now pure functions — easy to add tests later when the v2 spec finalizes.

### Tuning gate
After ship, run a teaching session with a real student. Bappy observes:
- Does the newcomer get enough early focus? (If not, raise `NEWCOMER_BOOST_MAX` to 8.)
- Does it dominate too long? (If yes, lower `NEWCOMER_DECAY_REPS` to 6.)
- Are seasoned struggling cards getting starved? (If yes, raise `W_WRONG` to 3.)

These are 1-line constant changes, no logic edits.

---

## Out of Scope (deferred)

Explicitly NOT in this plan, even though they are next-highest priorities:
- Streak-based mastery (replaces cumulative-correct) — needs `CardState` schema migration.
- Active-set lifecycle (2 → 3 with 1-for-1 replacement) — needs `SessionState` rework + cross-session persistence decisions (OQ-XSP).
- Struggle mode (penalty doubling, struggle replacement) — needs schema fields for `penalty` and `inStruggleMode`.
- Per-card warm-up (first 5 reps don't count) — needs `warmupCount` schema field, depends on OQ-W resolution.
- Per-letter analytics / signed progress bar — UI work, separate concern.

These remain in `bornomala-learning-algorithm-v2.md` as the next-up plan.

---

## Plan-File Note

This plan was relocated from the auto-generated path `~/.claude/plans/from-my-perspective-the-sunny-canyon.md` to its proper project home per global CLAUDE.md rule 9 (plan-mode rename) and `~/.claude/shared/NAMING-CONVENTIONS.md`. Subsequent plan edits target this file at `docs/plans/bornomala-algorithm-newcomer-boost.md`.
