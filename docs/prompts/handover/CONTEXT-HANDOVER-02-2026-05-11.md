# Context Handover — Bornomala · 2026-05-11 (Session 2)

## Current State

**App version**: `v1.2.0` — visible in the menu footer. This is what to look for to confirm the app has reloaded.

**Branch**: `main` — all work from this session is committed and up to date.

---

## What Was Completed This Session (CTX-15)

A full redesign of the learning algorithm and flashcard visual system was shipped:

### Algorithm (lib/learning.ts)
- Replaced single `CORRECT_PER_LEVEL=5` with a 3-phase system: `PHASE_THRESHOLDS = [5, 10, 5]`
- **Phase 1** (level 0→1): 5 correct in any order — wrongs do **NOT** reset the counter (free phase)
- **Phase 2** (level 1→2): 10 consecutive correct — any wrong resets to 0 (streak required)
- **Phase 3** (level 2→3 = mastered): 5 consecutive correct — any wrong resets to 0
- Total to master each letter: **20 correct answers**
- `SESSION_MASTERY_LEVEL` changed from 2 → 3
- Schema bumped v4 → v5; existing mastered cards promoted to `level = 3` on migration
- `computeGlobalProgress` updated to use `PHASE_CUMULATIVE = [0, 5, 15]` prefix sums
- 50 tests passing, 0 typecheck errors

### UI (App.tsx)
- **LevelDots redesigned**: 3 milestone dots (one per phase), permanently colored once a phase completes
  - Colors: blue (#60a5fa) → purple (#a78bfa) → green (#34d399)
  - Unearned dot: transparent fill with colored border
- **Card progress bar**: now resets to 0 at the start of each phase (shows current-phase progress, not cumulative)
  - Label shows e.g. "৩/৫" for phase 1, "৭/১০" for phase 2
- **Letters page (Occor tab)**: each tile now shows `X/২০` instead of a percentage
- **VictoryScreen**: confetti overlay fires when all cards in a preset are mastered
  - CTA 1: "আরও অনুশীলন" — dismisses overlay, continues practice
  - CTA 2: "শেখার পথ" — navigates to the paths tab
  - No "remove data" option shown

### New skill
- `bornomala-version-bump` skill created at `~/.claude/skills/bornomala-version-bump/SKILL.md`
- Rule: bump version in both `package.json` AND `app.json` after every feature/fix commit
- Tell the user which version to look for in the menu footer after every commit
- Bump levels: patch = bugfix, minor = feature, major = rewrite

---

## One Remaining Small Visual Fix

### What to change
The 3 milestone dots are currently positioned at **top-left of the card** (absolute, top: 12, left: 12). The user wants them moved to **just above the "এই অক্ষর" progress bar at the bottom-left of the card**, so the learner's eye is already there when they look at their progress.

### Where in the code

**File**: `App.tsx`

The current LevelDots are rendered as an absolute overlay at the top of the card:
```tsx
// Inside <Animated.View style={[styles.card, cardAnimatedStyle]}>
<LevelDots level={currentProgress.level} />   // ← absolute top: 12, left: 12
```

The progress strip (LetterProgressMark) is in the `stripZone` below:
```tsx
<View style={[styles.stripZone, { opacity: ... }]}>
  <LetterProgressMark ... />
</View>
```

### What to do
1. Remove `position: 'absolute', top: 12, left: 12` from `levelDotsStyles.row`
2. Move `<LevelDots>` from being a card-level absolute overlay → render it **inside `stripZone`**, just above `<LetterProgressMark>`, left-aligned
3. Style: `flexDirection: 'row'`, `alignSelf: 'flex-start'`, `marginBottom: 6`, no absolute positioning

Example of new `stripZone` structure:
```tsx
<View style={[styles.stripZone, { opacity: ... }]}>
  <LevelDots level={currentProgress.level} />
  <LetterProgressMark ... />
</View>
```

And updated `levelDotsStyles.row`:
```ts
row: {
  flexDirection: 'row',
  gap: 8,
  alignItems: 'center',
  alignSelf: 'flex-start',
  marginBottom: 6,
}
```

### After the fix
- Bump version `1.2.0 → 1.2.1` (patch — small visual tweak)
- Update both `package.json` and `app.json`
- Tell user: "Look for **v1.2.1** in the menu footer"
- Commit with message: `fix(ui): move level dots above progress bar in card`

---

## Key Files Reference

| File | What it does |
|---|---|
| `App.tsx` | All UI — LevelDots (line ~193), card layout (line ~1076), stripZone (line ~1117) |
| `lib/learning.ts` | Algorithm — PHASE_THRESHOLDS, applyGrade, computeGlobalProgress, migrateProgress |
| `lib/learning.test.ts` | 50 tests — all pass |
| `package.json` | Version field |
| `app.json` | `expo.version` field (what the app actually reads at runtime) |
| `docs/plans/bornomala-ctx15-dots-algorithm-completion.md` | Full plan for CTX-15 |
| `~/.claude/skills/bornomala-version-bump/SKILL.md` | Version bump rule |
