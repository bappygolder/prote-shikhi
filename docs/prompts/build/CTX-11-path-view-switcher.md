# CTX-11 — Path View Switcher + Flat View

**Status**: ⏳ Pending
**Created**: 2026-05-11
**Roadmap link**: `docs/plans/bornomala-roadmap-may2026-improvements.md` → row 5 + per-prompt scope
**Depends on**: CTX-08 ✅, UX-04 ✅, CTX-10 ✅ (all landed on main)
**Touches**: `App.tsx`, new `components/path/PresetPath.tsx`, new `components/path/FlatPath.tsx`, new `components/path/PathSwitcher.tsx`
**Risk**: Medium-High (extracts monolithic code + adds new render path)
**Parallel-safe with**: CTX-09 (separate worktree — no conflict)
**$ value**: 6000
**Urgency**: 3
**Score**: 6.5

## What this context window does

Introduces a **flat list view** as an alternative to the existing zigzag path. Adds a switcher at the top of the path screen so the user can toggle between views. Extracts the zigzag renderer into its own component file in the process. Persists the user's choice across sessions.

No algorithm changes. No data model changes. Pure render layer.

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Worktree

`feat/ctx-11-path-switcher` — isolated from main and from CTX-09's worktree.

## Recommended model

Sonnet 4.6 (`claude-sonnet-4-6`)

---

## Prompt to paste

```markdown
## Before starting

git checkout -b feat/ctx-11-path-switcher
git pull origin main --rebase

**Read these files first:**
- `App.tsx` (full — the zigzag path renderer is currently inline here, lines ~353–446)
- `data/banglaLetters.ts` (understand the preset/card structure passed to the path renderer)
- `lib/learning.ts` (understand LetterProgress shape — the flat view will display mastery %)
- `docs/plans/bornomala-roadmap-may2026-improvements.md` → CTX-11 section

---

## Task 1 — Create components directory

```bash
mkdir -p components/path
```

---

## Task 2 — Extract zigzag renderer into `components/path/PresetPath.tsx`

Move the existing zigzag path renderer out of `App.tsx` into its own file.

- Copy the `PresetPath` component (lines ~353–446 in `App.tsx`) into `components/path/PresetPath.tsx`.
- Extract only the component and its direct types/props. Do not copy styles that belong to other screens.
- Move the relevant styles (`pathRow`, `pathRowLeft`, `pathRowRight`, `pathNode`, `pathNodeCurrent`, `pathNodeMastered`, etc.) into the new file's local `StyleSheet`.
- Update `App.tsx` to import `PresetPath` from `components/path/PresetPath.tsx` and delete the inlined version.
- **Verify no behaviour change** — the zigzag must render identically after extraction. Run the app and compare visually before continuing.

Props interface for `PresetPath`:
```typescript
interface PresetPathProps {
  cards: CardDef[];
  progress: Record<string, LetterProgress>;
  currentCardId: string | null;
  onSelectCard: (card: CardDef) => void;
}
```

---

## Task 3 — Build `components/path/FlatPath.tsx`

A clean vertical list — one row per letter, no zigzag offset.

Each row contains:
- **Left:** the Bangla letter (large, same font as practice card)
- **Middle:** a horizontal progress bar (same color-progression logic as UX-04: red→orange→yellow→green→gold) + mastery % label
- **Right:** a status icon:
  - Not started: `○` (empty circle, grey)
  - In progress (correctCount > 0, not mastered): `◑` (half circle, or a progress emoji)
  - Mastered: `✓` (green checkmark)
  - Currently active (matches currentCardId): bold border on the entire row

Tapping a row selects that card (calls `onSelectCard`) — same behaviour as tapping a zigzag node.

Props interface (same as PresetPath — drop-in replacement):
```typescript
interface FlatPathProps {
  cards: CardDef[];
  progress: Record<string, LetterProgress>;
  currentCardId: string | null;
  onSelectCard: (card: CardDef) => void;
}
```

Style targets:
- Row height: ~64px
- Letter font size: 28px
- Progress bar height: 6px, full width of middle column
- Match the cream/navy colour scheme from `App.tsx`

---

## Task 4 — Build `components/path/PathSwitcher.tsx`

A minimal two-option segmented control at the top of the path screen.

```typescript
type PathView = 'zigzag' | 'flat';

interface PathSwitcherProps {
  value: PathView;
  onChange: (view: PathView) => void;
}
```

Labels:
- `zigzag` → `ঘুরে পথ` (winding path) — or a path icon `〰`
- `flat` → `সহজ পথ` (simple path) — or a list icon `≡`

Style: two pill buttons side-by-side, active one filled dark navy, inactive ghost. Match the existing chip style from the Okkhor screen.

---

## Task 5 — Wire into `App.tsx`

In the path screen section of `App.tsx`:

1. Add state: `const [pathView, setPathView] = useState<PathView>('zigzag')`.
2. On mount, read persisted value from AsyncStorage key `porashikhi.ui.pathView.v1`. Default `'zigzag'`.
3. On `setPathView`, persist new value to the same AsyncStorage key.
4. Render `<PathSwitcher value={pathView} onChange={setPathView} />` at the top of the path screen, below the heatmap toggle row.
5. Conditionally render:
   ```tsx
   {pathView === 'zigzag'
     ? <PresetPath cards={...} progress={...} currentCardId={...} onSelectCard={...} />
     : <FlatPath cards={...} progress={...} currentCardId={...} onSelectCard={...} />
   }
   ```

Pass the same data to both — they are drop-in alternatives.

---

## Task 6 — Type exports

Create `components/path/index.ts` re-exporting:
```typescript
export { PresetPath } from './PresetPath';
export { FlatPath } from './FlatPath';
export { PathSwitcher } from './PathSwitcher';
export type { PathView } from './PathSwitcher';
```

---

## Verification (run before declaring done)

1. `npm run typecheck` — passes with zero errors.
2. `npm test` — all tests pass (no algorithm or data changes).
3. `npm run web`:
   - Path screen loads in zigzag mode by default.
   - Switcher appears above the path; tapping `সহজ পথ` switches to flat list.
   - Both views show the same letters with correct mastery % and status icons.
   - Active card (currentCardId) is visually highlighted in both views.
   - Tap any card in either view → switches to practice for that card (onSelectCard fires).
   - Reload page → selected path view is restored from AsyncStorage.
   - The heatmap toggle (from CTX-08) still works above the switcher.
4. Visual check: flat view rows are comfortably tappable, text not clipped, progress bar visible.

## Out of scope

- A third "practical" path (word-by-word) — that is a future prompt, leave `PathView` open for extension
- Path step detail modal on tap (deferred — the current onSelectCard goes to practice, which is correct)
- Any animation or confetti (CTX-12)
- Anything in `lib/firebase/` or auth screens (CTX-09)

## Stop conditions

- If the extracted `PresetPath` renders differently after extraction (layout shift, missing data), stop and diagnose before adding the flat view.
- If `App.tsx` is already importing from `components/` (check before creating the directory), adjust paths accordingly and ask if the structure differs from expected.

---

## Handoff

When complete, update this file's **Status** to ✅ and append:
- Branch + commit hash
- Checklist of tasks completed (1–6)
- Any regressions or edge cases discovered
- Confirm `npm run typecheck` and `npm test` pass
```
