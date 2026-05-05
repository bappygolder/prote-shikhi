# Plan — CTX-06R Selection-Algorithm Review (independent)

**Author**: Claude Code (Opus 4.7)
**Created**: 2026-05-06
**Recommended Model**: claude-sonnet-4-6 (`claude-sonnet-4-6`) with thinking on. Complexity: Medium. Reason: Spec-vs-code audit + manual browser scenario; non-trivial but bounded.

---

## Context

CTX-06 (full v2 selection algorithm — `SessionState`, `visibilityScore`, weighted-random `chooseNextCard`, active-set lifecycle, struggle mode) was implemented and merged at commit `3b2d81b`. The CTX-06R prompt at `docs/prompts/build/CTX-06R-algorithm-selection-review.md` requires an **independent, read-only verification** in a fresh session against `LEARNING-ALGORITHM.md` v2.0-draft-3 §5, §6, §8, §9, §10.

The output of this work is **a single review report** at `docs/handover/CTX-06R-review-2026-05-06.md` recording PASS/FAIL across the spec-vs-code checklist and the manual browser scenario. **No production code is modified.** If FAIL, a `FIX-CTX-06-<topic>.md` prompt is filed under `docs/prompts/build/` and the review is paused.

This plan also corrects the plan-mode default path: this file replaces the auto-generated stub at `~/.claude/plans/you-are-reviewing-ctx-06-shimmying-badger.md`, which will be deleted after exiting plan mode (per CLAUDE.md plan-mode rename rule).

---

## Scope (read-only)

### Files to read (no edits)
- `docs/prompts/build/CTX-06-algorithm-selection.md` — execution prompt (intent of the work being reviewed)
- `docs/LEARNING-ALGORITHM.md` — spec v2.0-draft-3, §5/§6/§8/§9/§10 (file uses markdown headings; spec sections must be located by heading text since no `§` anchors exist)
- `lib/learning.ts` (554 lines) — full audit of exports: types, constants, `visibilityScore`, `chooseNextCard`, `applyActiveSetOn*`, `maybeEnter/ExitStruggleMode`, `initSessionState`
- `lib/learning.test.ts` (454 lines, 22 tests) — confirm coverage maps to spec rules
- `App.tsx` lines 43, 448–449, 481, 745–809, 873, 934, 1082, 1094 — `SessionState` init + `handleGrade` wiring
- `docs/handover/CTX-05R-review-2026-05-06.md` — template shape
- `docs/LEARNING-LOGIC.md`, `docs/PRODUCT-LOGIC.md` — out-of-scope guard (must be unchanged)
- `git diff HEAD~1 App.tsx` and `git log` — confirm what changed

### Commands to run
- `git pull origin main` (sync)
- `npm run typecheck` (record output)
- `npx tsx --test lib/learning.test.ts` (count passes/fails)
- `npm run web` (manual browser scenario below)

---

## Spec-vs-code audit checklist (from CTX-06R prompt)

Each item produces ✅ / ❌ / ⚠️ with file:line evidence in the report.

**Constants & types (§5, §6)**
- [ ] `SessionState` fields match spec §5 exactly
- [ ] All §6 constants in CTX-06's scope exported with correct values

**Visibility score (§8)**
- [ ] Hard 0 when `id === previousCardId AND activeSet.length > 1`
- [ ] Hard 0 when card is mastered (CTX-06 placeholder; CTX-07 will lift)
- [ ] Newcomer boost: max at `attemptsSinceEnteringActive=0`, zero at `=NEW_CARD_BOOST_DURATION`, linear in between
- [ ] Additive terms present: W_BASE, W_RECENT_MISS, W_PENALTY, W_STREAK_GAP, W_FRESHNESS

**`chooseNextCard` (§10)**
- [ ] Single-card fallback works
- [ ] Weighted-random uses injected `rng`, not bare `Math.random` inside the function
- [ ] Never returns `previousCardId` when `activeSet.length > 1`

**Active-set lifecycle (§9)**
- [ ] Session starts with 2 cards from path's first un-mastered
- [ ] First counted-correct grows to 3
- [ ] Subsequent counted-corrects do NOT grow further (cap at 3)
- [ ] Mastery removes the card and brings in the next path card

**Struggle mode (§9)**
- [ ] Enters when `recentGrades` has ≥ 2 'w' in last 6
- [ ] On enter: `prePushedActiveSet` saved; active shrinks to top 2 by `struggleScore`
- [ ] Exits at `consecutiveCorrectInSession ≥ 6`
- [ ] On exit: active restored from `prePushedActiveSet`

**App.tsx wiring**
- [ ] `useState<SessionState>` initialized via `initSessionState`
- [ ] Grade handler order: recentGrades → struggle transitions → `chooseNextCard` → `previousCardId`
- [ ] No rendering changes (UI identical to CTX-05)

**Out-of-scope guard**
- [ ] No sprinkle code (`eligibleForSprinkle` / `sprinkleCooldown` decrement) yet
- [ ] No path-complete callback yet
- [ ] `docs/LEARNING-LOGIC.md` and `docs/PRODUCT-LOGIC.md` unchanged

---

## Manual browser scenario

Reset progress (clear AsyncStorage). Pick a preset with ≥ 5 cards (e.g. consonants).

1. ✓×6 — anti-repeat (never same card twice in a row)
2. After ~10 reps, third card enters rotation
3. ✗,✗ — rotation shrinks to 2 cards (struggle mode)
4. ✓×6 — rotation restores

Record exact card sequence and any deviation.

---

## Output

Write the report to:
`docs/handover/CTX-06R-review-2026-05-06.md`

Same shape as `docs/handover/CTX-05R-review-2026-05-06.md`:
- Header (status, date, reviewer, scope)
- Run-command results (typecheck, tests)
- Manual scenario observations
- Per-item checklist with file:line evidence
- Verdict: PASS or FAIL
- Recommended next action

---

## Verification (how to know this review is itself complete)

- [ ] `git status` clean (no production edits)
- [ ] All 22 unit tests run; pass count recorded
- [ ] `npm run typecheck` output recorded
- [ ] Manual scenario card sequence recorded
- [ ] Every audit checkbox has ✅/❌/⚠️ + file:line evidence
- [ ] Out-of-scope guard verified via `git diff HEAD~1 -- docs/LEARNING-LOGIC.md docs/PRODUCT-LOGIC.md` (expected: empty)
- [ ] Verdict line written
- [ ] If FAIL: `FIX-CTX-06-<topic>.md` filed under `docs/prompts/build/` and review halts

---

## Critical files (paths)

- Plan (this file): `docs/plans/bornomala-algo-CTX-06R-review.md`
- Review prompt: `docs/prompts/build/CTX-06R-algorithm-selection-review.md`
- Spec: `docs/LEARNING-ALGORITHM.md`
- Implementation: `lib/learning.ts`
- Tests: `lib/learning.test.ts`
- Wiring: `App.tsx` (lines 43, 448–449, 481, 745–809, 873, 934, 1082, 1094)
- Template: `docs/handover/CTX-05R-review-2026-05-06.md`
- Output target: `docs/handover/CTX-06R-review-2026-05-06.md`

---

## Cleanup

After ExitPlanMode, delete `~/.claude/plans/you-are-reviewing-ctx-06-shimmying-badger.md` (auto-generated stub, no content needed there).
