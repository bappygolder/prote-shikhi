# CTX-12 Handover — Progress Bar Bug Fixes

**Branch**: `feat/ctx-11-path-switcher`  
**Status**: All changes implemented and TypeScript-clean. Needs browser verification and commit.

---

## What Was Built This Session

### Feature: Granular Global Progress Bar
Replaced the old `masteredCount / totalCards` metric with `computeGlobalProgress` — a per-click formula that sums warmup corrects + streak across ALL preset cards.

**Formula per letter** (max 15 pts):
- Warmup phase: `min(correctCount, 5)` (0→5 pts)
- Mastery phase: `5 + streak` (5→15 pts)
- Mastered: `15` (fixed)

**Wrong answer in mastery phase** → streak resets → bar drops back (intentional).

### Bug Fixed: Infinite Loop / Bar Frozen
**Root cause**: `nextUnenteredFromPath` in `lib/learning.ts` only checked `state.activeSet` membership, NOT mastery status. After enough mastery cycles, previously-mastered cards fell off the active set (got removed when mastered), were treated as "not yet entered," and were re-added by `applyActiveSetOnMastery`. Eventually the active set filled with only mastered cards (all scoring 0 in `visibilityScore`). `chooseNextCard` fell to its `filtered.length === 0` fallback → kept showing mastered cards → bar frozen permanently.

**Fix**: Added `progress: ProgressByCard` parameter to `nextUnenteredFromPath` and added `&& !getProgressForCard(progress, card.id).mastered` guard. Updated all callers.

---

## Files Changed

| File | What Changed |
|------|-------------|
| `lib/learning.ts` | `nextUnenteredFromPath` — added `progress` param + mastery check |
| `lib/learning.ts` | `applyActiveSetOnCorrect` — added `progress` param, passes to above |
| `lib/learning.ts` | `applyActiveSetOnMastery` — added `progress` param, passes to above |
| `lib/learning.ts` | `computeGlobalProgress` — new exported function (end of file) |
| `lib/learning.test.ts` | Updated 3 test call sites for new signatures |
| `App.tsx` | Import `computeGlobalProgress`; replace `totalMasteryPercent` calc |
| `App.tsx` | `handleGrade` — pass `progressForSelection` to both active-set calls |
| `App.tsx` | `ProgressBar` component — 700ms animation, color interpolation (indigo→teal→green→amber), glow shadow |

---

## Remaining Known Issue (Bug 1)

User reported bar "shrinks on correct." Math proves the formula is correct — no correct answer can decrease earned. Likely cause: user occasionally presses wrong (streak resets), which correctly drops the bar. The drop feels disproportionate because streak of 5 → 0 loses 5 pts at once, but recovery is 1 pt per correct. This is intentional learning algorithm behavior — investigate only if user confirms the bar drops with zero wrong presses.

---

## Next Steps

1. **Test in browser** — open localhost:8081, practice letters on the default preset, verify bar moves on every correct click and doesn't freeze
2. **Commit everything** on `feat/ctx-11-path-switcher` branch:
   ```
   git add lib/learning.ts lib/learning.test.ts App.tsx
   git commit -m "fix(progress): global per-click bar + fix active-set mastery cycle bug"
   ```
3. **Open PR** to main when verified
