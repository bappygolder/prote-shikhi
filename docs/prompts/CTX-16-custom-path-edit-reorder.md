# CTX-16 — Custom Path: Edit, Reorder, and Play

**Status**: Ready  
**Project**: Bornomala  
**Branch**: `feat/ctx-16-custom-path-edit-reorder`  
**Last updated**: 2026-05-11

---

## Objective

Extend the দ্রুত পথ (Fast Path) feature with three capabilities:
1. **Edit** an existing custom preset (open in edit mode, update in place)
2. **Reorder** cards during creation and editing (drag or move-up/down)
3. **Play** directly from within the edit/create view

---

## Context — What Already Exists

The `feat/ctx-15` work (merged to `main`) added:

- **Third path tab** `⚡ দ্রুত পথ` in `components/path/PathSwitcher.tsx`
- **`CustomPath`** (`components/path/CustomPath.tsx`) — FlatPath-style list of custom presets with play button and long-press delete. Row tap and play button both call `onSelect(preset.id)`, which starts a practice session.
- **`CustomPresetCreator`** (`components/path/CustomPresetCreator.tsx`) — full-screen modal for creating a preset: name text input, letter grid (multi-select across স্বর / কার চিহ্ন / ব্যঞ্জন / সংখ্যা), word chip input (type a Bangla word → add chip → display as removable chip).
- **`CustomPreset`** type in `data/banglaLetters.ts` — extends `PracticePreset` with `createdAt: string`. Word cards use `group: 'word'` and store the word text in the `letter` field.
- **App.tsx wiring** — `customPresets: CustomPreset[]` state, loaded/saved via `AsyncStorage` key `porashikhi.customPresets.v1`, `handleSaveCustomPreset`, `handleDeleteCustomPreset`, `showCreator` modal state.

### Current limitations to fix

- Tapping a row in `CustomPath` immediately starts practice — there is no way to open or edit the preset.
- `CustomPresetCreator` is create-only (no `preset` prop, no edit mode).
- Cards have no ordering UI — the save order is "selected letters in grid order, then word chips in add order". There is no way to reorder.
- No play button inside the creator/editor.

---

## Scope

### 1. Edit mode in CustomPresetCreator

`CustomPresetCreator` must accept an optional `preset` prop. When provided:
- Modal title becomes **"পথ সম্পাদনা"** (Edit path) instead of "নতুন দ্রুত পথ"
- Name input is pre-filled with `preset.label`
- Letter grid shows all existing letter cards from the preset as selected
- Word chips are pre-populated from the preset's word cards (`group === 'word'`)
- The ordered card list (see §3) reflects the preset's current card order
- Save calls `onSave` with the updated preset keeping the **same `id` and `createdAt`** (only label, cards changed)

### 2. Edit entry point in CustomPath

Currently, tapping the row body calls `onSelect` (starts practice). Change this:
- **Tap the row body** → calls new `onEdit(preset)` prop → opens editor in edit mode
- **Play button** → still calls `onSelect(preset.id)` (starts practice, unchanged)
- **Long press** → still calls delete confirmation (unchanged)

Add `onEdit: (preset: CustomPreset) => void` to `CustomPathProps`.

In `App.tsx`:
- Add `editingPreset: CustomPreset | null` state (null = closed, preset = open in edit mode)
- `handleEditCustomPreset(preset)` → sets `editingPreset`
- Pass `editingPreset` to `CustomPresetCreator` as `preset` prop
- On save in edit mode: call `handleUpdateCustomPreset(updated)` which replaces the preset in `customPresets` array by id
- On close: set `editingPreset` to null

**One modal, two modes** — use the same `CustomPresetCreator` component. Control mode via the `preset` prop: `undefined` = create mode, `CustomPreset` = edit mode.

### 3. Card reorder in CustomPresetCreator

Replace the current "grid selects + chips add" state with a **unified ordered card list**.

#### New internal state

```typescript
// Replace selectedLetterIds: Set<string> and wordChips: WordChip[] with:
const [orderedCards, setOrderedCards] = useState<OrderedCard[]>([]);

type OrderedCard =
  | { type: 'letter'; card: LetterCard }
  | { type: 'word'; id: string; word: string };
```

#### Letter grid behaviour (updated)
- Tapping an unselected letter → **appends** it to `orderedCards` (at the end)
- Tapping a selected letter → **removes** it from `orderedCards` wherever it appears
- A letter cell is "selected" if its card appears in `orderedCards`

#### Word input behaviour (updated)
- "যোগ করুন" → **appends** a word entry to `orderedCards`

#### Ordered card list UI
Below the word input, show the full `orderedCards` list as a reorderable list. Each row:
- Left: the letter glyph or word text
- Right: drag handle **⠿** (or up/down arrows — see §4)
- Tap × to remove

This replaces the separate chip row for words and makes letter selection order visible.

#### Save
Build `cards: LetterCard[]` from `orderedCards` in list order:
- `type: 'letter'` entries → use the original `LetterCard`
- `type: 'word'` entries → create `{ id, letter: word, group: 'word', order: index + 1000 }`

### 4. Drag-to-reorder implementation

**Recommended approach: `react-native-draggable-flatlist`**

Install if not already present:
```bash
npx expo install react-native-draggable-flatlist react-native-gesture-handler
```

Check `package.json` first — if `react-native-gesture-handler` is already installed, only install `react-native-draggable-flatlist`.

Use `DraggableFlatList` from `react-native-draggable-flatlist` for the ordered card list. Wrap in `GestureHandlerRootView` if not already present (check if App.tsx already wraps the root — if `react-native-gesture-handler` is already used, it likely does).

Each row renders with the `drag` prop from `renderItem`:
```tsx
renderItem={({ item, drag, isActive }) => (
  <ScaleDecorator>
    <Pressable onLongPress={drag} style={[rowStyle, isActive && activeRowStyle]}>
      <Text>{item.type === 'letter' ? item.card.letter : item.word}</Text>
      <Text style={dragHandle}>⠿</Text>
      <Pressable onPress={() => removeCard(item)}>
        <Text>✕</Text>
      </Pressable>
    </Pressable>
  </ScaleDecorator>
)}
```

**Fallback approach** (if draggable library causes issues): Use up/down arrow buttons instead. Each row has ↑ and ↓ buttons. Simpler but functional. Only fall back to this if `react-native-draggable-flatlist` fails to install or causes RN version conflicts.

### 5. Play button inside the editor

At the bottom of `CustomPresetCreator`, alongside the save button in the header or as a secondary button, add a **"অনুশীলন করুন" (Practice)** button.

- Only enabled when at least one card is in `orderedCards` (doesn't require a name)
- Calls `onPractice(cards)` prop — new optional prop on `CustomPresetCreatorProps`
- In `App.tsx`: `handlePracticeFromCreator(cards)` → builds a temporary preset, calls `handleSelectPreset` logic directly, closes the modal, navigates to practice tab
- This lets the user test their path before saving it

---

## Files to Modify

| File | Change |
|---|---|
| `components/path/CustomPresetCreator.tsx` | Add `preset?`, `onPractice?` props; unified `orderedCards` state; `DraggableFlatList` reorder UI; edit mode pre-fill; play button |
| `components/path/CustomPath.tsx` | Add `onEdit` prop; row tap → `onEdit`, play button → `onSelect` (was: both called `onSelect`) |
| `components/path/index.ts` | Re-export any new types if needed |
| `App.tsx` | Add `editingPreset` state; `handleEditCustomPreset`; `handleUpdateCustomPreset`; `handlePracticeFromCreator`; pass `onEdit` and `editingPreset` to components |
| `package.json` / `app.json` | New dependency if `react-native-draggable-flatlist` needs adding |

---

## Technical Notes

### Keeping same `id` in edit mode
When saving in edit mode, the updated preset must use the **original** `preset.id` and `preset.createdAt`. Only `label` and `cards` change.

```typescript
const updated: CustomPreset = {
  ...existingPreset,   // preserves id, createdAt
  label: name.trim(),
  cards: buildCards(orderedCards),
};
```

### handleUpdateCustomPreset in App.tsx
```typescript
function handleUpdateCustomPreset(updated: CustomPreset) {
  setCustomPresets(prev => prev.map(p => p.id === updated.id ? updated : p));
  setEditingPreset(null);
}
```

### Initialising orderedCards in edit mode
When `preset` prop changes from `undefined` to a `CustomPreset` (modal opens in edit mode), initialise `orderedCards` from `preset.cards`:
```typescript
useEffect(() => {
  if (!preset) return;
  setName(preset.label);
  setOrderedCards(
    preset.cards.map(card =>
      card.group === 'word'
        ? { type: 'word', id: card.id, word: card.letter }
        : { type: 'letter', card }
    )
  );
}, [preset]);
```

### GestureHandlerRootView
Check if `App.tsx` already imports from `react-native-gesture-handler`. If not, wrap the root view:
```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// In AppRoot or the outermost view:
<GestureHandlerRootView style={{ flex: 1 }}>
  ...
</GestureHandlerRootView>
```

---

## Deferred (out of scope for CTX-16)

- Duplicate a custom preset
- Share/export a preset
- Import a preset via QR code or link
- Admin/teacher remote path creation
- Progress reset for a custom preset (progress is already tracked by card ID — deleting and recreating the preset does not reset progress for individual letters)

---

## Verification

1. **`npx tsc --noEmit`** — zero errors before starting and after finishing
2. **Create flow**: Open ⚡ tab → tap "+ নতুন পথ তৈরি করুন" → add 3 letters + 2 words → reorder cards by dragging → save → preset appears in list
3. **Edit flow**: Tap a preset row body → creator opens pre-filled with existing name, letters selected, words shown in order → change the name and remove one letter → save → list updates correctly (same preset, updated content)
4. **Reorder persists**: Edit a preset, reorder its cards, save, re-open edit → cards appear in the new order
5. **Play from editor**: Open creator (create or edit) → tap "অনুশীলন করুন" → practice session opens with those cards
6. **Play from list**: Tap the ▶ play button on a preset row → practice session opens (unchanged from CTX-15)
7. **Long press still deletes**: Long-press a row → delete confirmation → preset removed
8. **Storage survives restart**: Kill and reopen the app → custom presets and their card order are preserved
