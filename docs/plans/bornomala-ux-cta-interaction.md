# Plan: CTA Interaction Fixes + Keyboard Shortcuts

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Low
- Reason: Targeted style patch + single useEffect; no algorithmic complexity

---

## Context

Two UX friction points on the practice screen:
1. Clicking ভুল/ঠিক buttons sometimes selects the button text instead of firing the press — a React Native Web browser behavior where `Text` inside `Pressable` inherits browser selectability.
2. No keyboard shortcuts exist; mouse-heavy users can't grade cards without reaching for a button.

---

## Fix 1 — Text Selection on CTA Click

**Root cause**: React Native Web renders `<Text>` as `<span>` elements. Browser defaults make span text selectable. Rapid clicks or click-drag motions trigger text selection before the press event fires.

**Fix**: Add `userSelect: 'none'` to the relevant styles in **`lib/theme.tsx`**.

Two places to patch:
- `actionButton` style (applies to both ভুল and ঠিক) — add `userSelect: 'none'`
- `actionText` style (the Text inside the button) — add `userSelect: 'none'`

React Native Web accepts `userSelect` as a valid style property (maps to CSS `user-select`). No TypeScript casting needed.

**Critical files**:
- `lib/theme.tsx` → `actionButton` (line ~425), `actionText` (line ~432)

---

## Fix 2 — Keyboard Shortcuts

**Where**: `App.tsx` — inside the main `App` component, add one `useEffect`.

**Mappings**:
| Key | Action |
|-----|--------|
| `Space` | `handleGrade(true)` — same as ঠিক |
| `ArrowRight` | `handleGrade(true)` — move forward / correct |
| `ArrowLeft` | `handleGrade(false)` — move back / wrong |

**Guard conditions** (check inside the handler before calling `handleGrade`):
- `currentTab === 'practice'` — only active on the practice screen
- `activeCard !== null` — only when a card is showing (not between cards / session end)

**Implementation**:
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (currentTab !== 'practice' || !activeCard) return;
    if (e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      handleGrade(true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleGrade(false);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentTab, activeCard, handleGrade]);
```

`handleGrade` must be in the dependency array. If it's defined inline (not wrapped in `useCallback`), either wrap it in `useCallback` or use a ref pattern to avoid stale closure issues.

**Stale closure strategy**: If `handleGrade` is a plain function (no `useCallback`), use a `useRef` that holds the latest version:
```tsx
const handleGradeRef = useRef(handleGrade);
useEffect(() => { handleGradeRef.current = handleGrade; });
// then in the keydown listener: handleGradeRef.current(true/false)
// dependency array becomes just [currentTab, activeCard]
```

This avoids adding/removing the listener on every render.

**Critical files**:
- `App.tsx` → after existing `useEffect` hooks, before the return

---

## Verification

1. Open the app in browser (`npx expo start --web`)
2. Click-drag across the ভুল/ঠিক button text → no text selection highlight
3. Press `Space` → grades correct, advances card
4. Press `ArrowRight` → grades correct, advances card  
5. Press `ArrowLeft` → grades wrong, advances card
6. Switch to শিখি tab → arrows/space do nothing (guard active)
7. `npx tsc --noEmit` passes
