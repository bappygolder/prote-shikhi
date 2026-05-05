# CTX-05-MASTER — Run the v2 Algorithm Chain

**Status**: ⏳ Pending
**Author tool**: Claude Code (Opus 4.7)
**Created**: 2026-05-05
**Last updated**: 2026-05-05
**$ value**: UNSCORED
**Urgency**: 4
**Score**: UNSCORED

---

## What this context window does

Single-paste master prompt. Orchestrates the entire v2 algorithm chain end-to-end with Bappy approval gates between each step. Use this when you want one message to drive the whole sequence; otherwise paste each child prompt manually for maximum control.

---

## Chain manifest

The chain consists of 6 child prompts plus this master:

```
CTX-05   docs/prompts/build/CTX-05-algorithm-foundations.md            (impl — schema, migration, applyGrade)
CTX-05R  docs/prompts/build/CTX-05R-algorithm-foundations-review.md    (review)
CTX-06   docs/prompts/build/CTX-06-algorithm-selection.md              (impl — chooseNextCard, active set, struggle)
CTX-06R  docs/prompts/build/CTX-06R-algorithm-selection-review.md      (review)
CTX-07   docs/prompts/build/CTX-07-algorithm-completion.md             (impl — sprinkle, path complete, docs)
CTX-07R  docs/prompts/build/CTX-07R-algorithm-completion-review.md     (review)
```

Plan: `docs/plans/bornomala-learning-algorithm-v2-prompt-chain.md`.
Spec: `docs/LEARNING-ALGORITHM.md` (locked at `v2.0-draft-3`).

---

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

---

## Recommended model

`claude-sonnet-4-6` for the master and impl prompts; `claude-opus-4-6` is also fine for review prompts. **Thinking**: Off for impl, On for review.

---

## Prompt to paste

```markdown
You are running the master orchestrator for the Bornomala v2 algorithm chain. Your job is to execute six prompt files in sequence, with Bappy's confirmation between each.

## Before starting

1. `git pull origin main`
2. `git log --oneline -5` — confirm working tree clean and main is current.
3. Read in order:
   - `docs/plans/bornomala-learning-algorithm-v2-prompt-chain.md` (the plan)
   - `docs/LEARNING-ALGORITHM.md` (the spec — locked at v2.0-draft-3)
4. Read the *metadata block only* of each child prompt to confirm Status:
   - CTX-05, CTX-05R, CTX-06, CTX-06R, CTX-07, CTX-07R
   If any is `✅ Done`, skip it and tell Bappy.
5. Tell Bappy:
   - Which prompts will run, in order.
   - The estimated commits this will produce (3 feat commits + any fixes).
   - That you will pause for confirmation between each step.
6. Wait for Bappy to say "go" before starting CTX-05.

## Per-step protocol

For each child prompt:

1. **Pre-execution gate** (per `~/.claude/shared/PROMPT-SYSTEM.md`):
   - Read the prompt file in full.
   - Recap to Bappy in 2–3 sentences.
   - Check whether the work was already done (git log + file inspection). If ✅ Already done, ask Bappy to confirm skip.
   - Wait for "go".
2. **Execute** the prompt body exactly as written. Do not skip steps. Do not improvise scope.
3. **Verify** the prompt's checklist passes.
4. **Mark** the child prompt's Status to `✅ Done` (edit the metadata).
5. **Commit** per the prompt's instructions. Push.
6. **Pause**. Tell Bappy "CTX-NN is done — say 'go' to continue to CTX-NN+1, or 'stop' to pause."

## Sequence

1. CTX-05 — Foundations (impl)
2. CTX-05R — Foundations Review
3. CTX-06 — Selection (impl)
4. CTX-06R — Selection Review
5. CTX-07 — Completion (impl)
6. CTX-07R — Completion Review

If any review reports FAIL:
- File a `FIX-CTX-NN-<topic>.md` prompt with specific fixes to make.
- Pause and tell Bappy. Do not auto-fix without his go.
- After FIX is applied (by you, in a separate step), re-run the corresponding R prompt.

## Conflict avoidance with the parallel agent

- Always `git pull origin main` before starting any step.
- If the pull surfaces unexpected changes that conflict with the chain's scope (especially in `App.tsx` or `lib/learning.ts`), STOP and tell Bappy. Do not auto-merge.
- Commit and push immediately after each step so the window for conflicts stays small.

## If you are running low on context

Before context auto-compacts (≤ 25% remaining or "hand over" instruction):
1. Commit any in-progress work as `wip(algo): chain handover at CTX-NN — <state>`.
2. Push to main.
3. Write `docs/handover/CHAIN-handover-YYYY-MM-DD.md` containing:
   - Which child prompts have run and their statuses.
   - Which child prompt is in flight and its progress.
   - Exactly what to do next (read which file, run which command).
4. Tell Bappy the handover path.
5. Stop.

The next session can resume by re-pasting this master prompt and naming the handover file.

## What NOT to do

- Do NOT run two child prompts in parallel.
- Do NOT skip a review step. Reviews catch what impl misses.
- Do NOT modify the spec (`docs/LEARNING-ALGORITHM.md`) during implementation. Only the change log in CTX-07.
- Do NOT add UI work, audio, or any out-of-scope feature. The chain is algorithm-only.
- Do NOT silently auto-fix review findings. File a FIX prompt.

## After all six prompts

When CTX-07R reports PASS:

1. Tell Bappy the chain is complete.
2. Confirm `docs/LEARNING-ALGORITHM.md` is at version `v2.0`.
3. Suggest next: a future UI chain for the signed per-card bar and path-complete celebration, plus a fresh teaching session to validate the algorithm in the wild and trigger the spec review cadence.
4. Stop.
```

---

## Verification checklist

- [ ] All 6 child prompts ran successfully and are Status `✅ Done`.
- [ ] `npm run typecheck` PASS at the final commit.
- [ ] `npx tsx --test lib/learning.test.ts` PASS at the final commit.
- [ ] `npm run web` runs cleanly with no console errors.
- [ ] `docs/LEARNING-ALGORITHM.md` version is `v2.0`.
- [ ] No UI changes shipped.
- [ ] All commits pushed to main.

---

## What NOT to do (master-level)

- Do NOT skip ahead. Reviews catch real bugs.
- Do NOT relax the "UI frozen" rule. UI follow-up is a separate chain.
- Do NOT proceed if the parallel agent has uncommitted changes that overlap our scope.

---

## Next step

After PASS: plan the UI follow-up chain (signed per-card bar, path-complete celebration, Path UI redesign). Trigger the spec review cadence after Bappy's next teaching session.
