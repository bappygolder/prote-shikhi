# CTX-06R — Selection Review (independent verification)

**Status**: ⏳ Pending
**Author tool**: Claude Code (Opus 4.7)
**Created**: 2026-05-05
**Last updated**: 2026-05-05
**$ value**: UNSCORED
**Urgency**: 5
**Score**: UNSCORED

---

## What this context window does

Independently verify CTX-06's selection logic against spec §5, §8, §9, §10. PASS/FAIL report only — no production edits. Run in a fresh session.

---

## Prerequisites

CTX-06 status `✅ Done`. Spec at `v2.0-draft-3`.

---

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

---

## Recommended model

`claude-sonnet-4-6` or `claude-opus-4-6`. **Thinking**: On.

---

## Prompt to paste

```markdown
You are reviewing CTX-06. You DO NOT modify production code in this session. Output is a report.

## Before starting

1. `git pull origin main`
2. Read in order:
   - `docs/prompts/build/CTX-06-algorithm-selection.md`
   - `docs/LEARNING-ALGORITHM.md` §5, §6 (constants), §8, §9, §10
   - Current `lib/learning.ts`
   - `lib/learning.test.ts`
   - `git diff HEAD~1 App.tsx` (the changed lines)

## Run

- `npm run typecheck` → record output
- `npx tsx --test lib/learning.test.ts` → count passes/fails
- `npm run web` → run the manual scenario below

## Manual scenario

Reset progress (clear AsyncStorage). Pick a preset with at least 5 cards (e.g. consonants).

Grade in this exact sequence and observe what card is shown next:

1. ✓, ✓, ✓, ✓, ✓, ✓ on whatever cards are surfaced — confirm anti-repeat (never the same card consecutively).
2. After ~10 reps, look for a third card to enter the rotation.
3. ✗, ✗ — confirm rotation shrinks to 2 cards (struggle mode).
4. ✓, ✓, ✓, ✓, ✓, ✓ — confirm rotation restores.

Report observations in detail.

## Spec-vs-code audit

### Constants & types (§5, §6)
- [ ] `SessionState` matches spec §5 fields exactly.
- [ ] All constants from spec §6 in scope of CTX-06 are exported with correct values.

### Visibility score (§8)
- [ ] Hard 0 when `id === previousCardId AND activeSet.length > 1`.
- [ ] Hard 0 when card is mastered (CTX-06 placeholder; CTX-07 will change this).
- [ ] Newcomer boost: max at `attemptsSinceEnteringActive=0`, zero at `=NEW_CARD_BOOST_DURATION`, linear in between.
- [ ] All additive terms present (W_BASE, W_RECENT_MISS, W_PENALTY, W_STREAK_GAP, W_FRESHNESS).

### chooseNextCard (§10)
- [ ] Single-card fallback works.
- [ ] Weighted-random uses injected `rng`, not bare `Math.random` inside.
- [ ] Never returns previousCardId when activeSet.length > 1.

### Active-set lifecycle (§9)
- [ ] Session starts with 2 cards from path's first un-mastered.
- [ ] First counted-correct grows to 3.
- [ ] Subsequent counted-corrects do NOT grow further (cap at 3).
- [ ] Mastery removes the card from active set and brings in the next path card.

### Struggle mode (§9)
- [ ] Enters when `recentGrades` has ≥ 2 'w' in the last 6.
- [ ] On enter: `prePushedActiveSet` saved; active shrinks to top 2 by struggleScore.
- [ ] Exits at `consecutiveCorrectInSession ≥ 6`.
- [ ] On exit: active restored from `prePushedActiveSet`.

### App.tsx wiring
- [ ] `useState<SessionState>` initialized via `initSessionState`.
- [ ] Grade handler updates session in the right order: recentGrades → struggle transitions → chooseNextCard → previousCardId.
- [ ] No rendering code changes (UI looks identical to CTX-05).

### Out-of-scope guard
- [ ] No sprinkle code yet (no `eligibleForSprinkle` / `sprinkleCooldown` decrement logic implemented).
- [ ] No path-complete callback yet.
- [ ] `docs/LEARNING-LOGIC.md` and `docs/PRODUCT-LOGIC.md` unchanged (CTX-07 owns those).

## Output

Write report to `docs/handover/CTX-06R-review-YYYY-MM-DD.md` with the same shape as CTX-05R's output.

Recommended next:
- ✅ Approve and proceed to CTX-07, OR
- ⚠️ File `FIX-CTX-06-<topic>.md`.

## What NOT to do

Same as CTX-05R: no production edits, no fixing, file FIX prompts if needed.

## Next step

If PASS → `docs/prompts/build/CTX-07-algorithm-completion.md`.
If FAIL → file FIX prompt; loop back here after.
