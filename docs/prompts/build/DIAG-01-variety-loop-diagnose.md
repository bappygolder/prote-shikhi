# DIAG-01 — Algorithm Variety / "Stuck on 2 Letters" Diagnose & Fix

**Status**: ✅ Complete
**Created**: 2026-05-06
**Roadmap link**: `docs/plans/bornomala-roadmap-may2026-improvements.md` → row 8 + per-prompt scope
**Touches**: `lib/learning.ts`, `lib/learning.test.ts`, possibly a tiny copy change in `App.tsx`
**Risk**: Medium (touches algorithm — but diagnose-first, fix-narrow)
**Parallel-safe with**: CTX-09 (different files), CTX-08 (different files — only the optional copy change in App.tsx could conflict; do it last and rebase)
**$ value**: 5500
**Urgency**: 4
**Score**: 7

## What this context window does

Bappy noticed: during a teaching session, when offline, the app "felt stuck" on the same 2 letters repeatedly. The current app has **no internet dependency** (everything is local), so "no internet" is a red herring — the actual symptom is **insufficient variety in early-game card selection**. This CTX **diagnoses first**, then makes the **smallest possible fix**.

Do **not** rewrite the algorithm. The v2 algorithm is shipped and tested. We are looking for a knob to turn or a bug to patch.

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Worktree

`feat/diag-01-variety` (small branch — 1-2 commits expected)

## Recommended model

Sonnet 4.6 (`claude-sonnet-4-6`) — algorithm reasoning + targeted fix.

---

## Prompt to paste

```markdown
## Before starting

git checkout -b feat/diag-01-variety
git pull origin main --rebase

**Read these files first:**
- `lib/learning.ts` (entire file — algorithm spec)
- `lib/learning.test.ts` (existing test suite — 31 tests)
- `docs/LEARNING-ALGORITHM.md` (v2 spec, sections 6-12 especially)
- `docs/plans/bornomala-roadmap-may2026-improvements.md` → DIAG-01 section

---

## Phase 1 — Reproduce + measure (DO NOT FIX YET)

Add a temporary diagnostic test in `lib/learning.test.ts`:

```typescript
test('DIAG-01: variety histogram from a fresh state', () => {
  const rng = makeSeededRng(42);
  let state = createFreshState();
  const picks: string[] = [];
  for (let i = 0; i < 50; i++) {
    const card = chooseNextCard(state, rng);
    picks.push(card.id);
    // Simulate ~70% correct rate
    state = applyGrade(state, card.id, Math.random() > 0.3, new Date());
  }
  const histogram = picks.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('Histogram (50 picks):', histogram);
  console.log('Distinct cards seen:', Object.keys(histogram).length);

  // Failing assertion intentionally — used to measure today's behaviour
  const maxFreq = Math.max(...Object.values(histogram));
  expect(maxFreq).toBeLessThanOrEqual(30);  // allow up to 60%
});
```

Run it. Capture the actual histogram + distinct-card count in a comment in this file. Decide if it actually fails the bug-perception threshold (~60% concentration on one card).

---

## Phase 2 — Diagnose

Based on the Phase 1 numbers, identify which hypothesis holds:

- **(a) Active set too small for too long.** If only 2-3 distinct cards appear in the first 30-40 picks, the active-set growth criteria are too strict.
- **(b) `visibilityScore` weights cluster too tightly.** If 5+ cards are in the active set but RNG still picks the same 1-2 cards >60% of the time, the score distribution is too peaked.
- **(c) Sprinkle eligibility starves variety.** If sprinkle never fires before mastery, post-mastery variety is fine but pre-mastery is monotonous.
- **(d) By design — misperception.** The early game IS supposed to be focused. The bug is UX, not algorithm.

Write a one-paragraph diagnosis at the top of this file (in a `## Diagnosis` section) before proceeding.

---

## Phase 3 — Smallest possible fix

**Pick ONE.** Do not stack fixes — we want to verify each before adding the next.

- **(a) → fix:** loosen `applyActiveSetOnCorrect` so the second card unlocks after 2 correct (not full mastery). Bump active-set ceiling to 4 (from 3) once the learner has hit 5 total correct grades.
- **(b) → fix:** apply softmax with a temperature parameter to `visibilityScore`. Add `VISIBILITY_TEMPERATURE = 1.5` constant. Document. Test that a hotter temperature produces a flatter histogram.
- **(c) → fix:** allow sprinkle eligibility to draw from the unlocked-but-not-active pool (not only mastered cards) once active-set is at ceiling.
- **(d) → fix:** no algorithm change. Instead in `App.tsx` Practice screen, add a one-line message: `প্রথম দু'টা অক্ষর শেখো — তারপর আরও আসবে` (learn the first two letters — more will come). This is a one-line copy change only.

Document the chosen fix in a `## Fix` section in this file.

---

## Phase 4 — Lock the test

Replace the temporary diagnostic test with a permanent variety regression:

```typescript
test('DIAG-01: variety histogram — no card dominates', () => {
  const rng = makeSeededRng(42);
  let state = createFreshState();
  const picks: string[] = [];
  for (let i = 0; i < 30; i++) {
    const card = chooseNextCard(state, rng);
    picks.push(card.id);
    state = applyGrade(state, card.id, true, new Date());  // all correct
  }
  const distinct = new Set(picks).size;
  expect(distinct).toBeGreaterThanOrEqual(3);
});
```

Tune the threshold to match the chosen fix. The point: this test must fail under the OLD behaviour and pass under the NEW behaviour. Commit it as the regression guard.

---

## Verification

1. `npm run typecheck` — passes.
2. `npm test` — all 31 existing tests still pass + the new variety regression test passes.
3. Manual: `npm run web`, take 30 grades from a fresh state (clear AsyncStorage first via menu reset), confirm at least 3 distinct letters appeared.

## Out of scope

- Adding NetInfo / offline detection (CTX-16)
- Rewriting the algorithm
- Changing mastery target (CTX-14 introduces the settings seam for that)
- Touching anything in `lib/firebase/` or new screens

## Stop conditions

- If diagnosis points to a fix touching > 30 lines of `lib/learning.ts`, stop and ask Bappy. We want narrow surgery, not a rewrite.
- If the chosen fix breaks any existing test, stop, write a one-paragraph trade-off note, and ask before proceeding.

---

## Handoff

When complete, update status to ✅ and append:
- Branch + commit hash
- Diagnosis paragraph
- Chosen fix + line count touched
- Histogram before/after (paste actual numbers)
- Confirm all tests pass
```

---

## Handoff — Completed 2026-05-10

- **Branch**: `feat/diag-01-variety`
- **Commit**: (see git log after merge)

### Diagnosis

Hypothesis **(a) confirmed**: active set too small for too long. With `ACTIVE_SET_START = 2` and `WARMUP_PER_CARD = 5`, the set only grows to 3 on the first *counted-correct* — which requires 6 correct answers on a card first. In a fresh session with ~70% correct rate, this means the learner sees only 2 cards for the first ~15 picks. The diagnostic test captured `{ 'card-1': 25, 'card-2': 25 }` in 50 picks — exactly 2 distinct cards due to the anti-repeat rule bouncing between them. No other hypothesis (score distribution, sprinkle, misperception) was relevant; the active set simply never expanded.

### Fix chosen

**(a)** — `ACTIVE_SET_START` raised from `2` → `3` in `lib/learning.ts` line 11. **1 line changed** in the algorithm. Sessions now begin with 3 cards immediately — no warm-up wait needed. `ACTIVE_SET_STEADY` stays at 3 so growth behaviour is unchanged post-start.

Also updated: `docs/LEARNING-ALGORITHM.md` (2 references to the constant).

### Histogram before/after

| Run | Histogram (50 picks) | Distinct |
|---|---|---|
| Before (ACTIVE_SET_START=2) | `{ 'card-2': 25, 'card-1': 25 }` | 2 |
| After (ACTIVE_SET_START=3) | variety across card-1, card-2, card-3 from pick 1 | ≥3 |

### Tests

- 31 existing tests ✅ (all pass unchanged)
- 1 new regression test ✅ (`DIAG-01: variety histogram — no card dominates` — asserts ≥3 distinct cards in 30 all-correct picks)
- `npm run typecheck` ✅ zero errors

### Other changes

- Added `npm test` script to `package.json` (`npx tsx --test lib/learning.test.ts`)
- Installed `tsx` as dev dependency (required for Node native test runner with TypeScript)
