# CTX-05 — Algorithm v2 Foundations (schema, migration, applyGrade)

**Status**: ✅ Done
**Author tool**: Claude Code (Opus 4.7)
**Created**: 2026-05-05
**Last updated**: 2026-05-05
**$ value**: UNSCORED
**Urgency**: 5
**Score**: UNSCORED

---

## What this context window does

Land the v2 algorithm's **schema, migration, and grading logic** in `lib/learning.ts` while keeping the existing UI and `chooseNextCard` working unchanged. After this prompt:

- `LetterProgress` has all v2 fields with safe defaults.
- `applyGrade` enforces streak-after-warm-up, sticky mastery, and the doubling/halving penalty.
- `migrateProgress` upgrades any v1 AsyncStorage shape to v2 lossless.
- A new `lib/learning.test.ts` proves all of the above.
- The app still runs identically in the browser — no visible change.

The visibility-score / chooseNextCard rewrite is **NOT** in this slice. It comes in CTX-06.

---

## Prerequisites

- Spec is locked at `v2.0-draft-3`: [`docs/LEARNING-ALGORITHM.md`](../../LEARNING-ALGORITHM.md). Read it before touching code.
- Plan: [`docs/plans/bornomala-learning-algorithm-v2-prompt-chain.md`](../../plans/bornomala-learning-algorithm-v2-prompt-chain.md).
- Working tree clean. `git pull origin main` first to avoid conflict with the parallel agent.

---

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

---

## Recommended model

`claude-sonnet-4-6` (Sonnet 4.6). **Thinking**: Off. Bounded scope, well-defined diff.

---

## Prompt to paste

```markdown
You are implementing CTX-05 of the Bornomala learning-algorithm v2 chain. Read the prompt file in full at `docs/prompts/build/CTX-05-algorithm-foundations.md`. Then read the spec at `docs/LEARNING-ALGORITHM.md` (sections 4, 5, 6, 7.1, 7.2, 7.3) before any edits.

## Before starting

1. `git pull origin main`
2. `git log --oneline -5` — confirm last commit and that no prior CTX-05 work landed.
3. Read these files in order:
   - `docs/LEARNING-ALGORITHM.md` (full)
   - `docs/plans/bornomala-learning-algorithm-v2-prompt-chain.md`
   - `lib/learning.ts` (the file you'll be modifying)
   - `App.tsx` lines 700–760 (the grade handler + AsyncStorage hydrate region)
   - `data/banglaLetters.ts` (only to know `MASTERY_TARGET` is here)

Recap CTX-05 to me in 2–3 sentences before writing any code. Confirm I'm ready.

## Task 1 — Extend `lib/learning.ts` schema

Per spec §4 and §6, extend `LetterProgress`:

```ts
export type LetterProgress = {
  // existing — preserved
  correctCount: number;
  wrongCount: number;
  seenCount: number;          // alias for `attempts` in spec §4
  mastered: boolean;          // STICKY: true once streak ever ≥ MASTERY_TARGET
  lastSeenAt: string | null;

  // new — streak (mastery signal)
  streak: number;
  bestStreak: number;

  // new — penalty / mistake dynamics
  penalty: number;
  consecutiveMistakes: number;

  // new — recency / selection signal
  recentResults: Array<'c' | 'w'>;

  // new — active-set lifecycle
  attemptsSinceEnteringActive: number;
  enteredActiveAt: string | null;
  cardsShownSinceMastered: number;

  // new — interleaving
  sprinkleCooldown: number;

  // new — reserved (defer; not populated)
  timeSpentMs: number;

  // new — timestamp
  firstSeenAt: string | null;
};

export type ProgressByCard = Record<string, LetterProgress>;

export type ProgressState = {
  schemaVersion: 2;
  byCard: ProgressByCard;
};
```

Also add the parameter constants from spec §6:

```ts
export const MASTERY_TARGET = 10;             // re-export
export const RECENT_WINDOW = 6;
export const WARMUP_PER_CARD = 5;             // 5 cumulative corrects per card
export const PENALTY_MAX = 16;
export const PENALTY_HALVE_ON_CORRECT = true;
```

Update `getProgressForCard` to return all v2 default fields. Update `resetCards` to clear v2 fields too.

## Task 2 — Rewrite `applyGrade`

Replace the current implementation per spec §7.1 and §7.2. Key rules:

- On correct: `correctCount++`. If `correctCount > WARMUP_PER_CARD` then `streak++`. If `streak >= MASTERY_TARGET` set `mastered = true` (sticky). `consecutiveMistakes = 0`. `penalty = floor(penalty / 2)`. Push `'c'` into `recentResults` (cap at `RECENT_WINDOW`).
- On wrong: `wrongCount++`. `streak = 0`. `consecutiveMistakes++`. `penalty = consecutiveMistakes === 1 ? 1 : Math.min(penalty * 2, PENALTY_MAX)`. Push `'w'`. **Wrongs do NOT decrement `correctCount` or consume warm-up budget.**
- Always: `seenCount++`, `lastSeenAt = now`, `firstSeenAt ??= now`.

Keep the function signature the same: `applyGrade(progress, cardId, wasCorrect): ProgressByCard`. Internal helper functions are fine.

## Task 3 — Add `migrateProgress`

```ts
export function migrateProgress(raw: unknown): ProgressState {
  // already v2: pass through
  if (raw && typeof raw === 'object' && (raw as any).schemaVersion === 2) {
    return raw as ProgressState;
  }
  // legacy: shape was ProgressByCard at top level
  const byCard: ProgressByCard = {};
  const legacy = (raw ?? {}) as Record<string, Partial<LetterProgress>>;
  for (const [id, old] of Object.entries(legacy)) {
    byCard[id] = {
      correctCount: old.correctCount ?? 0,
      wrongCount: old.wrongCount ?? 0,
      seenCount: old.seenCount ?? 0,
      mastered: old.mastered ?? false,           // preserve achievements
      lastSeenAt: old.lastSeenAt ?? null,
      streak: 0,                                  // unknown; safe
      bestStreak: 0,
      penalty: 0,
      consecutiveMistakes: 0,
      recentResults: [],
      attemptsSinceEnteringActive: 0,
      enteredActiveAt: null,
      cardsShownSinceMastered: old.mastered ? 999 : 0,  // already past quiet period
      sprinkleCooldown: 0,
      timeSpentMs: 0,
      firstSeenAt: old.lastSeenAt ?? null,
    };
  }
  return { schemaVersion: 2, byCard };
}
```

Defensive: wrap in `try/catch` at the call site (Task 5). If migration throws, fall back to `{ schemaVersion: 2, byCard: {} }`.

## Task 4 — Update existing exports for compatibility

`getUnlockedCards`, `isPresetComplete`, `chooseNextCard` stay unchanged in this slice (they read fields that already exist on the v2 schema with same semantics). Verify they still compile and behave the same.

## Task 5 — Wire migration into `App.tsx`

Find the AsyncStorage hydrate site (the place that reads stored progress on mount). It currently sets the `progress` state directly. Wrap with `migrateProgress`:

```ts
const raw = JSON.parse(stored);
const state = migrateProgress(raw);
setProgress(state.byCard);          // existing state shape stays as ProgressByCard
// (we do NOT change the React state shape in this slice — only the persisted shape)
```

Persistence write side: when saving, store the full `ProgressState` (not just `ProgressByCard`):

```ts
const toPersist: ProgressState = { schemaVersion: 2, byCard: progress };
await AsyncStorage.setItem(KEY, JSON.stringify(toPersist));
```

Keep all other App.tsx changes minimal. **Do NOT modify rendering code, do NOT change any UI text, do NOT touch any other file.**

## Task 6 — Create `lib/learning.test.ts`

Use Node's built-in `node:test`. Tests run via `npx tsx --test lib/learning.test.ts`.

Cases (minimum):
- `applyGrade` correct: streak does not advance until correctCount > WARMUP_PER_CARD.
- `applyGrade` correct after warm-up: streak advances; reaches MASTERY_TARGET → mastered = true.
- `applyGrade` mastered is sticky: subsequent wrong sets streak = 0 but mastered stays true.
- `applyGrade` wrong: penalty=1 on first miss; doubles on consecutive misses; capped at PENALTY_MAX.
- `applyGrade` correct after wrong: penalty halves; consecutiveMistakes resets to 0.
- `applyGrade` wrong does not consume warm-up budget (correctCount unchanged on wrong).
- `migrateProgress` v1 → v2: preserves mastered, correctCount, wrongCount, lastSeenAt; initializes new fields safely.
- `migrateProgress` v2 → v2: idempotent (passes through unchanged).
- `migrateProgress` empty / undefined input: returns `{ schemaVersion: 2, byCard: {} }`.

## After all tasks

1. `npm run typecheck`  → must pass.
2. `npx tsx --test lib/learning.test.ts`  → all tests green.
3. `npm run web` → app loads at http://localhost:8081, no console errors, existing AsyncStorage progress still appears.
4. Manual smoke: grade 5 correct on a single letter — confirm streak does not advance (warm-up). Grade a 6th correct — confirm streak now goes to 1.
5. Commit:
   `git add lib/learning.ts lib/learning.test.ts App.tsx`
   `git commit -m "feat(algo): add v2 schema fields, migration, and streak-after-warmup applyGrade"`
   `git push origin main`
6. Update this prompt's `Status` to `✅ Done`.

## Verification checklist

- [ ] `npm run typecheck` PASS
- [ ] `npx tsx --test lib/learning.test.ts` PASS (all cases listed in Task 6)
- [ ] `npm run web` starts without errors
- [ ] AsyncStorage with pre-existing v1 data hydrates without errors (manual: hard reload after a session)
- [ ] No visible UI change (existing scheduler still picks cards the old way)
- [ ] Commit pushed; prompt status flipped to ✅ Done

## What NOT to do

- Do NOT rewrite `chooseNextCard` — that's CTX-06.
- Do NOT add session state, struggle mode, or active-set lifecycle — those are CTX-06.
- Do NOT add sprinkle logic or path-complete events — those are CTX-07.
- Do NOT touch `data/banglaLetters.ts`, components, configs, or any other file outside the list above.
- Do NOT change UI text, layout, or component behavior.
- Do NOT add Jest or any test runner dependency. Use `node:test` only.
- Do NOT skip writing tests "to save time" — they are this slice's safety net.

## If you are running low on context

Before context auto-compacts (≤ 25% remaining or "hand over" instruction):
1. Commit any in-progress work: `wip(algo): CTX-05 in progress — handover`
2. Push to main.
3. Write `docs/handover/CTX-05-handover-YYYY-MM-DD.md` with: what is done, what is left, exact next file/line to pick up at, any open questions.
4. Tell Bappy the handover path. Stop.

## Next step

`docs/prompts/build/CTX-05R-algorithm-foundations-review.md` — independent review.
