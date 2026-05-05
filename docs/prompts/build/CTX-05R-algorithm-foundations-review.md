# CTX-05R — Foundations Review (independent verification)

**Status**: ⏳ Pending
**Author tool**: Claude Code (Opus 4.7)
**Created**: 2026-05-05
**Last updated**: 2026-05-05
**$ value**: UNSCORED
**Urgency**: 5
**Score**: UNSCORED

---

## What this context window does

Independently verify CTX-05's implementation against the spec. **You do not write production code.** You read the diff, run the tests and the app, and produce a PASS/FAIL report. If FAIL, you file a `FIX-<topic>.md` prompt — you do not fix in this session.

This prompt is intended to run in a **fresh session** with no memory of CTX-05's implementation context, so the reviewer's eyes are honest.

---

## Prerequisites

- CTX-05 status is `✅ Done`.
- Spec: `docs/LEARNING-ALGORITHM.md` at `v2.0-draft-3`.
- Plan: `docs/plans/bornomala-learning-algorithm-v2-prompt-chain.md`.

---

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

---

## Recommended model

`claude-sonnet-4-6` or `claude-opus-4-6`. **Thinking**: On (review benefits from careful reading).

---

## Prompt to paste

```markdown
You are reviewing CTX-05 of the Bornomala learning-algorithm v2 chain. You DO NOT MODIFY production code in this session. Your output is a report.

## Before starting

1. `git pull origin main`
2. Read in order:
   - `docs/prompts/build/CTX-05-algorithm-foundations.md` (the prompt being reviewed)
   - `docs/LEARNING-ALGORITHM.md` §4, §5, §6, §7.1, §7.2, §7.3 (the spec)
   - The current `lib/learning.ts` (the diff under review)
   - The new `lib/learning.test.ts`
   - `App.tsx` only the lines that changed (use `git diff HEAD~1 App.tsx`)
3. Confirm CTX-05's commit landed: `git log --oneline -5` should show `feat(algo): add v2 schema fields, migration, and streak-after-warmup applyGrade` (or similar) at HEAD or HEAD-1.

## Run the tests

- `npm run typecheck` — record output
- `npx tsx --test lib/learning.test.ts` — record output, count tests passed/failed
- `npm run web` — start it, confirm no errors in the console; smoke test below

## Smoke test (manual)

1. Open http://localhost:8081.
2. Pick a preset (e.g. consonants).
3. Grade 5 correct on the first letter shown. Reload the page (hard reload).
4. Open DevTools → Application → AsyncStorage (or Local Storage on web). Find the bornomala progress key.
5. Verify the persisted shape is `{ schemaVersion: 2, byCard: { ... } }`.
6. Verify the per-card record has all v2 fields: `streak`, `bestStreak`, `penalty`, `consecutiveMistakes`, `recentResults`, `attemptsSinceEnteringActive`, `enteredActiveAt`, `cardsShownSinceMastered`, `sprinkleCooldown`, `timeSpentMs`, `firstSeenAt`.

## Spec-vs-code audit

Walk through these spec rules and confirm the code matches. For each, write PASS or FAIL with a one-line note.

### Schema (§4)
- [ ] `LetterProgress` has every field listed in §4 with the right type.
- [ ] Defaults from `getProgressForCard` are safe (zeros, nulls, empty arrays).
- [ ] `ProgressState` exists with `schemaVersion: 2`.

### Constants (§6)
- [ ] `MASTERY_TARGET = 10`, `RECENT_WINDOW = 6`, `WARMUP_PER_CARD = 5`, `PENALTY_MAX = 16`, `PENALTY_HALVE_ON_CORRECT = true` are exported.

### `applyGrade` correct (§7.1)
- [ ] During warm-up (correctCount ≤ WARMUP_PER_CARD), streak does NOT increment.
- [ ] After warm-up, streak increments by 1 per correct.
- [ ] `mastered` flips to `true` at streak ≥ 10 and STAYS TRUE on later wrongs (sticky).
- [ ] `consecutiveMistakes` resets to 0 on every correct.
- [ ] `penalty` halves on correct (`floor(penalty / 2)`).
- [ ] `recentResults` pushes 'c' and is bounded to RECENT_WINDOW.

### `applyGrade` wrong (§7.2)
- [ ] `streak` resets to 0.
- [ ] First wrong sets `penalty = 1`.
- [ ] Subsequent consecutive wrongs double penalty up to `PENALTY_MAX`.
- [ ] Wrong does NOT modify `correctCount`.
- [ ] `recentResults` pushes 'w'.

### Migration
- [ ] v1 input → v2 output preserves `mastered`, `correctCount`, `wrongCount`, `lastSeenAt`.
- [ ] v2 input → v2 output is identity (idempotent).
- [ ] `null`/`undefined`/`{}` input → `{ schemaVersion: 2, byCard: {} }`.
- [ ] Wrapped in try/catch at the App.tsx hydrate site so corrupt input cannot brick the app.

### App.tsx wiring
- [ ] AsyncStorage hydrate calls `migrateProgress`.
- [ ] AsyncStorage write persists the full `ProgressState` (not just `ProgressByCard`).
- [ ] No other App.tsx changes (no rendering, no UI text, no other behavior).

### Out-of-scope guard
- [ ] `chooseNextCard` was NOT modified in this slice (compare to git history before CTX-05).
- [ ] No new test runners or dependencies added to `package.json`.
- [ ] No files outside the allowed list (`lib/learning.ts`, `lib/learning.test.ts`, `App.tsx`) were modified.

## Output

Produce a markdown report with this shape:

```
# CTX-05 Review — YYYY-MM-DD

## Result: PASS | PARTIAL | FAIL

## Test results
- typecheck: PASS / FAIL — output
- unit tests: N passed / M failed
- web smoke test: PASS / FAIL — notes

## Spec-vs-code audit
[the table above with PASS/FAIL per row]

## Findings (only if any FAIL)
- Finding 1: ...
- Finding 2: ...

## Recommended next step
- ✅ Approve and proceed to CTX-06, OR
- ⚠️ File `FIX-CTX-05-<topic>.md` for: <list specific fixes needed>
```

Save the report to `docs/handover/CTX-05R-review-YYYY-MM-DD.md`.

## What NOT to do

- Do NOT modify any production file (`lib/`, `App.tsx`, etc.).
- Do NOT modify CTX-05's status if findings are FAIL — the FIX prompt does that.
- Do NOT loop back into the implementation. If a fix is obvious, file the FIX prompt and stop.
- Do NOT skip the manual smoke test. Tests pass ≠ app works.

## Next step

If PASS → proceed to `docs/prompts/build/CTX-06-algorithm-selection.md`.
If FAIL → file `docs/prompts/build/FIX-CTX-05-<topic>.md`, then return here after FIX is applied.
