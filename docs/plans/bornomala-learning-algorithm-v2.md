# Bornomala — Learning Algorithm v2

**Last updated**: 2026-05-05
**Status**: ⏳ ON HOLD pending spec lock — see banner below.
**Supersedes**: the UX-03 stub names `bornomala-letter-stats-tracking.md` and `bornomala-adaptive-lesson-sizing.md` (do not write those separately — this plan covers both).
**Coordinates with**: `bornomala-shiki-continuous-progress.md` (UI bar), `bornomala-occor-tab-redesign.md` (teacher stats surface). Those plans consume the data this one produces; they are NOT in scope here.

---

> **⚠️ Spec moved.** The canonical algorithm description (state, hooks, visibility score, active-set policy, selection, bar formula, teacher overrides) now lives in [`docs/LEARNING-ALGORITHM.md`](../LEARNING-ALGORITHM.md) as a living spec. This plan is an **implementation plan** — it owns schema migration, file diffs, and the test strategy that verifies the spec.
>
> The algorithm sections below are an earlier sketch and may diverge from the spec as open questions (§17 in the spec) are resolved. **When in doubt, the spec wins.** Update this plan's "Approach" sections after the spec's open questions are locked.

---

## Recommended Model

- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Medium
- Reason: Schema change + migration + scheduler rewrite + tests. Logic is well-bounded; no UI rework.

---

## Context

The first real teaching session on 2026-05-04 ([journal](../inbox/discuss/2026-05-04-bornomala-first-teaching-session-ux.md)) surfaced that the current scheduler does not adapt to a struggling learner. Bappy taught a real student and observed:

- *"Users have real difficulty remembering certain letters and words. The app needs to adapt to this — not just present the same path to everyone."*
- *"If the student is struggling, we can reduce a letter or a word or item and we can just increase the number of cards."*
- *"In between the learning sessions, we should make sessions where the ones that students struggle the most, made the most mistakes, we should probably keep track of those and teach them more of these."*
- *"The user must type one letter 10 times in a row. It can't have any mistakes. If they make a mistake, it will be reset."*

The current algorithm in [lib/learning.ts](../../lib/learning.ts) is a greedy priority queue with cumulative mastery (`correctCount >= 10`) — mistakes don't reset the count, the active set never shrinks under struggle, and the schema has no fields to support adaptation. Two real gaps:

1. **Mastery rule mismatch** — code is cumulative, Bappy expects 10-in-a-row.
2. **No adaptation surface** — no streak, no recent-result window, no struggle signal, no struggling-mode active-set shrink.

This plan rewrites the schema and scheduler to match the intended teaching model and to enable per-letter struggle awareness.

---

## Decisions Locked (from 2026-05-05 plan session)

- **Mastery rule**: 10 correct in a row. One wrong resets the streak.
- **`mastered` flag is sticky** once first achieved — a later wrong does not un-master a card. Rationale: teachers re-test for fun; un-mastering would feel punitive.
- **One combined plan** covering schema, scheduler, mastery rule, struggling-mode, migration. Single PR.
- **Continuous progress bar** stays in the sibling plan (`bornomala-shiki-continuous-progress.md`); this plan only guarantees `correctCount` keeps incrementing on every correct rep so that bar can use it.

---

## Approach

### 1. Extend `LetterProgress` schema

File: [lib/learning.ts:3-11](../../lib/learning.ts#L3-L11)

```ts
export type LetterProgress = {
  // existing — preserved
  correctCount: number;          // cumulative; drives the % bar
  wrongCount: number;
  seenCount: number;
  mastered: boolean;             // STICKY: true once consecutiveCorrect ever ≥ 10
  lastSeenAt: string | null;

  // NEW — drives mastery + adaptation
  consecutiveCorrect: number;    // current streak; resets on wrong
  bestStreak: number;            // highest streak ever
  recentResults: Array<'c' | 'w'>; // rolling window, max 6, newest last
  lastResultWasWrong: boolean;   // active-mistake flag
  firstSeenAt: string | null;
};

export type ProgressByCard = Record<string, LetterProgress>;
export type ProgressState = {
  schemaVersion: 2;
  byCard: ProgressByCard;
};
```

New constants (same file):

```ts
export const MASTERY_TARGET = 10;          // re-export from data/banglaLetters
const RECENT_WINDOW = 6;
const ACTIVE_SET_DEFAULT = 5;
const ACTIVE_SET_STRUGGLE = 2;
const STRUGGLE_THRESHOLD = 2;              // wrongs in last RECENT_WINDOW → struggling
const STRUGGLE_RECOVERY = 6;               // consecutive correct to exit struggling-mode
```

### 2. Rewrite `applyGrade`

File: [lib/learning.ts:52-71](../../lib/learning.ts#L52-L71)

```ts
export function applyGrade(progress, cardId, wasCorrect) {
  const c = getProgressForCard(progress, cardId);
  const now = new Date().toISOString();
  const consecutiveCorrect = wasCorrect ? c.consecutiveCorrect + 1 : 0;
  const recentResults = [...c.recentResults, wasCorrect ? 'c' : 'w'].slice(-RECENT_WINDOW);
  return {
    ...progress,
    [cardId]: {
      correctCount: c.correctCount + (wasCorrect ? 1 : 0),
      wrongCount: c.wrongCount + (wasCorrect ? 0 : 1),
      seenCount: c.seenCount + 1,
      consecutiveCorrect,
      bestStreak: Math.max(c.bestStreak, consecutiveCorrect),
      mastered: c.mastered || consecutiveCorrect >= MASTERY_TARGET,  // STICKY
      lastSeenAt: now,
      firstSeenAt: c.firstSeenAt ?? now,
      lastResultWasWrong: !wasCorrect,
      recentResults,
    },
  };
}
```

### 3. Rewrite `chooseNextCard` — weighted sampling + struggling-mode

File: [lib/learning.ts:95-133](../../lib/learning.ts#L95-L133)

New signature accepts `sessionState` (the running session's recent grades) so the scheduler can shrink/grow the active set:

```ts
export type SessionState = {
  recentGrades: Array<'c' | 'w'>;     // last 6 across all cards in this session
  inStruggleMode: boolean;
  consecutiveCorrectInSession: number;
};

export function chooseNextCard(
  cards, progress, previousCardId, session, rng = Math.random
): { nextCard: LetterCard; nextSession: SessionState } { ... }
```

Algorithm:

1. **Compute candidate pool** — unlocked, unmastered cards from `getUnlockedCards`. If empty, fall back to all unlocked.
2. **Decide active-set size**:
   - Count `'w'` in `session.recentGrades`. If `≥ STRUGGLE_THRESHOLD` → enter struggle mode.
   - In struggle mode: pool = top `ACTIVE_SET_STRUGGLE` cards by struggle score (`wrongCount + recentWrongs * 2 + lastResultWasWrong * 3`). Exit when `consecutiveCorrectInSession ≥ STRUGGLE_RECOVERY`.
   - Otherwise: pool = first `ACTIVE_SET_DEFAULT` candidates.
3. **Weight each card** in the active set:
   ```
   w = 1
   w += lastResultWasWrong ? 4 : 0                       // recent miss surfaces fast
   w += recentResults.filter(r=>r==='w').length * 1.0    // historical struggle
   w += (MASTERY_TARGET - consecutiveCorrect) * 0.3      // farther from streak = more practice
   if id === previousCardId: w *= 0.10                   // anti-immediate-repeat
   ```
4. **Sample** via weighted random using `rng` (injectable for tests).
5. **Update session**: push grade outcome (caller appends after grading), update flags.

If all candidates have `weight = 0` (edge case), fall back to first non-previous card.

### 4. Migration (one-time, runs on AsyncStorage hydrate)

In `App.tsx` AsyncStorage hydration site, before passing to React state:

```ts
function migrateProgress(raw: unknown): ProgressState {
  if (raw && typeof raw === 'object' && 'schemaVersion' in raw) return raw as ProgressState;
  // raw is the legacy ProgressByCard shape
  const byCard: ProgressByCard = {};
  for (const [id, old] of Object.entries(raw ?? {})) {
    byCard[id] = {
      correctCount: old.correctCount ?? 0,
      wrongCount: old.wrongCount ?? 0,
      seenCount: old.seenCount ?? 0,
      mastered: old.mastered ?? false,            // preserve achievements
      lastSeenAt: old.lastSeenAt ?? null,
      consecutiveCorrect: 0,                      // unknown from old data
      bestStreak: 0,
      recentResults: [],
      lastResultWasWrong: false,
      firstSeenAt: old.lastSeenAt ?? null,
    };
  }
  return { schemaVersion: 2, byCard };
}
```

### 5. Wire into `App.tsx`

- [App.tsx:737](../../App.tsx#L737) — `applyGrade(progress, currentCard.id, wasCorrect)` keeps same signature; no change at call site.
- [App.tsx:745](../../App.tsx#L745) — `chooseNextCard(...)` call updated to pass + receive `sessionState`. Add `const [session, setSession] = useState<SessionState>(initialSession);`.
- [App.tsx:120](../../App.tsx#L120) — bar still reads `correctCount / MASTERY_TARGET`; works unchanged. (The continuous-progress plan owns visual polish.)
- AsyncStorage hydration site — call `migrateProgress` once on first load.

### 6. Doc updates

- [docs/LEARNING-LOGIC.md](../LEARNING-LOGIC.md) — replace "Progress Model" + "Next Card Logic" sections with v2 schema + algorithm. Mark version 2026-05-05.
- [docs/PRODUCT-LOGIC.md:42](../PRODUCT-LOGIC.md#L42) — change "Mastery target | 10 correct answers" → "Mastery target | 10 correct in a row (streak resets on wrong)".

---

## Critical files to modify

| File | What changes |
|---|---|
| [lib/learning.ts](../../lib/learning.ts) | Schema, `applyGrade`, `chooseNextCard`, new `SessionState`, struggle helpers, `migrateProgress` |
| [App.tsx](../../App.tsx) | `chooseNextCard` call site (line ~745), session state hook, AsyncStorage hydration migration call |
| [docs/LEARNING-LOGIC.md](../LEARNING-LOGIC.md) | Rewrite Progress + Next Card sections |
| [docs/PRODUCT-LOGIC.md](../PRODUCT-LOGIC.md) | Update mastery rule row |
| `lib/learning.test.ts` (NEW) | Unit tests for applyGrade, chooseNextCard, migration |

---

## Verification

### Unit tests (`lib/learning.test.ts`)

- `applyGrade`: correct increments streak; wrong resets streak to 0; `mastered` flips to true at streak=10 and stays true after a subsequent wrong (sticky); `recentResults` capped at 6.
- `chooseNextCard` (with seeded `rng`): never returns `previousCardId` when alternatives exist; returns higher-weight cards more often over 1000 trials; struggle-mode shrinks pool to top 2; recovery exits struggle mode after 6 consecutive correct.
- `migrateProgress`: legacy shape → v2 with `mastered` preserved; `consecutiveCorrect=0`; idempotent on already-v2 input.

Run: `npm test` (add Jest config if not present — check before writing the plan output).

### Manual web QA (`npm run web`)

1. Fresh start → answer 9 correct + 1 wrong on the same letter → bar shows 90% (cumulative still increments), `mastered = false`, streak reset visible by inspecting AsyncStorage in DevTools.
2. Answer 10 correct in a row → `mastered = true`, scheduler stops surfacing that card preferentially, bar at 100%.
3. Get 2 wrong within last 6 attempts across the active set → next ~5 cards should cycle through 2 letters only (struggle-mode confirmed).
4. Get 6 correct in a row in struggle-mode → active set returns to 5 cards (recovery confirmed).
5. Hard reload — AsyncStorage migration runs once; previously-mastered cards remain mastered; no errors in console.
6. Reset Everything → all progress wiped, schema version stays at 2.

### Out of scope (regressions to confirm don't break)

- Existing unlock cascade (5 → +2) — must still trigger when all unlocked cards become mastered.
- Preset switching — must still scope cards correctly.
- Per-letter reset (the "Reset" buttons in Occor) — must still clear all v2 fields, not just legacy ones.

---

## Phasing

- **Phase A (this PR)** — schema, migration, `applyGrade`, `chooseNextCard` v2, struggle-mode, unit tests, doc updates.
- **Phase B (follow-up, same plan)** — between-session warm-up: on App mount, if any card has `wrongCount ≥ 3` AND `lastSeenAt > 6h ago`, prepend a 5-card "warm-up review" session before the regular flow. Skip if Phase A drags; keep the schema fields ready for it.

---

## Risks & mitigations

- **Streak rule is harsher** → learners may stall. Mitigation: cumulative `correctCount` still drives the % bar so visible progress accumulates on every correct rep.
- **Weighted random is non-deterministic** → flaky tests. Mitigation: inject `rng` parameter, default `Math.random`; seed in tests.
- **Migration on real users** → corrupt old AsyncStorage shape. Mitigation: defensive defaults for every field; migration writes back v2 shape immediately; one-time `try/catch` around hydrate so a malformed record can't brick the app.
- **Active-set shrink might confuse a teacher** → "why is the same letter repeating?". Mitigation: add a single dev-only `console.log` in struggle-mode toggle so we can verify behavior; teacher-facing surface ("focus mode" indicator) is left to the Occor redesign plan.

---

## Definition of done

- All unit tests pass.
- Manual QA steps 1–6 above all pass on web.
- `docs/LEARNING-LOGIC.md` and `docs/PRODUCT-LOGIC.md` reflect the new rules.
- No console errors on app cold start with pre-existing AsyncStorage progress.
- PR description links this plan and the journal.
