# CTX-15: দ্রুত পথ (Fast Path) — Custom Learning Path Feature

> **Correct plan path:** `docs/plans/bornomala-ctx15-custom-fast-path.md`  
> *(auto-named stub — move this file there before executing)*

## Recommended Model
- **Model:** Sonnet 4.6 (`claude-sonnet-4-6`)
- **Complexity:** Medium
- **Reason:** Additive feature with clear patterns to follow — no architectural risk, but spans 6 files including one new data type and two new components.

---

## Context

The app currently has two learning paths: Ghure path (zigzag) and Shahuja path (flat list). This CTX adds a third tab — **দ্রুত পথ (Fast path)** — that lets the user create named, custom practice presets. Each preset can contain any combination of existing Bangla letter cards and/or user-defined word cards. The design and interaction model mirrors the Shahuja path exactly. This lays the foundation for a future super-admin/teacher path-authoring feature.

---

## Scope

- Multiple named custom presets (create, practice, delete)
- Content: existing letter cards + new word cards (self-graded, same as letters)
- Entry point: "+" button in the custom tab
- Design: identical to FlatPath rows (glyph, label, progress bar, play button)
- Storage: AsyncStorage only (local)
- No words data file needed — user types Bangla words directly in the creator

---

## Data Model Changes

**File:** `data/banglaLetters.ts`

Add after the existing types:

```typescript
export type WordCard = {
  id: string;      // e.g. "word-<uuid>"
  word: string;    // the Bangla word/syllable
  group: 'word';
  order: number;
};

export type CustomCard = LetterCard | WordCard;

export type CustomPreset = {
  id: string;
  label: string;
  cards: CustomCard[];
  createdAt: string;  // ISO string
};
```

Helper to get display text for any card type:
```typescript
export function getCardDisplay(card: CustomCard): string {
  return card.group === 'word' ? card.word : card.letter;
}
```

Note: `LetterCard` and `WordCard` share the `id` and `order` fields — the `group` discriminant distinguishes them. Progress is still tracked by `card.id` in the existing `ProgressByCard` system — no changes to `lib/learning.ts`.

---

## New Storage Key

In `App.tsx`, add alongside existing storage keys:
```typescript
const CUSTOM_PRESETS_STORAGE_KEY = 'porashikhi.customPresets.v1';
```

Load/save pattern mirrors the existing `progress` state (load on mount, save on change).

---

## Step-by-Step Implementation

### Step 1 — Extend PathView type and tab switcher

**File:** `components/path/PathSwitcher.tsx`

- Add `'custom'` to the `PathView` union: `'zigzag' | 'flat' | 'custom'`
- Add third tab to `TABS` array:
  ```typescript
  { id: 'custom', label: '⚡ দ্রুত পথ' }
  ```
- The pills layout is `flex: 1` per pill — adding a third will auto-shrink all three equally. May need to reduce `fontSize` from 14 → 12 or reduce `height` from 36 → 32 to avoid overflow on small screens. Check on device.

### Step 2 — New component: CustomPath

**New file:** `components/path/CustomPath.tsx`

Props:
```typescript
type CustomPathProps = {
  presets: CustomPreset[];
  progress: ProgressByCard;
  currentPresetId: string | null;
  onSelect: (presetId: string) => void;
  onCreate: () => void;
  onDetail: (preset: CustomPreset) => void;
  onDelete: (presetId: string) => void;
};
```

Render a `FlatList` of `CustomPreset` rows — **identical visual design to FlatPath rows:**
- Left: first character of first card displayed as glyph (letter or word[0])
- Middle: preset label + dot state + progress % bar
- Right: play button (▶)

Below the list, a full-width "+ নতুন পথ তৈরি করুন" (Create new path) button that calls `onCreate`.

Dot state logic (same as FlatPath):
```typescript
const masteredCount = preset.cards.filter(c => getProgressForCard(progress, c.id).mastered).length;
const isCurrent = preset.id === currentPresetId;
const isMastered = masteredCount === preset.cards.length && preset.cards.length > 0;
const hasStarted = !isMastered && masteredCount > 0;
const state = isCurrent ? 'current' : isMastered ? 'mastered' : hasStarted ? 'started' : 'locked';
```

Long-press on a row → show delete confirmation (platform Alert). No reset — custom presets can just be deleted.

### Step 3 — New component: CustomPresetCreator (modal)

**New file:** `components/path/CustomPresetCreator.tsx`

A full-screen modal with:

**Header:** "নতুন দ্রুত পথ" with a × close button and "সংরক্ষণ" (Save) button (disabled if no label or no cards selected).

**Section 1 — Preset name:**  
`TextInput` for the label (placeholder: "পথের নাম লিখুন...").

**Section 2 — Add letters:**  
Grid of all `LETTER_CARDS` (from `data/banglaLetters.ts`). Each cell shows the letter glyph; selected cells are highlighted (orange border + light fill matching app palette). Group headers: স্বর, কার চিহ্ন, ব্যঞ্জন, সংখ্যা. Multi-select.

**Section 3 — Add words:**  
A text input + "যোগ করুন" (Add) button. Each submitted word appears as a chip below the input with an × to remove. Words are stored as `WordCard` objects with a generated ID (`word-${Date.now()}-${index}`).

**Save logic:**
```typescript
const newPreset: CustomPreset = {
  id: `custom-${Date.now()}`,
  label: nameInput,
  cards: [...selectedLetterCards, ...wordCards],
  createdAt: new Date().toISOString(),
};
```

Pass `onSave(newPreset)` to parent.

### Step 4 — App.tsx wiring

**File:** `App.tsx`

1. Add `customPresets` state: `useState<CustomPreset[]>([])`
2. Load from `CUSTOM_PRESETS_STORAGE_KEY` on mount (alongside existing storage loads)
3. Persist to storage on change (alongside existing storage saves)
4. Add `showCreator` state: `useState(false)` to control modal visibility
5. Add handler:
   ```typescript
   function handleSaveCustomPreset(preset: CustomPreset) {
     const updated = [...customPresets, preset];
     setCustomPresets(updated);
     setShowCreator(false);
   }
   ```
6. Add delete handler:
   ```typescript
   function handleDeleteCustomPreset(presetId: string) {
     setCustomPresets(prev => prev.filter(p => p.id !== presetId));
   }
   ```
7. In the path rendering section, add third branch:
   ```typescript
   pathView === 'custom' ? (
     <CustomPath
       presets={customPresets}
       progress={progress}
       currentPresetId={currentPathPresetId}
       onSelect={setCurrentPathPresetId}
       onCreate={() => setShowCreator(true)}
       onDetail={...}
       onDelete={handleDeleteCustomPreset}
     />
   ) : ...
   ```
8. Render `<CustomPresetCreator>` modal when `showCreator === true`

**Flashcard display update:**  
The existing flashcard renders `currentCard.letter`. Custom word cards have `group: 'word'` and use `currentCard.word`. Update the flashcard display:
```typescript
// Where the card letter/glyph is rendered:
const displayText = 'word' in currentCard && currentCard.group === 'word'
  ? currentCard.word
  : (currentCard as LetterCard).letter;
```

Word text may be longer than a single letter — use `adjustsFontSizeToFit` and `numberOfLines={1}` on the display `Text` component, or reduce `fontSize` when `displayText.length > 2`.

### Step 5 — Update exports

**File:** `components/path/index.ts`

Export `CustomPath`, `CustomPresetCreator`, and re-export `CustomPreset`, `CustomCard`, `WordCard` (or keep types in `data/banglaLetters.ts` and import from there directly).

---

## Files Modified

| File | Change |
|---|---|
| `data/banglaLetters.ts` | Add `WordCard`, `CustomCard`, `CustomPreset` types + `getCardDisplay()` helper |
| `components/path/PathSwitcher.tsx` | Add `'custom'` to `PathView`, add third tab |
| `components/path/CustomPath.tsx` | **New** — list of custom presets + create button |
| `components/path/CustomPresetCreator.tsx` | **New** — modal for creating presets |
| `components/path/index.ts` | Export new components |
| `App.tsx` | Add `customPresets` state, storage, handlers, render logic, flashcard display fix |

---

## Out of Scope (deferred)

- Editing an existing custom preset (delete + recreate for now)
- Reordering cards within a preset
- Preset detail modal for custom presets (can be added later)
- Admin/teacher remote path authoring
- Word card images or meanings
- Sharing custom paths

---

## Verification

1. Run `npx expo start` → app loads with three tabs in PathSwitcher
2. Tap "দ্রুত পথ" → shows empty state with "+ নতুন পথ তৈরি করুন" button
3. Tap "+" → creator modal opens; enter name, select 3 letters, add 2 words → tap Save
4. Preset appears in list; tap play → practice session starts with those cards
5. Word cards display the word text (not a single letter glyph) in the flashcard
6. Long-press a preset → delete confirmation → preset removed
7. Kill and reopen app → custom presets persist (AsyncStorage)
8. Switch between all three tabs — no visual regression on Shahuja/Ghure tabs
9. Check tab labels fit on small screen (iPhone SE size)
