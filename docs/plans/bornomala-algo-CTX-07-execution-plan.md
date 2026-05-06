# CTX-07 — Sprinkle, Path-Complete, Doc Alignment — Execution Plan

**Status**: ⏳ Plan-mode review
**Created**: 2026-05-06
**Owner**: Claude Code (sonnet-4-6, thinking off)
**Prompt**: `docs/prompts/build/CTX-07-algorithm-completion.md`
**Spec**: `docs/LEARNING-ALGORITHM.md` §6, §11, §12

> Plan-mode auto-created `~/.claude/plans/quickly-check-have-we-precious-cook.md`. Per global rule #9, the canonical plan lives at this project path. Stub will be deleted after approval.

---

## Recommended Model
- Model: claude-sonnet-4-6
- Complexity: Medium
- Reason: Additive features + doc edits; well-bounded by spec; no UI; CTX-05/06 foundations already in place.

---

## Context

CTX-05 landed schema + `applyGrade` (streak after warm-up). CTX-06 landed `chooseNextCard`, active-set lifecycle, struggle mode. The spec is at `v2.0-draft-3`, but the algorithm only matches §1–§10 — sprinkle (§12), newly-mastered quiet period, path-completion (§11 last paragraph), and the supporting bookkeeping are still missing. The user-facing docs (`LEARNING-LOGIC.md`, `PRODUCT-LOGIC.md`) still describe the v1 cumulative-correct rule.

**Goal of CTX-07**: close the algorithm spec by adding sprinkle eligibility, post-mastery counters, path-complete detection (silent — `console.log` only, no UI), and align user-facing docs to v2. Bump spec banner from `v2.0-draft-3` → `v2.0`.

---

## Out of scope (do NOT do)

- Any UI for path-complete (no banner, no modal, no toast — only `console.log`)
- "Move on / keep going" picker, celebration screen, next-path picker
- Edits to `data/banglaLetters.ts`
- Changing weight constants (`W_SPRINKLE` etc.) from spec §6
- Deleting/regressing CTX-05 or CTX-06 tests

---

## Files to modify

| File | Change |
|---|---|
| `lib/learning.ts` | Add sprinkle constants, `eligibleForSprinkle`, `tickSprinkleCooldowns`, `tickPostMasteryCounters`, `isPathComplete`. Update `visibilityScore` for sprinkle/quiet-period rules. Update `chooseNextCard` to fall back to full mastered path when active set is empty AND path is complete. |
| `lib/learning.test.ts` | Add 7 tests covering eligibility, ticks, path-complete, and post-path-complete selection. |
| `App.tsx` | Wire `tickSprinkleCooldowns` (after picking next card) and `tickPostMasteryCounters` (each grade). On sprinkle-shown card, set `sprinkleCooldown = SPRINKLE_COOLDOWN`. Detect path-complete transition with pre/post compare and `console.log`. |
| `docs/LEARNING-LOGIC.md` | Replace "Progress Model" + "Next Card Logic" sections with v2 description; keep Teaching Model + Card Model intact. Mark "Updated to v2 — see `docs/LEARNING-ALGORITHM.md`". |
| `docs/PRODUCT-LOGIC.md` | Replace `Mastery target` row with "10 correct in a row" + add per-card warm-up row. |
| `docs/LEARNING-ALGORITHM.md` | Bump banner `v2.0-draft-3` → `v2.0`. Update Status to "Implemented in CTX-05 / CTX-06 / CTX-07." Add change-log row. |

---

## Key implementation details

### 1. Constants (`lib/learning.ts`, near other tunables)
```ts
export const SPRINKLE_EVERY_N_CARDS = 7;
export const SPRINKLE_COOLDOWN = 15;
export const NEWLY_MASTERED_QUIET_PERIOD = 10;
```
`W_SPRINKLE` already declared at line 31.

### 2. `eligibleForSprinkle(cardProgress, state)`
Per spec §12 + CTX-07 prompt:
- `mastered === true`
- AND `sprinkleCooldown === 0`
- AND `cardsShown % SPRINKLE_EVERY_N_CARDS === 0`
- AND NOT `inStruggleMode`
- AND NOT `cardsShownSinceMastered < NEWLY_MASTERED_QUIET_PERIOD`

### 3. `visibilityScore` change
Currently lines 441–442 hard-zero mastered cards. Replace with sprinkle-aware logic:
```ts
if (cardProgress.mastered) {
  if (eligibleForSprinkle(cardProgress, state)) {
    // Anti-repeat hard rule still applies above this branch.
    return W_SPRINKLE;
  }
  return 0;
}
```
Anti-repeat (line 440) stays as the very first hard rule. Per spec §8 sprinkle is just the `W_SPRINKLE` bonus on top of `W_BASE = 1` — but the prompt says "skip the other 'live card' terms; sprinkles are just the bonus" so we return `W_SPRINKLE` only (no W_BASE). Re-read spec §8: pseudocode adds `W_BASE` then conditionally adds `W_SPRINKLE`. Prompt overrides this to "sprinkles are just the bonus." Follow the prompt — `return W_SPRINKLE`.

### 4. `tickSprinkleCooldowns(progress, shownCardId)`
Returns new ProgressByCard with every mastered card's `sprinkleCooldown` decremented by 1 (clamped at 0), EXCEPT the `shownCardId`. The just-shown card's cooldown is set elsewhere (by App.tsx when sprinkle fires) — this function leaves it alone.

### 5. `tickPostMasteryCounters(progress)`
Returns new ProgressByCard with every mastered card's `cardsShownSinceMastered` incremented by 1.

### 6. `isPathComplete(path, progress)`
Returns true iff every card in `path` has `mastered === true`. Already analogous to `isPresetComplete` (line 117) — reuse that function or rename. **Reuse**: export an alias `isPathComplete = isPresetComplete` to avoid duplication, OR keep both as the prompt names `isPathComplete`. Plan: add `isPathComplete` as a thin wrapper that calls `isPresetComplete` (no behavior change, matches prompt's API).

### 7. `chooseNextCard` path-complete fallback
At the top of `chooseNextCard`, after computing `activeCards`, if `activeCards.length === 0 AND isPathComplete(cards, progress)`:
- Build candidate pool from all mastered cards in `cards`.
- Apply visibility scoring with sprinkle weight only; anti-repeat hard rule still applies.
- Return weighted-random pick from non-zero scores.

### 8. App.tsx wiring
Around line 838 (after `chosen` is picked, before final state update):
```ts
const wasPathCompleteBefore = isPathComplete(selectedPresetCards, progress);
const isPathCompleteNow = isPathComplete(selectedPresetCards, nextProgress);
if (isPathCompleteNow && !wasPathCompleteBefore) {
  console.log('[bornomala] path complete:', selectedPreset.id);
}
```
After `chosen` is picked:
- Call `tickSprinkleCooldowns(finalProgress, chosen.id)`.
- If chosen is mastered AND sprinkle eligibility was true at pick time → set `chosen.sprinkleCooldown = SPRINKLE_COOLDOWN`.
- Call `tickPostMasteryCounters(...)` after grade is applied (apply once per grade).

Order of operations (preserved from CTX-06 where possible):
1. `applyGrade` → `nextProgress`
2. `tickPostMasteryCounters(nextProgress)` → bumps counters for all mastered cards
3. Active-set lifecycle (CTX-06)
4. Struggle-mode transitions (CTX-06)
5. `chooseNextCard(...)` → `chosen`
6. If chosen fired as sprinkle: `chosen.sprinkleCooldown = SPRINKLE_COOLDOWN`
7. `tickSprinkleCooldowns(progress, chosen.id)` → decrements others
8. Bump `attemptsSinceEnteringActive` for chosen (existing CTX-06 logic)
9. Path-complete detection (`console.log` only)

### 9. Doc updates
- **LEARNING-LOGIC.md**: Replace Progress Model and Next Card Logic sections. Keep Teaching Model, Card Model, Practice Preset Logic, Future Learning Extensions intact. Add header note: "Updated to v2 — see `docs/LEARNING-ALGORITHM.md` for the full algorithm spec."
- **PRODUCT-LOGIC.md**: Edit Business Rules table — replace `Mastery target | 10 correct answers | Simple visible goal` with two rows per prompt.
- **LEARNING-ALGORITHM.md**: Line 3 banner `v2.0-draft-3` → `v2.0`; Line 5 Status → "Implemented in CTX-05 / CTX-06 / CTX-07. Iterate via review cadence."; add change-log row.

---

## Tests to add (`lib/learning.test.ts`)

1. `eligibleForSprinkle` returns false for un-mastered cards
2. `eligibleForSprinkle` returns false during quiet period (`cardsShownSinceMastered < 10`)
3. `eligibleForSprinkle` returns false during struggle mode
4. `eligibleForSprinkle` returns true at the 7th card shown when cooldown=0 + quiet period passed + not struggling + mastered
5. `tickSprinkleCooldowns` decrements all mastered cards' cooldowns; floors at 0; the just-shown card unaffected
6. `isPathComplete` true iff every path card is mastered
7. `chooseNextCard` in path-complete state returns a mastered card; respects anti-repeat

Plus test #5 sub-assertion: un-mastered cards' cooldowns are not touched.

---

## Verification

1. `npm run typecheck` — must pass
2. `npx tsx --test lib/learning.test.ts` — all CTX-05 + CTX-06 + CTX-07 tests pass (≥29 total)
3. `npm run web` — browser:
   - Reset → grind through one card to mastery → path is single-card preset? Probably default preset has many cards, so verify `console.log('[bornomala] path complete')` does NOT fire after first mastery (other cards still un-mastered).
   - Optional sprinkle smoke: monkey-patch one card to mastered + cardsShownSinceMastered=999 in DevTools, confirm sprinkle eligibility fires every 7 cards.
4. Commit:
   ```
   git add lib/learning.ts lib/learning.test.ts App.tsx \
     docs/LEARNING-LOGIC.md docs/PRODUCT-LOGIC.md docs/LEARNING-ALGORITHM.md \
     docs/plans/bornomala-algo-CTX-07-execution-plan.md
   git commit -m "feat(algo): v2 sprinkle, path-complete event, and doc alignment"
   git push origin main
   ```
5. Update CTX-07 prompt status `⏳ Pending` → `✅ Done`. Commit + push that as a follow-up doc commit.

---

## Risk / edge cases

- **CTX-06 review finding (cardsAgoSeen)**: not addressed in CTX-07 (out of scope per prompt). Freshness term still uses recentResults proxy. Logged for future work.
- **`isPresetComplete` already exists** at line 117. Either reuse directly or add `isPathComplete` as an alias to satisfy prompt's API. Preferring alias to keep prompt's contract.
- **Sprinkle scoring** — prompt says "sprinkles are just the bonus" → return `W_SPRINKLE` only (no `W_BASE`). Spec §8 pseudocode adds `W_BASE` first; deferring to prompt's explicit override. Spec doc gets bumped to v2.0; if Bappy wants strict spec parity later, that's a one-line tweak.
- **App.tsx ordering** — `tickPostMasteryCounters` increments `cardsShownSinceMastered` for ALL mastered cards including the one just graded. Spec §7.1 sets `cardsShownSinceMastered = 0` at the moment of mastery and the counter reflects "cards shown since". After the just-mastered card's grade, the counter starts at 0; on subsequent grades it increments. Matches spec.
- **`tickSprinkleCooldowns` excludes the just-shown card** — caller resets that card's cooldown to `SPRINKLE_COOLDOWN` instead. Test 5 verifies this.

---

## Critical files (line refs)
- `lib/learning.ts:31` — W_SPRINKLE declaration
- `lib/learning.ts:117` — `isPresetComplete` (reuse)
- `lib/learning.ts:434–469` — `visibilityScore` (sprinkle-aware update)
- `lib/learning.ts:515–554` — `chooseNextCard` (add path-complete fallback)
- `App.tsx:25–44` — learning.ts imports (add new exports)
- `App.tsx:745–865` — `handleGrade` (wire ticks + path-complete detection)
- `docs/LEARNING-ALGORITHM.md:1–7` — banner + status
- `docs/LEARNING-ALGORITHM.md:651–657` — change log table
- `docs/LEARNING-LOGIC.md:42–82` — Progress Model + Next Card Logic sections
- `docs/PRODUCT-LOGIC.md:39–46` — Business Rules table
