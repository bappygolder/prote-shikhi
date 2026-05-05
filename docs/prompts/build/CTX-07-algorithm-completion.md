# CTX-07 — Sprinkle, Path-complete, Doc Alignment

**Status**: ⏳ Pending
**Author tool**: Claude Code (Opus 4.7)
**Created**: 2026-05-05
**Last updated**: 2026-05-05
**$ value**: UNSCORED
**Urgency**: 5
**Score**: UNSCORED

---

## What this context window does

Final algorithm slice. Lands:

- Sprinkle eligibility + cooldown (mastered cards get a periodic retention surface).
- Newly-mastered quiet period (just-mastered cards rest before re-appearing).
- Path-complete event (silent — `console.log` only; UI celebration deferred).
- Sprinkle-only mode after path complete (when user "keeps going").
- Documentation alignment: `docs/LEARNING-LOGIC.md` and `docs/PRODUCT-LOGIC.md` updated to v2 rules.
- `docs/LEARNING-ALGORITHM.md` change log → `v2.0` (no `-draft-N` suffix). Implementation has landed.

After this, the algorithm matches the spec end-to-end.

---

## Prerequisites

- CTX-06 status `✅ Done`. CTX-06R passed.
- Spec at `v2.0-draft-3`: `docs/LEARNING-ALGORITHM.md`.
- Plan: `docs/plans/bornomala-learning-algorithm-v2-prompt-chain.md`.

---

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

---

## Recommended model

`claude-sonnet-4-6`. **Thinking**: Off.

---

## Prompt to paste

```markdown
You are implementing CTX-07 — the final algorithm slice. Read this prompt at `docs/prompts/build/CTX-07-algorithm-completion.md`. Then read spec sections §11, §12, §6 (sprinkle constants).

## Before starting

1. `git pull origin main`
2. `git log --oneline -5` — confirm CTX-05 and CTX-06 are landed.
3. Read in order:
   - `docs/LEARNING-ALGORITHM.md` §11, §12, §6
   - Current `lib/learning.ts` (after CTX-06)
   - `lib/learning.test.ts`
   - `App.tsx` lines 700–760 (grade handler)
   - `docs/LEARNING-LOGIC.md` (the file you'll rewrite)
   - `docs/PRODUCT-LOGIC.md` (one row to update)

Recap CTX-07 in 2–3 sentences before code.

## Task 1 — Sprinkle constants

In `lib/learning.ts`:

```ts
export const SPRINKLE_EVERY_N_CARDS = 7;
export const SPRINKLE_COOLDOWN = 15;
export const NEWLY_MASTERED_QUIET_PERIOD = 10;
```

## Task 2 — Sprinkle eligibility

```ts
export function eligibleForSprinkle(
  cardProgress: LetterProgress,
  state: SessionState,
): boolean { ... }
```

Per spec §12: returns true iff
- `cardProgress.mastered`
- AND `cardProgress.sprinkleCooldown === 0`
- AND `state.cardsShown % SPRINKLE_EVERY_N_CARDS === 0`
- AND NOT `state.inStruggleMode`
- AND NOT `cardProgress.cardsShownSinceMastered < NEWLY_MASTERED_QUIET_PERIOD`

## Task 3 — Update `visibilityScore` to honor sprinkles

Replace CTX-06's hard-zero on mastered cards with the sprinkle-aware logic per spec §8:

```
if (cardProgress.mastered) {
  if (eligibleForSprinkle(cardProgress, state)) {
    score += W_SPRINKLE;
    // skip the other "live card" terms; sprinkles are just the bonus
  } else {
    return 0;  // mastered but not eligible → quiet
  }
}
```

The previousCardId hard rule still applies (a sprinkled card cannot be the previous card).

## Task 4 — Cooldown decrement & quiet-period decrement

Each time a card is shown, every other mastered card's `sprinkleCooldown` decrements by 1 (clamped at 0). And `cardsShownSinceMastered` increments for every mastered card on every grade.

Add:

```ts
export function tickSprinkleCooldowns(progress: ProgressByCard, shownCardId: string): ProgressByCard
export function tickPostMasteryCounters(progress: ProgressByCard): ProgressByCard
```

Wire into App.tsx grade handler — call `tickSprinkleCooldowns` after picking the next card, and `tickPostMasteryCounters` on each grade. When a card is shown as a sprinkle, set its `sprinkleCooldown = SPRINKLE_COOLDOWN`.

## Task 5 — Path-complete event

```ts
export function isPathComplete(path: LetterCard[], progress: ProgressByCard): boolean
```

True when every card in `path` has `mastered === true`.

Add an optional callback parameter to App.tsx's grade handler:

```ts
if (isPathComplete(selectedPresetCards, nextProgress) && !wasPathCompleteBefore) {
  console.log('[bornomala] path complete:', selectedPreset.id);
  // UI celebration TBD — out of scope for CTX-07
}
```

`wasPathCompleteBefore` = `isPathComplete(selectedPresetCards, progress)` (the pre-grade state).

**No UI work.** Only `console.log`. The celebration screen is a future UI prompt.

## Task 6 — Sprinkle-only mode after path complete

When `isPathComplete(...)`:
- `chooseNextCard` should treat the entire mastered path as the candidate pool (not just `state.activeSet`).
- Apply visibility scoring with sprinkle weight only; anti-repeat still hard.
- This kicks in automatically because the active set will have shrunk to empty (all cards mastered → all removed from active). Add a fallback inside `chooseNextCard`: if `state.activeSet.length === 0 AND isPathComplete(path, progress)`, score from the full path's mastered cards.

## Task 7 — Doc alignment

### `docs/LEARNING-LOGIC.md`

Replace the "Progress Model" + "Next Card Logic" sections with a v2 description matching spec. Mark the section "Updated to v2 — see `docs/LEARNING-ALGORITHM.md` for the full algorithm spec." Keep the higher-level "Teaching Model" and "Card Model" sections intact.

### `docs/PRODUCT-LOGIC.md`

Find the row:
```
| Mastery target | 10 correct answers | Simple visible goal |
```
Replace with:
```
| Mastery target | 10 correct **in a row** (streak resets on wrong) | Truer mastery signal |
| Per-card warm-up | First 5 corrects per card don't count toward the bar | Lets learners get familiar before scoring pressure |
```

### `docs/LEARNING-ALGORITHM.md`

Bump version banner from `v2.0-draft-3` to `v2.0` and update `Status` line to "Implemented in CTX-05 / CTX-06 / CTX-07." Add a change-log entry.

## Task 8 — Tests

Extend `lib/learning.test.ts`:
- `eligibleForSprinkle`: returns false for un-mastered cards.
- `eligibleForSprinkle`: returns false during quiet period (cardsShownSinceMastered < 10).
- `eligibleForSprinkle`: returns false during struggle mode.
- `eligibleForSprinkle`: returns true at the 7th card shown in a session, when cooldown is 0 and quiet period passed.
- `tickSprinkleCooldowns`: decrements all mastered cards' cooldowns; floors at 0; the just-shown card is unaffected (its cooldown gets reset by the caller).
- `isPathComplete`: true iff every path card is mastered.
- `chooseNextCard` in path-complete state: returns a mastered card; respects anti-repeat.

## After all tasks

1. `npm run typecheck`
2. `npx tsx --test lib/learning.test.ts`
3. `npm run web` — manual:
   - Quick-test fixture: monkey-patch progress so 1 card is mastered with quiet period passed → confirm sprinkle eligibility fires every 7 cards.
   - Reset → grind through enough corrects to actually master a card via the streak rule → confirm `console.log('[bornomala] path complete: ...')` does NOT fire (only one card, path not complete).
4. Commit:
   `git add lib/learning.ts lib/learning.test.ts App.tsx docs/LEARNING-LOGIC.md docs/PRODUCT-LOGIC.md docs/LEARNING-ALGORITHM.md`
   `git commit -m "feat(algo): v2 sprinkle, path-complete event, and doc alignment"`
   `git push origin main`
5. Update Status to ✅ Done.

## Verification checklist

- [ ] `npm run typecheck` PASS
- [ ] `npx tsx --test lib/learning.test.ts` PASS
- [ ] `npm run web` works; no UI changes; no console errors
- [ ] `console.log('[bornomala] path complete: ...')` fires when every card in a preset is mastered
- [ ] Sprinkles surface every 7 cards once a card is mastered + quiet period passed
- [ ] `docs/LEARNING-LOGIC.md` reflects v2
- [ ] `docs/PRODUCT-LOGIC.md` mastery row updated
- [ ] `docs/LEARNING-ALGORITHM.md` is at version `v2.0` (no draft suffix); change log entry added

## What NOT to do

- Do NOT add any UI for path complete (no banner, no modal, no toast). Only `console.log`.
- Do NOT add a celebration screen, "next path" picker, or "keep going" button. UI is frozen.
- Do NOT touch `data/banglaLetters.ts`.
- Do NOT change weight constants (W_SPRINKLE etc.) from spec §6.
- Do NOT regress earlier tests — run the full file, not just new cases.

## If you are running low on context

Same handover protocol: WIP commit, push, write `docs/handover/CTX-07-handover-YYYY-MM-DD.md`, stop.

## Next step

`docs/prompts/build/CTX-07R-algorithm-completion-review.md`. After PASS, the chain is complete and Bappy can plan the UI follow-up.
