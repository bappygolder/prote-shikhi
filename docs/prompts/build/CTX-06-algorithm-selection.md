# CTX-06 — Algorithm v2 Selection (chooseNextCard, active set, struggle mode)

**Status**: ✅ Done
**Author tool**: Claude Code (Opus 4.7) → executed by claude-sonnet-4-6
**Created**: 2026-05-05
**Last updated**: 2026-05-06
**$ value**: UNSCORED
**Urgency**: 5
**Score**: UNSCORED

> **Result (2026-05-06)**: v2 selection logic landed. `lib/learning.ts` ships `SessionState` + `initSessionState`, the spec-correct `visibilityScore(card, cardProgress, state)` with hard anti-immediate-repeat & mastered-returns-0 rules, weighted-random `chooseNextCard(cards, progress, previousCardId, session?, rng?)`, active-set lifecycle helpers (`applyActiveSetOnCorrect`, `applyActiveSetOnMastery`), and struggle mode (`maybeEnterStruggleMode`, `maybeExitStruggleMode`, `struggleScore`). `App.tsx` `handleGrade` rewired to drive selection from session state on the default `unlocked` list (legacy uniform pick preserved on `needsWork` / `mastered` / `সব`). ba718c3's `NEWCOMER_BOOST_MAX`, `NEWCOMER_DECAY_REPS`, `W_WRONG`, `POOL_SIZE` constants removed. CTX-05's `applyGrade` and `migrateProgress` untouched. Plan: [`docs/plans/bornomala-ctx-06-algorithm-selection-plan.md`](../../plans/bornomala-ctx-06-algorithm-selection-plan.md). Verification: `npm run typecheck` PASS, 22/22 tests PASS, web bundle exports clean (543 kB). Next: CTX-06R review, then CTX-07 (sprinkle + path-complete + doc alignment).

---

## What this context window does

Land the v2 **selection logic**: visibility score, weighted-random `chooseNextCard`, hard anti-immediate-repeat, active-set lifecycle (start 2 → grow to 3 on first counted-correct → 1-for-1 replacement on mastery), and struggle-mode shrink/restore. After this prompt the teacher will *feel* a different app — cards alternate, struggle shrinks the rotation, new cards dominate visibility for ~8 reps.

Sprinkle and path-complete events are NOT in this slice — those land in CTX-07.

---

## Prerequisites

- CTX-05 status is `✅ Done`.
- CTX-05R review status is `✅ Done` (PASS).
- Spec at `v2.0-draft-3`: `docs/LEARNING-ALGORITHM.md`.
- Plan: `docs/plans/bornomala-learning-algorithm-v2-prompt-chain.md`.

> **Heads-up — partial work already in main.** Commit `ba718c3` (a parallel agent) shipped a simple `visibilityScore(progress)` function plus tunables (`NEWCOMER_BOOST_MAX`, `NEWCOMER_DECAY_REPS`, `W_WRONG`, `POOL_SIZE`) and a top-5 weighted pool inside `chooseNextCard`. **You will REPLACE that** with the full spec §8 / §10 implementation. Their newcomer intent is preserved (and improved) by the spec's `attemptsSinceEnteringActive` + `NEW_CARD_BOOST_WEIGHT` / `NEW_CARD_BOOST_DURATION` design. Remove their constants after the new ones land — do not leave dead tunables in the file. Reference their commit in your message: `feat(algo): v2 chooseNextCard — supersedes ba718c3 newcomer-boost subset`. Also read `docs/plans/bornomala-algorithm-newcomer-boost.md` (their plan) to confirm nothing else they shipped escapes this replacement.

---

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

---

## Recommended model

`claude-sonnet-4-6`. **Thinking**: On (visibility-score weights and active-set transitions need careful traversal of spec).

---

## Prompt to paste

```markdown
You are implementing CTX-06 of the Bornomala learning-algorithm v2 chain. Read this prompt at `docs/prompts/build/CTX-06-algorithm-selection.md` in full. Then read spec sections §5, §6, §8, §9, §10 before writing any code.

## Before starting

1. `git pull origin main`
2. `git log --oneline -5` — confirm CTX-05 is at HEAD or HEAD-N and no CTX-06 work has landed.
3. Read in order:
   - `docs/LEARNING-ALGORITHM.md` (spec §5–§10)
   - `lib/learning.ts` (current state after CTX-05)
   - `lib/learning.test.ts` (current state)
   - `App.tsx` lines 530–760 (the practice surface — grade handler, active card management, hydrate)

Recap CTX-06 to me in 2–3 sentences before writing any code.

## Task 1 — Add `SessionState` and helpers

Per spec §5:

```ts
export type SessionState = {
  startedAt: string;
  cardsShown: number;
  recentGrades: Array<'c' | 'w'>;
  inStruggleMode: boolean;
  consecutiveCorrectInSession: number;
  previousCardId: string | null;
  twoBackCardId: string | null;
  activeSet: string[];
  prePushedActiveSet: string[] | null;
};

export function initSessionState(path: LetterCard[], progress: ProgressByCard): SessionState { ... }
```

`initSessionState` builds the active set from the path's first un-mastered cards (size = `ACTIVE_SET_START` = 2). Use `getProgressForCard` to check mastery.

Also add the parameter constants from spec §6 not yet exported:

```ts
export const ACTIVE_SET_START = 2;
export const ACTIVE_SET_STEADY = 3;
export const ACTIVE_SET_STRUGGLE = 2;
export const STRUGGLE_WRONG_THRESHOLD = 2;
export const STRUGGLE_RECOVERY_STREAK = 6;
export const NEW_CARD_BOOST_DURATION = 8;
export const NEW_CARD_BOOST_WEIGHT = 8;
export const W_BASE = 1;
export const W_RECENT_MISS = 4;
export const W_PENALTY = 1.5;
export const W_STREAK_GAP = 0.3;
export const W_FRESHNESS = 0.5;
export const W_SPRINKLE = 2.5;          // exported but only used by CTX-07's sprinkle eligibility
```

## Task 2 — Implement `visibilityScore`

Per spec §8. Pure function:

```ts
export function visibilityScore(
  card: LetterCard,
  cardProgress: LetterProgress,
  state: SessionState,
): number { ... }
```

Hard rules (return 0 outright):
- `card.id === state.previousCardId AND state.activeSet.length > 1`  → 0 (anti-immediate-repeat)
- `cardProgress.mastered` → 0 (mastered cards stay quiet in CTX-06; sprinkle eligibility lands in CTX-07)

Additive terms — exactly as spec §8 lists. Newcomer boost: `attemptsSinceEnteringActive < NEW_CARD_BOOST_DURATION` adds `NEW_CARD_BOOST_WEIGHT * (1 - attemptsSinceEnteringActive / NEW_CARD_BOOST_DURATION)`.

`recentResults[-1]` test: `recentResults.length > 0 && recentResults[recentResults.length - 1] === 'w'`.

## Task 3 — Rewrite `chooseNextCard`

Per spec §10. New signature:

```ts
export function chooseNextCard(
  cards: LetterCard[],
  progress: ProgressByCard,
  previousCardId: string,
  session?: SessionState,
  rng: () => number = Math.random,
): LetterCard { ... }
```

`session` is optional for backward compat. If undefined, build a transient one from `cards` + `progress` + `previousCardId` so the call site doesn't have to migrate yet — but App.tsx will pass real session state in Task 6.

Algorithm:
1. If `session.activeSet.length === 1`, return that card (single-card fallback).
2. Compute scores for cards in `session.activeSet`. Filter by score > 0.
3. If filter is empty, fall back to first non-previous active card; if even that's empty, first active card.
4. Weighted-random sample using the injected `rng`.

Helper: `weightedRandomPick(scored: Array<[LetterCard, number]>, rng): LetterCard`.

## Task 4 — Active-set lifecycle helpers

Per spec §9. Pure functions (no side effects on caller):

```ts
export function applyActiveSetOnCorrect(
  state: SessionState,
  cardId: string,
  cardProgress: LetterProgress,
  path: LetterCard[],
): SessionState { ... }

export function applyActiveSetOnMastery(
  state: SessionState,
  masteredCardId: string,
  path: LetterCard[],
): SessionState { ... }
```

Rules (exact):
- On first counted-correct on an active card AND `state.activeSet.length < ACTIVE_SET_STEADY` AND not in struggle mode: append the next un-entered card from the path. `attemptsSinceEnteringActive` for that card resets to 0 (do this in App.tsx grade handler, since per-card state lives there).
- On mastery: remove the mastered card from `activeSet`; append the next un-entered card from the path.

"First counted-correct" means: this correct just brought `cardProgress.correctCount` from `WARMUP_PER_CARD` to `WARMUP_PER_CARD + 1`. Detect it in App.tsx grade handler (you have both old and new progress) and call `applyActiveSetOnCorrect`.

## Task 5 — Struggle mode

Per spec §9 — pure functions:

```ts
export function maybeEnterStruggleMode(state: SessionState, progress: ProgressByCard, path: LetterCard[]): SessionState { ... }
export function maybeExitStruggleMode(state: SessionState, path: LetterCard[]): SessionState { ... }
```

Enter: `count(state.recentGrades, 'w') >= STRUGGLE_WRONG_THRESHOLD AND not state.inStruggleMode`
  → set `inStruggleMode = true`
  → save `prePushedActiveSet = activeSet`
  → shrink `activeSet` to top `ACTIVE_SET_STRUGGLE` by `struggleScore` (spec §9 helper).

Exit: `state.consecutiveCorrectInSession >= STRUGGLE_RECOVERY_STREAK AND state.inStruggleMode`
  → set `inStruggleMode = false`
  → restore `activeSet = prePushedActiveSet`
  → clear `prePushedActiveSet`.

`struggleScore(card)` = `consecutiveMistakes * 3 + penalty + count(recentResults, 'w')`.

## Task 6 — Wire into `App.tsx`

Add `useState<SessionState>` initialized via `initSessionState(selectedPresetCards, progress)`. Reset on preset change.

In the grade handler (currently around line 737):
```ts
const wasFirstCountedCorrect =
  wasCorrect &&
  current.correctCount === WARMUP_PER_CARD &&
  next.correctCount === WARMUP_PER_CARD + 1;

const wasJustMastered = !current.mastered && next.mastered;

let nextSession = {
  ...session,
  recentGrades: pushBounded(session.recentGrades, wasCorrect ? 'c' : 'w', RECENT_WINDOW),
  consecutiveCorrectInSession: wasCorrect ? session.consecutiveCorrectInSession + 1 : 0,
};

if (wasFirstCountedCorrect) {
  nextSession = applyActiveSetOnCorrect(nextSession, currentCard.id, next, selectedPresetCards);
}
if (wasJustMastered) {
  nextSession = applyActiveSetOnMastery(nextSession, currentCard.id, selectedPresetCards);
}
nextSession = wasCorrect
  ? maybeExitStruggleMode(nextSession, selectedPresetCards)
  : maybeEnterStruggleMode(nextSession, nextProgress, selectedPresetCards);

const chosen = chooseNextCard(selectedPresetCards, nextProgress, currentCard.id, nextSession);

nextSession = {
  ...nextSession,
  twoBackCardId: nextSession.previousCardId,
  previousCardId: chosen.id,
  cardsShown: nextSession.cardsShown + 1,
};
setSession(nextSession);
```

`pushBounded` is a tiny helper; export from `lib/learning.ts`.

**Do NOT touch any rendering code, UI text, or component layout.** This is a state-flow change only.

## Task 7 — Extend `lib/learning.test.ts`

Use a seeded RNG (e.g. `mulberry32`) for deterministic weighted-random tests.

Cases (minimum):
- `visibilityScore`: previous-card returns 0 when active.length > 1.
- `visibilityScore`: previous-card returns nonzero when active.length === 1.
- `visibilityScore`: mastered card returns 0 (CTX-07 will change this; for now confirm).
- `visibilityScore`: newcomer boost decays from NEW_CARD_BOOST_WEIGHT at attempt 0 to 0 at attempt NEW_CARD_BOOST_DURATION.
- `chooseNextCard`: never returns previousCardId when active.length > 1, over 200 trials.
- `chooseNextCard`: weighted distribution favors highest-score card (over 1000 trials, top card chosen ≥ 35% of the time when 2nd is half the weight).
- `chooseNextCard`: single-card fallback returns the only card.
- `applyActiveSetOnCorrect`: first counted-correct grows from 2 → 3.
- `applyActiveSetOnCorrect`: subsequent counted-corrects do NOT grow further.
- `applyActiveSetOnMastery`: mastered card removed; next path card appended.
- `maybeEnterStruggleMode`: 2 wrongs in last 6 enters mode; active set shrinks to top 2 by struggleScore.
- `maybeExitStruggleMode`: 6 consecutive correct exits; active set restored.

## After all tasks

1. `npm run typecheck`
2. `npx tsx --test lib/learning.test.ts`
3. `npm run web` — manual scenario:
   - Fresh state. Grade ✓ ✗ ✓ ✓ ✗ ✗ ✓ ✓ ✓ ✓ ✓ ✓.
   - Confirm: never the same card twice in a row, after warm-up clears a 3rd card joins, after 2 wrongs the active rotation shrinks to 2, after 6 corrects it restores.
4. Commit:
   `git add lib/learning.ts lib/learning.test.ts App.tsx`
   `git commit -m "feat(algo): v2 chooseNextCard with visibility score, active-set lifecycle, struggle mode"`
   `git push origin main`
5. Update Status to ✅ Done.

## Verification checklist

- [ ] `npm run typecheck` PASS
- [ ] `npx tsx --test lib/learning.test.ts` PASS
- [ ] Manual web scenario above passes
- [ ] No visible UI change (component tree unchanged)
- [ ] Same card never repeats twice in a row
- [ ] Newcomer dominates rotation for ~8 reps after entering active set
- [ ] Struggle mode shrinks rotation to 2 cards under 2 wrongs in last 6
- [ ] Commit pushed; Status ✅ Done

## What NOT to do

- Do NOT add sprinkle eligibility / cooldown — CTX-07.
- Do NOT add path-complete event — CTX-07.
- Do NOT update `docs/LEARNING-LOGIC.md` or `docs/PRODUCT-LOGIC.md` — CTX-07 owns the doc alignment.
- Do NOT modify `applyGrade` from CTX-05 result (other than wiring penalties — they should already be correct).
- Do NOT change UI rendering, component structure, or any visible behavior.
- Do NOT add Math.random calls outside the injected `rng` parameter.

## If you are running low on context

Same handover protocol as CTX-05: WIP commit, push, write `docs/handover/CTX-06-handover-YYYY-MM-DD.md`, stop.

## Next step

`docs/prompts/build/CTX-06R-algorithm-selection-review.md`.
