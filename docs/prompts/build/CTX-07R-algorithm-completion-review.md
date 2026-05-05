# CTX-07R — Completion Review (independent verification)

**Status**: ⏳ Pending
**Author tool**: Claude Code (Opus 4.7)
**Created**: 2026-05-05
**Last updated**: 2026-05-05
**$ value**: UNSCORED
**Urgency**: 5
**Score**: UNSCORED

---

## What this context window does

Independently verify CTX-07's sprinkle, path-complete, and doc alignment against spec §11, §12. Confirms the chain is complete.

---

## Prerequisites

CTX-07 status `✅ Done`.

---

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

---

## Recommended model

`claude-sonnet-4-6` or `claude-opus-4-6`. **Thinking**: On.

---

## Prompt to paste

```markdown
You are reviewing CTX-07. No production edits. Output is a report.

## Before starting

1. `git pull origin main`
2. Read in order:
   - `docs/prompts/build/CTX-07-algorithm-completion.md`
   - `docs/LEARNING-ALGORITHM.md` §11, §12, change log entry for v2.0
   - Current `lib/learning.ts`
   - `lib/learning.test.ts`
   - `git diff HEAD~1 App.tsx` (lines changed)
   - `docs/LEARNING-LOGIC.md`
   - `docs/PRODUCT-LOGIC.md`

## Run

- `npm run typecheck`
- `npx tsx --test lib/learning.test.ts`
- `npm run web` — manual scenario below

## Manual scenario

For this you'll need to fake a mastered state. Instead of grinding through a full path, paste this into the browser console after the app loads:

```js
const seed = JSON.stringify({
  schemaVersion: 2,
  byCard: { 'consonant-01': {
    correctCount: 12, wrongCount: 0, seenCount: 12,
    streak: 10, bestStreak: 10, mastered: true,
    penalty: 0, consecutiveMistakes: 0, recentResults: ['c','c','c','c','c','c'],
    attemptsSinceEnteringActive: 12, enteredActiveAt: new Date().toISOString(),
    cardsShownSinceMastered: 12, sprinkleCooldown: 0, timeSpentMs: 0,
    lastSeenAt: new Date().toISOString(), firstSeenAt: new Date().toISOString(),
  }}
});
localStorage.setItem('bornomala-progress-v2', seed);  // adjust key if different
location.reload();
```

(Adjust the AsyncStorage key to whatever the app uses on web — read `App.tsx` to find it.)

Pick the consonants preset. Grade ~14 cards. Confirm the mastered consonant-01 surfaces approximately every 7 cards.

Then watch for path-complete: it should NOT fire because only 1 of 39 consonants is mastered. Confirm the console is silent.

## Spec-vs-code audit

### Sprinkle (§12)
- [ ] `eligibleForSprinkle` returns true exactly when all 5 conditions hold (per spec).
- [ ] Quiet period is honored — a card with `cardsShownSinceMastered < 10` returns false.
- [ ] Cooldown is honored — a card with `sprinkleCooldown > 0` returns false.
- [ ] When a sprinkle is shown, its `sprinkleCooldown` is reset to `SPRINKLE_COOLDOWN`.
- [ ] Other mastered cards' cooldowns decrement on every card shown.

### Visibility score (§8 + sprinkle)
- [ ] Mastered cards no longer hard-zero unconditionally — they return `W_SPRINKLE` when eligible.
- [ ] Anti-immediate-repeat still applies to mastered + sprinkled cards.

### Path complete (§11)
- [ ] `isPathComplete` returns true only when ALL path cards are mastered.
- [ ] App.tsx fires `console.log('[bornomala] path complete:', presetId)` exactly once per transition into complete state.
- [ ] When path complete, `chooseNextCard` falls back to the full mastered pool (sprinkle-only mode).

### Documentation
- [ ] `docs/LEARNING-LOGIC.md` Progress Model and Next Card Logic sections describe v2.
- [ ] `docs/PRODUCT-LOGIC.md` mastery row says "10 correct in a row (streak resets on wrong)" and warm-up row added.
- [ ] `docs/LEARNING-ALGORITHM.md` version is `v2.0` (not `-draft-N`); status line says implemented; change log has the v2.0 entry.

### Out-of-scope guard
- [ ] No UI changes (no celebration screen, no banner, no toast).
- [ ] No new component files.
- [ ] No changes to `data/banglaLetters.ts`, `package.json`, configs.

## Output

Write `docs/handover/CTX-07R-review-YYYY-MM-DD.md` with the same shape as the other Rs. If PASS:

```
## Result: PASS — chain complete.

The v2 algorithm is fully implemented and aligned to spec. Recommended next:
- Plan the UI follow-up chain (signed per-card bar, path-complete celebration, Path UI redesign).
- Continue the spec review cadence after the next teaching session per docs/inbox/do/2026-05-05-bornomala-spec-review-cadence.md.
```

If FAIL: file `FIX-CTX-07-<topic>.md`.

## What NOT to do

Same as other R prompts: no production edits.

## Next step

If PASS → chain complete. Tell Bappy. The UI follow-up chain can be planned at a later date.
If FAIL → FIX prompt + loop back here.
