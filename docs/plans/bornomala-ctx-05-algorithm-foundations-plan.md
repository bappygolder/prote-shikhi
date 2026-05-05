# Bornomala — CTX-05 Algorithm v2 Foundations (execution plan)

**Owner**: Bappy
**Author**: Claude Code (Sonnet 4.6, plan mode)
**Created**: 2026-05-05
**Status**: ⏳ Awaiting approval — execution gated by `ExitPlanMode`
**Prompt**: [docs/prompts/build/CTX-05-algorithm-foundations.md](../prompts/build/CTX-05-algorithm-foundations.md)
**Spec**: [docs/LEARNING-ALGORITHM.md](../LEARNING-ALGORITHM.md) (v2.0-draft-3)

## Recommended Model
- Model: **Sonnet 4.6** (`claude-sonnet-4-6`), thinking off.
- Complexity: **Medium** — bounded scope, fully specified diff.
- Reason: Schema is additive; one function rewrite (`applyGrade`); one new helper (`migrateProgress`); one new test file. Spec gives exact pseudocode in §7.1 and §7.2.

---

## Context

The MVP v1 scheduler used cumulative-correct mastery and a fixed unlock ladder. The first real teaching session (`docs/inbox/discuss/2026-05-04-bornomala-first-teaching-session-ux.md`) showed those rules don't match how Bappy actually teaches — students need streak-based mastery, per-card warm-up, and adaptive struggle handling.

The v2 algorithm is locked in [`docs/LEARNING-ALGORITHM.md`](../LEARNING-ALGORITHM.md) at `v2.0-draft-3`. It ships across a 3-slice chain (CTX-05 → CTX-06 → CTX-07) followed by independent reviews.

**This slice (CTX-05) lands the schema, persistence migration, and grading logic only.** No visible UI change — the existing `chooseNextCard` continues to work against the new (additive) schema. CTX-06 rewrites selection; CTX-07 adds sprinkle + path-complete.

## Pre-execution gate (run before any edit)

1. `git pull origin main` — verified clean and at `709136f` (no other agent commits to integrate).
2. Confirm spec sections 4, 5, 6, 7.1, 7.2, 7.3 are still locked at v2.0-draft-3.
3. Recap CTX-05 to user in 2–3 sentences before writing code (per the prompt's pre-execution gate).

## Critical files

| File | Action | Why |
|---|---|---|
| [lib/learning.ts](../../lib/learning.ts) | Extend types + constants; rewrite `applyGrade`; add `migrateProgress`; update `getProgressForCard` defaults. Leave `chooseNextCard`, `visibilityScore`, `weightedRandomPick`, `getUnlockedCards`, `isPresetComplete`, `resetCards` body untouched (they read fields that already exist on v2 schema with same semantics). | Schema is the v2 contract; `applyGrade` is the v2 grading rule. |
| [lib/learning.test.ts](../../lib/learning.test.ts) | **NEW.** `node:test` unit tests, runnable via `npx tsx --test lib/learning.test.ts`. | Safety net for the rewrite + migration. |
| [App.tsx](../../App.tsx) | Two minimal edits in the existing AsyncStorage `useEffect` blocks. | Wire migration into hydrate (line 462–477) and switch persist payload to `ProgressState` envelope (line 504). |

**Files NOT touched** (per chain constraints): `data/banglaLetters.ts`, anything in `components/`, `app.json`, `package.json`, all other docs.

## Reuse map (existing code that stays as-is)

- `MASTERY_TARGET = 10` lives in [`data/banglaLetters.ts:16`](../../data/banglaLetters.ts) — `lib/learning.ts` already imports it (line 1) and will simply **re-export** it (no redeclaration).
- `chooseNextCard`/`visibilityScore` (lib/learning.ts:100–152) read only `correctCount`, `wrongCount`, `seenCount`, `mastered` — all preserved on v2 schema. No code change in this slice.
- `getUnlockedCards`/`isPresetComplete` read only `mastered` — sticky semantics preserved by `applyGrade`'s wasJustMastered handling.
- `resetCards` deletes the entry from `progress`; subsequent `getProgressForCard` returns the v2 default. No body change needed once the default is updated.
- `STORAGE_KEY = 'bornomala.progress.v1'` (App.tsx:35) stays unchanged — version now lives inside the JSON envelope; migration handles both shapes.

---

## Implementation steps

### Step 1 — Extend `lib/learning.ts` schema (Task 1)

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
export type ProgressState  = { schemaVersion: 2; byCard: ProgressByCard };

export { MASTERY_TARGET } from '../data/banglaLetters';   // re-export only
export const RECENT_WINDOW = 6;
export const WARMUP_PER_CARD = 5;
export const PENALTY_MAX = 16;
export const PENALTY_HALVE_ON_CORRECT = true;
```

`getProgressForCard` default object — return all 16 fields with safe defaults (`0` / `false` / `null` / `[]`).

### Step 2 — Rewrite `applyGrade` (Task 2, spec §7.1/§7.2)

Always: `seenCount++`, `lastSeenAt = now`, `firstSeenAt ??= now`.

On correct:
- `correctCount++`.
- If `correctCount > WARMUP_PER_CARD` (i.e. the 6th correct onward): `streak++`, `bestStreak = max(bestStreak, streak)`.
- If `streak >= MASTERY_TARGET`: set `mastered = true` (sticky).
- `consecutiveMistakes = 0`; `penalty = floor(penalty / 2)`.
- Push `'c'` into `recentResults`; cap at `RECENT_WINDOW`.

On wrong:
- `wrongCount++`; `streak = 0`; `consecutiveMistakes++`.
- `penalty = consecutiveMistakes === 1 ? 1 : Math.min(penalty * 2, PENALTY_MAX)`.
- Push `'w'`; cap at `RECENT_WINDOW`.
- **`correctCount` is NOT decremented** — wrongs don't consume warm-up.

Signature unchanged: `applyGrade(progress, cardId, wasCorrect): ProgressByCard`. Internal helpers OK.

### Step 3 — `migrateProgress` (Task 3)

```ts
export function migrateProgress(raw: unknown): ProgressState {
  if (raw && typeof raw === 'object' && (raw as any).schemaVersion === 2) {
    return raw as ProgressState;
  }
  const byCard: ProgressByCard = {};
  const legacy = (raw ?? {}) as Record<string, Partial<LetterProgress>>;
  for (const [id, old] of Object.entries(legacy)) {
    byCard[id] = {
      correctCount: old.correctCount ?? 0,
      wrongCount:   old.wrongCount ?? 0,
      seenCount:    old.seenCount ?? 0,
      mastered:     old.mastered ?? false,         // preserve achievement
      lastSeenAt:   old.lastSeenAt ?? null,
      streak: 0, bestStreak: 0,
      penalty: 0, consecutiveMistakes: 0,
      recentResults: [],
      attemptsSinceEnteringActive: 0,
      enteredActiveAt: null,
      cardsShownSinceMastered: old.mastered ? 999 : 0, // already past quiet period
      sprinkleCooldown: 0,
      timeSpentMs: 0,
      firstSeenAt: old.lastSeenAt ?? null,
    };
  }
  return { schemaVersion: 2, byCard };
}
```

Caller wraps in try/catch and falls back to `{ schemaVersion: 2, byCard: {} }` on throw.

### Step 4 — Verify legacy exports (Task 4)

No code change. Confirm `chooseNextCard`, `visibilityScore`, `weightedRandomPick`, `getUnlockedCards`, `isPresetComplete` still compile against the new `LetterProgress`. They read only `correctCount`, `wrongCount`, `seenCount`, `mastered` — all preserved.

### Step 5 — Wire migration into [App.tsx](../../App.tsx) (Task 5)

Hydrate (`useEffect` lines 450–495), replace lines 462–477:

```ts
if (savedProgress) {
  try {
    const parsed: unknown = JSON.parse(savedProgress);
    const state = migrateProgress(parsed);    // handles v1 ProgressByCard OR v2 envelope
    setProgress(state.byCard);                // React state shape STAYS as ProgressByCard
  } catch (parseError) {
    console.warn('[bornomala] Could not migrate stored progress, starting fresh.', parseError);
  }
}
```

Persist (`useEffect` line 497, replace line 504):

```ts
const toPersist: ProgressState = { schemaVersion: 2, byCard: progress };
AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist)).catch(() => { /* noop */ });
```

Imports (line 25–33): add `migrateProgress` and `type ProgressState` to the existing import from `./lib/learning`.

**Do NOT** change React state shape, UI text, layout, or any other App.tsx code.

### Step 6 — `lib/learning.test.ts` (Task 6)

`node:test` (no test deps installed). Run via `npx tsx --test lib/learning.test.ts`.

Test cases (all 9 from prompt §Task 6):

1. Correct during warm-up (corrects 1–5) → `streak` stays 0, `correctCount` advances.
2. 6th correct → `streak = 1`. Continue to 15 corrects → `streak = 10`, `mastered = true`.
3. Sticky mastery: after mastered, a wrong sets `streak = 0` but `mastered` stays true.
4. Penalty math: 1st wrong → 1; 2nd consecutive → 2; 3rd → 4; 4th → 8; 5th → 16; 6th → 16 (capped).
5. Correct after wrong: `penalty = floor(prev/2)`; `consecutiveMistakes = 0`.
6. Wrong does not consume warm-up: 4 corrects then 1 wrong → `correctCount === 4`.
7. `migrateProgress` v1 → v2: preserves `mastered`, `correctCount`, `wrongCount`, `lastSeenAt`; init new fields safely; `firstSeenAt = lastSeenAt`; `cardsShownSinceMastered = 999` if mastered else `0`.
8. `migrateProgress` v2 → v2: pass-through (deep-equal on `byCard`).
9. `migrateProgress(undefined)` and `migrateProgress({})` → `{ schemaVersion: 2, byCard: {} }`.

---

## What NOT to do (chain-wide guardrails)

- Don't rewrite `chooseNextCard`, `visibilityScore`, or `weightedRandomPick` — they're CTX-06.
- Don't add `SessionState`, struggle mode, or active-set lifecycle — CTX-06.
- Don't add sprinkle eligibility or path-complete events — CTX-07.
- Don't touch `data/banglaLetters.ts`, any `components/*`, `app.json`, `package.json`, other docs.
- Don't change UI text, layout, or component behavior.
- Don't add Jest, Vitest, or any test runner dependency. `npx tsx --test` (npx fetches on-demand) only.
- Don't change `STORAGE_KEY` — version is now in the envelope.

---

## Verification

End-to-end test plan:

1. **Static** — `npm run typecheck` → PASS.
2. **Unit** — `npx tsx --test lib/learning.test.ts` → all 9 cases green.
3. **Smoke (web)** — `npm run web` boots Expo dev server at `http://localhost:8081` with no console errors.
4. **Migration** — with pre-existing v1 AsyncStorage data, hydrate succeeds, mastered cards remain mastered, no warning logged.
5. **Manual grade smoke** —
   - Grade 5 corrects on a single letter → `streak` stays at 0 (warm-up).
   - 6th correct → `streak === 1`.
   - 10 counted corrects (i.e. correct #15) → `mastered === true`.
   - Wrong after mastery → `streak = 0`, `mastered` stays true.
6. **No visible change** — existing scheduler still picks cards the v1 way (same UI behavior as `709136f`).
7. **Commit + push**:
   ```
   git add lib/learning.ts lib/learning.test.ts App.tsx
   git commit -m "feat(algo): add v2 schema fields, migration, and streak-after-warmup applyGrade"
   git push origin main
   ```
8. Update prompt status: flip [`docs/prompts/build/CTX-05-algorithm-foundations.md`](../prompts/build/CTX-05-algorithm-foundations.md) `Status` → `✅ Done`.

## Handover protocol (if context drops to ≤25%)

1. Commit WIP: `wip(algo): CTX-05 in progress — handover`.
2. Push.
3. Write `docs/handover/CTX-05-handover-2026-05-05.md` with: what's done, what's left, exact next file/line, open questions.
4. Tell Bappy the handover path. Stop.

## Next prompt

[`docs/prompts/build/CTX-05R-algorithm-foundations-review.md`](../prompts/build/CTX-05R-algorithm-foundations-review.md) — independent review (separate session).
