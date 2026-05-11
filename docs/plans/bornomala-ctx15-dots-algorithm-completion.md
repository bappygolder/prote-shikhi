# CTX-15: Flashcard Dots Redesign + 3-Phase Algorithm + Completion Screen

> Note: Per NAMING-CONVENTIONS, move this to `docs/plans/bornomala-ctx15-dots-algorithm-completion.md` after approval.

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Medium
- Reason: Coordinated changes across algorithm, UI, and tests with no external dependencies.

---

## Context

CTX-14 introduced a level-based algorithm (levels 0–3, CORRECT_PER_LEVEL=5, SESSION_MASTERY_LEVEL=2 = mastery at 10 correct). The visual feedback (LevelDots) shows 5 within-stage pips centered below the letter. The user wants:

1. **Algorithm redesign**: 3 distinct phases totalling 20 correct answers to master each letter
2. **Dots redesign**: Move dots to top-left (traffic-light style), milestone markers not pips
3. **Card progress bar**: Reset per phase instead of cumulative
4. **Completion screen**: Confetti + CTA when all cards in a preset are mastered
5. **Letters page**: Show X/20 progress per tile

---

## Phase Model (new algorithm)

| Phase | Level transition | Rule | Threshold | Wrong penalty |
|---|---|---|---|---|
| 1 — Free | 0 → 1 | 5 correct in any order (small pool) | 5 total | No reset |
| 2 — Streak | 1 → 2 | 10 consecutive correct (medium pool) | 10 streak | Reset to 0 |
| 3 — Context | 2 → 3 (mastered) | 5 consecutive correct (larger pool) | 5 streak | Reset to 0 |

Total to master: **20 correct per letter** (5 free + 10 streak + 5 streak)

---

## Step 1 — Algorithm update (`lib/learning.ts`)

**Constants to change:**
```ts
// Before
export const CORRECT_PER_LEVEL = 5;
export const SESSION_MASTERY_LEVEL = 2;

// After
export const PHASE_THRESHOLDS = [5, 10, 5] as const;   // per level
export const PHASE_CUMULATIVE = [0, 5, 15] as const;   // prefix sums
export const TOTAL_CORRECT_TO_MASTER = 20;             // sum of thresholds
export const SESSION_MASTERY_LEVEL = 3;                // 3 phases
```

**`applyGrade()` logic changes (lines 170–215):**
- Correct: use `PHASE_THRESHOLDS[current.level]` as threshold (not single constant)
- Wrong: only reset `levelCorrect` to 0 if `current.level > 0`
  - Phase 1 (level 0) is free — wrongs do NOT reset the count

**`getMasteryPercent()` / global progress formula (wherever used in App.tsx):**
```ts
// earned per card = PHASE_CUMULATIVE[level] + levelCorrect, capped at 20
const earned = Math.min(PHASE_CUMULATIVE[level] + levelCorrect, TOTAL_CORRECT_TO_MASTER);
```

**Schema migration:**
- Bump `schemaVersion` from 4 → 5
- In migration handler: if `mastered === true` on an old card → set `level = 3`; otherwise reset to `defaultLetterProgress()`

---

## Step 2 — LevelDots redesign (`App.tsx`)

**Component signature change:**
```tsx
// Before
function LevelDots({ level, levelCorrect }: { level: number; levelCorrect: number })

// After
function LevelDots({ level }: { level: number })
```

**Rendering logic:**
- 3 dots (not 5), one per phase
- Dot `i` is filled (permanently) if `level > i`
- Colors: phase 0 = blue `#60a5fa`, phase 1 = purple `#a78bfa`, phase 2 = green `#34d399`
- Unearned dot: transparent fill, colored border
- Size: 12×12px, gap: 8px, arranged horizontally

**Position change:**
- Remove `LevelDots` from inside `<View style={styles.glyphZone}>` (currently line 1112)
- Render as `position: 'absolute', top: 12, left: 12` overlay on `<Animated.View style={styles.card}>`
- `styles.card` already has `overflow: 'hidden'`; ensure it has `position: 'relative'` (likely already set)

```tsx
// New levelDotsStyles
row: {
  flexDirection: 'row',
  gap: 8,
  alignItems: 'center',
  position: 'absolute',
  top: 12,
  left: 12,
}
```

---

## Step 3 — Card progress bar (per-phase, resets each stage)

Currently passes cumulative mastery % to `LetterProgressMark` (lines 1118–1123).

**Change in App.tsx practice view:**
```tsx
// Before
<LetterProgressMark
  completed={currentMasteryPercent}   // cumulative 0-100
  letter={currentDisplayLetter}
  percent={currentMasteryPercent}
  total={100}
/>

// After
const phaseThreshold = PHASE_THRESHOLDS[currentProgress.level] ?? 5;
const phasePercent = Math.round((currentProgress.levelCorrect / phaseThreshold) * 100);

<LetterProgressMark
  completed={currentProgress.levelCorrect}
  letter={currentDisplayLetter}
  percent={phasePercent}
  total={phaseThreshold}
/>
```

The bar fills to 100% within each phase, then resets to 0 when a dot is earned.

---

## Step 4 — Top global bar (total progress across all letters)

Find where `totalMasteryPercent` is computed in App.tsx. Update to use new formula:
```ts
let totalEarned = 0;
for (const card of selectedPresetCards) {
  const p = getProgressForCard(progress, card.id);
  totalEarned += Math.min(PHASE_CUMULATIVE[p.level] + p.levelCorrect, TOTAL_CORRECT_TO_MASTER);
}
const totalMax = selectedPresetCards.length * TOTAL_CORRECT_TO_MASTER;
const totalMasteryPercent = Math.min(100, Math.round((totalEarned / totalMax) * 100));
```

---

## Step 5 — Letters page (Occor tab) — X/20 per tile

Currently shows `masteryPercent` as Bangla number. Update each tile to show `correctOut20`:
```ts
const p = getProgressForCard(progress, card.id);
const correctOut20 = Math.min(PHASE_CUMULATIVE[p.level] + p.levelCorrect, TOTAL_CORRECT_TO_MASTER);
// Display as: toBanglaNumber(correctOut20) + '/২০'
```

---

## Step 6 — Completion/Victory screen (`App.tsx`)

**State addition:**
```ts
const [isSetComplete, setIsSetComplete] = useState(false);
```

**Detection in `handleGrade()` (line 851):**
```ts
if (isPresetComplete(selectedPresetCards, gradedProgress) && !wasPathCompleteBefore) {
  setIsSetComplete(true);  // replaces the console.log
}
```

**Victory overlay** — rendered above the practice view as an absolute full-screen overlay:
- Background: semi-opaque white or cream (matches app theme)
- Confetti: built-in using 20–30 `Animated.Value` particles (colored dots, fall from top)
  - Use `Math.random()` for x positions, spring/timing for fall
  - No new package needed
- Title: "এই সেট শেষ!" (large, bold)
- Subtitle: "সব অক্ষর শেখা হয়েছে"
- Two CTAs:
  1. **"আরও অনুশীলন"** (Practice more) → `setIsSetComplete(false)` and continue
  2. **"শেখার পথ"** (Learning paths) → `setCurrentTab('path')` + `setIsSetComplete(false)`

No "Remove data" option shown on this screen.

---

## Step 7 — Update tests (`lib/learning.test.ts`)

- Update all references to `CORRECT_PER_LEVEL` → `PHASE_THRESHOLDS`
- Add test: Phase 1 wrong does NOT reset `levelCorrect`
- Add test: Phase 1 → Phase 2 transition at 5 correct
- Add test: Phase 2 wrong DOES reset `levelCorrect`
- Add test: Phase 2 → Phase 3 transition at 10 consecutive
- Add test: Phase 3 wrong resets; mastery at 5 consecutive

---

## Critical files

| File | Changes |
|---|---|
| `lib/learning.ts` | Constants, `applyGrade()`, schema migration (v4→v5) |
| `App.tsx` | LevelDots (component + placement), progress bar formula, global bar, letters tile, completion state + overlay |
| `lib/learning.test.ts` | Rewrite phase tests |

---

## Verification

1. `npm run typecheck` — 0 errors
2. `npm test` — all tests pass
3. Manual: Phase 1 — tap ঠিক 5× for a letter → dot 1 lights up, bar resets to 0
4. Manual: Phase 1 — tap ভুল mid-way → bar does NOT go back (no streak penalty)
5. Manual: Phase 2 — tap ভুল at streak 7/10 → bar resets to 0
6. Manual: Phase 2 done (dot 2) → Phase 3 works at 5 consecutive → dot 3 + mastered
7. Manual: Complete all cards in a preset → victory screen with confetti appears
8. Manual: "আরও অনুশীলন" dismisses overlay and returns to practice
9. Manual: "শেখার পথ" navigates to path tab
10. Letters page: each tile shows correct X/20 in Bangla numerals
