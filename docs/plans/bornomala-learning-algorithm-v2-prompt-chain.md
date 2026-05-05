# Bornomala — Learning Algorithm v2 Prompt Chain

**Last updated**: 2026-05-05
**Owner**: Bappy
**Author**: Claude (Opus 4.7)
**Status**: ⏳ Plan — awaiting approval, prompts not yet written

---

## Context

The v2 algorithm is locked in [`docs/LEARNING-ALGORITHM.md`](../LEARNING-ALGORITHM.md) at `v2.0-draft-3`. Implementation needs to land **slowly and safely** because:

1. Bappy has live teaching sessions starting in ~30 min from now and continuing in coming days. **The app must not break between sessions.**
2. Another agent is working in parallel on this repo. We need to minimize file overlap and commit incrementally so merge conflicts are tiny.
3. **UI is frozen.** Card UI works. Path UI redesign and signed per-card bar UI are deferred. This chain only changes the algorithm under the hood.

This plan describes a **6-prompt chain** (3 implement + 3 review) that takes the codebase from v1 algorithm to v2 algorithm without touching visible UI. Each implement prompt is followed by an independent review prompt run in a fresh session — that gives an honest second pair of eyes between steps.

---

## Recommended Model

- Model: Sonnet 4.6 (`claude-sonnet-4-6`) for implementation; same or Opus 4.6 for review.
- Complexity: Medium per slice.
- Reason: Each slice is well-bounded by the spec. Review benefits from a separate session that hasn't seen the impl context.

---

## Constraints (apply to every prompt in the chain)

- **Source of truth**: [`docs/LEARNING-ALGORITHM.md`](../LEARNING-ALGORITHM.md). When code disagrees with spec, code is wrong.
- **UI frozen**: do not change visible behavior of any screen in the current build. The signed per-card bar (-16…+10), path-complete celebration, and any other v2 UI surfaces are out of scope. The algorithm produces the data; UI consumption lands in a future chain.
- **Files this chain owns** (free to edit):
  - `lib/learning.ts`
  - `lib/learning.test.ts` *(new file, created in CTX-05)*
  - `docs/LEARNING-LOGIC.md`
  - `docs/PRODUCT-LOGIC.md`
  - `docs/LEARNING-ALGORITHM.md` *(only for change-log entries when implementation lands)*
- **Files this chain MAY touch (minimally, with clear commits)**:
  - `App.tsx` — migration call site, session state hook, path-complete listener (silent — `console.log` only).
- **Files this chain MUST NOT touch** (other agent / out of scope):
  - Any `components/*` files
  - `app.json`, `package.json`, configs
  - Any `data/*.ts` files (the path data is final)
  - Other docs not listed above

- **Backward-compat signatures**: `applyGrade(progress, cardId, wasCorrect)` and `chooseNextCard(cards, progress, previousCardId)` keep their existing signatures. New parameters added are optional with sensible defaults. App.tsx call sites change minimally.

- **Commit policy**: each slice ends in ONE commit. No multi-commit slices. Conventional commit format already in use:
  `feat(algo): [what changed] — [why]`
  (e.g. `feat(algo): add v2 schema fields and migration — supports streak-based mastery`)

- **Conflict-avoidance protocol**:
  - Before starting any prompt: `git pull origin main`. If there are unmerged changes from the other agent, **stop and ask** rather than auto-merging blindly.
  - End each prompt with `git push origin main`. Don't sit on a slice for hours.

---

## Slicing strategy

Three implementation slices, sized for safety not symmetry. Each slice produces working code that does not break the app on its own.

| Slice | Touches | Risk | Why this slice exists |
|---|---|---|---|
| **CTX-05 — Foundations** | `lib/learning.ts` (schema + applyGrade rewrite + migration), `lib/learning.test.ts` (new), `App.tsx` (1-line migration call) | Low | Schema is additive. applyGrade keeps signature. Old `chooseNextCard` still works against new schema. App still runs identically. |
| **CTX-06 — Selection & Active Set** | `lib/learning.ts` (chooseNextCard rewrite + visibility score + active-set lifecycle + struggle mode), `lib/learning.test.ts` (extend), `App.tsx` (add session-state hook, pass through) | Medium | New chooseNextCard is the actual behavioral change a teacher will feel. Migration safety net is already in place from CTX-05. |
| **CTX-07 — Sprinkle, Path-complete, Docs** | `lib/learning.ts` (sprinkle eligibility + cooldown + path-complete event), `lib/learning.test.ts` (extend), `App.tsx` (silent path-complete `console.log`), `docs/LEARNING-LOGIC.md` (rewrite v2 sections), `docs/PRODUCT-LOGIC.md` (mastery rule) | Low | Sprinkle and path-complete are additive features that fire only when conditions are met. Doc alignment is pure text. |

Why not one mega-slice: a single bigger slice is harder to review, harder to roll back, and a bigger merge conflict if the other agent is in `App.tsx` at the same time. Three commits = three small conflict surfaces.

---

## The 6 prompts

All filed in `docs/prompts/build/`. Status starts at ⏳ Pending; flips to ✅ Done after the corresponding Review prompt confirms.

### CTX-05 — Algorithm Foundations (impl)
Path: `docs/prompts/build/CTX-05-algorithm-foundations.md`
Scope:
- Extend `LetterProgress` type with v2 fields (per spec §4): `streak`, `bestStreak`, `consecutiveMistakes`, `penalty`, `recentResults`, `attemptsSinceEnteringActive`, `enteredActiveAt`, `cardsShownSinceMastered`, `sprinkleCooldown`, `firstSeenAt`, `timeSpentMs` (reserved). All defaults safe (zeros / nulls / empty arrays).
- Add `schemaVersion: 2` wrapper. Write `migrateProgress(raw)` that maps v1 → v2 preserving `mastered` (sticky) and other counters.
- Rewrite `applyGrade` per spec §7.1 / §7.2 — streak only counts after warm-up clears (5 cumulative corrects per card); penalty doubles on consecutive mistakes (capped at 16) and halves on correct; sticky `mastered`.
- Wire `migrateProgress` into the AsyncStorage hydrate site in `App.tsx` (one-line change inside the existing hydrate handler).
- Add `lib/learning.test.ts` with unit tests for: applyGrade streak gating, applyGrade penalty math, mastery sticky, migration v1→v2 idempotency.

Verification:
- `npm run typecheck` passes.
- `npm test` (or scripted `tsx`-based runner if Jest not configured) passes new tests.
- `npm run web` — app loads, AsyncStorage persisted progress still appears, no console errors.
- Manual: existing scheduler still works (uses old chooseNextCard; nothing visible changes).

### CTX-05R — Foundations Review
Path: `docs/prompts/build/CTX-05R-algorithm-foundations-review.md`
Scope:
- Read CTX-05 + the spec.
- Diff `lib/learning.ts` vs spec §4-§7. Report any field missing, type mismatch, default mismatch, or behavior divergence.
- Run `npm run typecheck`, `npm test`, `npm run web` and report.
- Output: a checklist with PASS / FAIL per spec section. **Does not fix anything.** Files a FIX prompt only if there are gaps.

### CTX-06 — Algorithm Selection & Active Set (impl)
Path: `docs/prompts/build/CTX-06-algorithm-selection.md`
Scope:
- Add `SessionState` type per spec §5.
- Implement `visibilityScore(card, state)` per spec §8 — including hard anti-immediate-repeat, newcomer boost, penalty term, freshness, sprinkle stub (returns 0 for now since CTX-07 implements sprinkle eligibility).
- Rewrite `chooseNextCard` per spec §10 — weighted-random sampling with single-card fallback, RNG injectable.
- Implement active-set lifecycle helpers per spec §9: initial 2 cards, grow to 3 on first counted-correct, 1-for-1 replacement on mastery, struggle-mode shrink to 2 with restore.
- Implement struggle-mode transitions per spec §9.
- App.tsx: add `useState<SessionState>` initialized at mount; pass to `chooseNextCard`; update on grade.
- Extend `lib/learning.test.ts`: weighted distribution test (1000-trial), anti-repeat enforcement, active-set transitions on first counted correct, mastery 1-for-1 replacement, struggle enter/exit.

Verification:
- `npm run typecheck`, `npm test` pass.
- `npm run web` — start fresh session, observe: 2 cards alternate, never the same card twice in a row, after a few corrects a 3rd card joins, mistakes shrink the rotation.

### CTX-06R — Selection Review
Path: `docs/prompts/build/CTX-06R-algorithm-selection-review.md`
Scope: same shape as CTX-05R but verifying §8-§10. Includes a manual scripted scenario the reviewer plays through in the browser and reports observed behavior. **No fixes** — files FIX prompts if needed.

### CTX-07 — Sprinkle + Path-complete + Docs (impl)
Path: `docs/prompts/build/CTX-07-algorithm-completion.md`
Scope:
- Implement `eligibleForSprinkle(card, state)` per spec §12 — including `NEWLY_MASTERED_QUIET_PERIOD` and cooldown.
- Wire sprinkle term into `visibilityScore` (replaces the stub from CTX-06).
- Implement path-complete detector — fires when every card in path is `mastered`. Emits an event via callback (`onPathComplete`) passed in from App.tsx.
- App.tsx: add `console.log('[bornomala] path complete')` callback. NO UI yet.
- Implement sprinkle-only mode: when path complete and the user "keeps going", `chooseNextCard` selects from mastered pool with sprinkle weights.
- Update `docs/LEARNING-LOGIC.md` — rewrite Progress Model + Next Card Logic sections to v2; mark version 2026-05-05.
- Update `docs/PRODUCT-LOGIC.md:42` — change "Mastery target | 10 correct answers" → "10 correct in a row (streak resets on wrong); per-card warm-up of 5 corrects before counting starts."
- Update `docs/LEARNING-ALGORITHM.md` change log: v2.0 (no -draft-N suffix) — implementation landed.

Verification: `typecheck`, `test`, `web`. Sprinkle test: master one card via test fixture, confirm it stops appearing during the quiet period and reappears after.

### CTX-07R — Completion Review
Path: `docs/prompts/build/CTX-07R-algorithm-completion-review.md`
Scope: validate §11-§12, doc alignment with code, no-UI-change assertion. Confirms `LEARNING-ALGORITHM.md` is bumped to v2.0.

---

## Master orchestration prompt

A single message Bappy can paste into a fresh session to run the chain end-to-end. Lives at `docs/prompts/build/CTX-05-MASTER-RUN-CHAIN.md`.

Behavior:
- Reads each prompt at its absolute path.
- Runs the pre-execution gate per `~/.claude/shared/PROMPT-SYSTEM.md` (Status check, recap, "is this already done").
- Pauses for explicit Bappy confirmation between prompts (he says "go" before next slice runs).
- On context-low signal (≤ 25%): triggers handover per `~/.claude/shared/CONTEXT-HANDOVER.md`.
- Updates each prompt's Status to ✅ Done after its review prompt passes.

Two run modes Bappy can choose at the start:
- **A. Manual** — paste each prompt one at a time into fresh sessions. Most cautious.
- **B. Master** — paste only the master prompt; it orchestrates all 6 with confirmation gates between.

Defaulting to A is safer for the first run. B is fine once Bappy trusts the chain.

---

## Context handover protocol per prompt

Each prompt's body ends with this block:

```
## If you are running low on context

Before context auto-compacts (≤ 25% remaining or "hand over" instruction):
1. Commit any in-progress work with a clear WIP commit message: `wip(algo): [what was done] — handover`
2. Push to main.
3. Write a handover file: `docs/handover/CTX-NN-handover-YYYY-MM-DD.md` containing:
   - What is done in this prompt
   - What is left
   - The exact next file/line to pick up at
   - Any open questions surfaced during impl
4. Tell Bappy the handover path. Stop.

Do NOT silently keep working into auto-compact.
```

---

## Critical files

| File | Modified by | Purpose |
|---|---|---|
| `lib/learning.ts` | CTX-05, 05, 06 | The algorithm |
| `lib/learning.test.ts` | CTX-05 (new), 05, 06 | Unit tests; pure tsx-runnable so no Jest dependency required |
| `App.tsx` | CTX-05, 05, 06 (small edits each) | Migration hook, session state, path-complete listener |
| `docs/LEARNING-LOGIC.md` | CTX-07 | Aligned to v2 |
| `docs/PRODUCT-LOGIC.md` | CTX-07 | Mastery row updated |
| `docs/LEARNING-ALGORITHM.md` | CTX-07 | Change log entry; status bumped to v2.0 |
| `docs/prompts/build/CTX-05*.md` … `CTX-07R*.md` | This plan, after approval | The chain itself |
| `docs/prompts/build/CTX-05-MASTER-RUN-CHAIN.md` | This plan, after approval | Master orchestrator |

---

## Verification (whole-chain)

After all six prompts run + ✅ Done:

- `npm run typecheck` passes.
- `npm test` passes (all unit tests added across slices).
- `npm run web`:
  - Fresh state: 2-card rotation, never same card twice in a row, third card unlocks after first counted correct, struggle mode shrinks under 2 wrongs in last 6.
  - Loaded state (existing AsyncStorage): old progress preserved, no errors, no visible UI change.
  - Mastery: a card hitting 10-streak triggers replacement with next path card; previously-mastered card enters quiet period.
  - Path complete: `console.log('[bornomala] path complete')` fires; no UI celebration yet (deferred).
- `docs/LEARNING-ALGORITHM.md` is at version `v2.0` (no `-draft-N` suffix).
- `docs/LEARNING-LOGIC.md` and `docs/PRODUCT-LOGIC.md` reflect v2 rules.

---

## Out of scope (do NOT do in this chain)

- Signed per-card bar UI (-16…+10 visualization) → future UI chain.
- Path-complete celebration screen → future UI chain.
- Path UI redesign → future UI chain (Bappy noted "after the algorithm is updated, we can probably reset and re-update the UI of the Path").
- Card UI changes → not needed.
- Audio per-letter → out of scope, deferred via UX-03.
- Confusion-pair tracking schema field → deferred per spec OQ-CPS.
- Cross-path retention → deferred per spec OQ-XPR.
- Time-on-card signal → schema reservation only, no population.

---

## Risks & mitigations

- **Risk: AsyncStorage migration corrupts old user data.**
  Mitigation: defensive defaults for every field; try/catch around hydrate; CTX-05R reviews migration with a fixture of v1-shaped data.
- **Risk: weighted-random tests are flaky.**
  Mitigation: inject `rng` into `chooseNextCard`; tests use a seeded RNG.
- **Risk: other agent edits `App.tsx` at the same time → merge conflict.**
  Mitigation: each slice's App.tsx change is minimal and localized; commit each slice immediately; pull before each prompt.
- **Risk: spec drifts during implementation.**
  Mitigation: spec is locked at `v2.0-draft-3`. Any deviation found during impl is filed as a FIX prompt or surfaced for the review cadence — do not change the spec mid-implementation.
- **Risk: Bappy runs the chain right before a teaching session.**
  Mitigation: each slice ends in a working app. If a slice causes a regression, the previous commit is the rollback point — `git revert` and the app is back to v1.

---

## Definition of done (this plan)

- 7 prompt files written in `docs/prompts/build/` (6 slice prompts + 1 master).
- Each prompt passes the pre-execution gate test (a fresh Claude session can read it and execute without questions back to Bappy).
- This plan is committed and pushed.
- Bappy decides run mode (A manual / B master) and starts when ready.

---

## Next steps after this plan is approved

1. Claude (this session, post-ExitPlanMode): create the 7 prompt files.
2. Claude commits the prompts under `docs(prompts): file v2 algorithm prompt chain`.
3. Bappy picks the run mode and triggers the chain whenever convenient — including AFTER his teaching session if that's safer.
