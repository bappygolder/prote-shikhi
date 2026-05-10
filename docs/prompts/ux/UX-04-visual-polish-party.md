# UX-04 — Visual Polish Party

**Status:** ✅ Done  
**Risk:** Low-Medium  
**Touches:** `App.tsx`, `data/banglaLetters.ts`, `app.json`  
**Depends on:** CTX-08 ✅, DIAG-01 ✅, dark mode ✅  
**Prompt chain:** Standalone — no worktree needed

---

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Medium
- Reason: UI-only edits inside App.tsx, no algorithm or infra changes

---

## Context

CTX-08 recovered vertical space and simplified chips. Dark mode is live. This prompt finishes the visual layer: percentage-aware progress bars, better first-paint, and polish to the letter-progress strip.

The app is called **পড়াশিখি** in all UI strings. Code files and folder stay as `bornomala` / `PoraShikhi`.

---

## Checklist

### 1. Top mastery progress bar — show percentage

Currently `ProgressBar` shows `completed/total` as a fraction. Change it:

- Keep the fraction text on the right
- Add an animated `%` number that increments alongside the bar fill
- The fill width is already animated; animate the % number with the same `Animated.timing` call
- Style: same `progressValue` style, add `%` suffix

File: `App.tsx` — `ProgressBar` component (lines ~191–242) and `progressValue` style in `lib/theme.tsx`

---

### 2. Letter-progress mark — faint placeholder on first render

Currently `LetterProgressMark` is hidden until `correctCount > 0`. Show it always:

- When `correctCount === 0`: render at 10% opacity so users see the slot exists
- When `correctCount > 0`: full opacity (current behaviour)
- Use a simple `opacity` style prop — no animation needed

File: `App.tsx` — `stripZone` / `LetterProgressMark` usage (line ~1114)

---

### 3. Letter tile — show mastery % on all tiles, not just started ones

Currently `letterPercent` only shows when the tile has progress. Show `০%` on untouched tiles in muted colour so the grid reads as a consistent data table.

- Untouched: `textDisabled` colour, `০%`
- In-progress: `textBody` colour, current %
- Mastered: `textSuccess` colour, `১০০%`

File: `App.tsx` — letter grid tile render (lines ~1200–1270)

---

### 4. Fix first-paint blur on the practice card letter

The large Bangla glyph occasionally renders blurry on first paint because the font isn't loaded yet. Fix:

- Add `expo-font` if not already installed (`npx expo install expo-font`)
- In `App.tsx`, use `useFonts` from `expo-font` to preload the system Bangla font (or confirm no custom font is needed — if the glyph uses system font, just gate render on `isLoaded` which already exists)
- If `isLoaded` is `false`, show `null` or a skeleton instead of the card — the splash screen already handles this delay

Check `isLoaded` state — it already exists for AsyncStorage hydration, reuse it as the render gate.

File: `App.tsx` — check `isLoaded` guard at render entry (line ~1019)

---

## Verification

```bash
npx tsc --noEmit          # zero errors
npx tsx --test lib/learning.test.ts  # 32/32 pass
```

Manual:
1. Open practice tab — progress bar shows `X/Y` + animated `%`
2. Fresh card (0 correct) — letter-progress strip visible at low opacity
3. Letters tab — every tile shows a `%` value
4. Hard-reload — no blurry letter on first paint

---

## Handoff (fill in after execution)

**Status:** ✅ Complete  
**Executed by:** Claude Sonnet 4.6  
**Date:** 2026-05-11  
**Result:** All 4 items shipped. TSC clean, 32/32 tests pass.  
**Commits:** `70b8efa` feat(ui): UX-04 visual polish party  
