# CTX-16: Custom Path Edit, Reorder & Play — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend দ্রুত পথ with edit mode (tap row to edit), drag-to-reorder cards in the creator, and a play button inside the editor for testing before save.

**Architecture:** `CustomPresetCreator` gains unified `orderedCards: OrderedCard[]` state replacing the separate `selectedLetterIds` Set + `wordChips` array; gains `preset?` prop for edit mode and `onPractice?` prop for play-from-editor. `CustomPath` gains `onEdit` prop so row tap opens the editor instead of starting practice. `App.tsx` gains `editingPreset` state, extracts `handleSelectPresetDirect`, and adds three new handlers.

**Tech Stack:** Expo 54, React Native 0.81.5, TypeScript, `react-native-draggable-flatlist`, `react-native-gesture-handler`

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Medium
- Reason: Multi-file feature work with well-defined interfaces, no architectural unknowns

---

## File Map

| File | Changes |
|---|---|
| `App.tsx` | GestureHandlerRootView wrap; `editingPreset` state; `handleSelectPresetDirect`; `handleEditCustomPreset`; `handleUpdateCustomPreset`; `handleCreatorSave`; `handlePracticeFromCreator`; updated CustomPath + CustomPresetCreator props |
| `components/path/CustomPresetCreator.tsx` | `OrderedCard` type; unified `orderedCards` state; `DraggableFlatList` reorder UI; `preset?` edit mode; `onPractice?` play button |
| `components/path/CustomPath.tsx` | `onEdit` prop; row tap → `onEdit(preset)` instead of `onSelect(preset.id)` |
| `package.json` / lockfile | `+react-native-draggable-flatlist`, `+react-native-gesture-handler` (via `npx expo install`) |

---

## Task 1: Install dependencies + wrap AppRoot in GestureHandlerRootView

**Files:**
- Modify: `App.tsx:1845-1851`
- Modify: `package.json` (via expo install)

- [ ] **Step 1: Install packages**

```bash
cd "/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training"
npx expo install react-native-draggable-flatlist react-native-gesture-handler
```

Expected: both packages added to `package.json` dependencies and `node_modules`

- [ ] **Step 2: Add GestureHandlerRootView import to App.tsx**

At the top of `App.tsx`, add a new import line (alongside other RN imports):

```typescript
import { GestureHandlerRootView } from 'react-native-gesture-handler';
```

- [ ] **Step 3: Wrap AppRoot return**

In `App.tsx`, the `AppRoot` function (line 1845) currently returns:
```tsx
export default function AppRoot() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}
```

Replace with:
```tsx
export default function AppRoot() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add App.tsx package.json package-lock.json
git commit -m "feat(ctx-16): install draggable-flatlist and wrap AppRoot in GestureHandlerRootView"
```

---

## Task 2: Rewrite CustomPresetCreator — unified orderedCards state + DraggableFlatList

**Files:**
- Modify: `components/path/CustomPresetCreator.tsx`

Replaces the `selectedLetterIds: Set<string>` + `wordChips: WordChip[]` state model with a single `orderedCards: OrderedCard[]` array. Removes the flat chip row. Adds a `DraggableFlatList` ordered card list below the word input.

- [ ] **Step 1: Update imports (line 1)**

Replace:
```typescript
import { useState } from 'react';
```
With:
```typescript
import { useEffect, useState } from 'react';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
```

- [ ] **Step 2: Replace WordChip type with OrderedCard type (line 27)**

Replace:
```typescript
type WordChip = { id: string; word: string };
```
With:
```typescript
type OrderedCard =
  | { type: 'letter'; card: LetterCard }
  | { type: 'word'; id: string; word: string };
```

- [ ] **Step 3: Replace state variables (lines 37–40)**

Replace:
```typescript
  const [name, setName] = useState('');
  const [selectedLetterIds, setSelectedLetterIds] = useState<Set<string>>(new Set());
  const [wordInput, setWordInput] = useState('');
  const [wordChips, setWordChips] = useState<WordChip[]>([]);
```
With:
```typescript
  const [name, setName] = useState('');
  const [orderedCards, setOrderedCards] = useState<OrderedCard[]>([]);
  const [wordInput, setWordInput] = useState('');
```

- [ ] **Step 4: Update reset() (lines 42–47)**

Replace:
```typescript
  function reset() {
    setName('');
    setSelectedLetterIds(new Set());
    setWordInput('');
    setWordChips([]);
  }
```
With:
```typescript
  function reset() {
    setName('');
    setOrderedCards([]);
    setWordInput('');
  }
```

- [ ] **Step 5: Replace toggleLetter (lines 54–64)**

Replace:
```typescript
  function toggleLetter(cardId: string) {
    setSelectedLetterIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }
```
With:
```typescript
  function toggleLetter(card: LetterCard) {
    setOrderedCards((prev) => {
      const exists = prev.some((c) => c.type === 'letter' && c.card.id === card.id);
      if (exists) return prev.filter((c) => !(c.type === 'letter' && c.card.id === card.id));
      return [...prev, { type: 'letter' as const, card }];
    });
  }
```

- [ ] **Step 6: Update handleAddWord (lines 66–74)**

Replace:
```typescript
  function handleAddWord() {
    const trimmed = wordInput.trim();
    if (!trimmed) return;
    setWordChips((prev) => [
      ...prev,
      { id: `word-${Date.now()}-${prev.length}`, word: trimmed },
    ]);
    setWordInput('');
  }
```
With:
```typescript
  function handleAddWord() {
    const trimmed = wordInput.trim();
    if (!trimmed) return;
    const id = `word-${Date.now()}-${orderedCards.length}`;
    setOrderedCards((prev) => [...prev, { type: 'word' as const, id, word: trimmed }]);
    setWordInput('');
  }
```

- [ ] **Step 7: Remove handleRemoveWord; add removeCard and buildCards (lines 76–78)**

Replace:
```typescript
  function handleRemoveWord(id: string) {
    setWordChips((prev) => prev.filter((chip) => chip.id !== id));
  }
```
With:
```typescript
  function removeCard(item: OrderedCard) {
    setOrderedCards((prev) => {
      if (item.type === 'letter') {
        return prev.filter((c) => !(c.type === 'letter' && c.card.id === item.card.id));
      }
      return prev.filter((c) => !(c.type === 'word' && c.id === item.id));
    });
  }

  function buildCards(cards: OrderedCard[]): LetterCard[] {
    return cards.map((item, i) => {
      if (item.type === 'letter') return item.card;
      return { id: item.id, letter: item.word, group: 'word' as const, order: 1000 + i };
    });
  }
```

- [ ] **Step 8: Update handleSave (lines 80–100)**

Replace:
```typescript
  function handleSave() {
    const selectedLetters = LETTER_SECTIONS.flatMap((s) =>
      s.cards.filter((c) => selectedLetterIds.has(c.id)),
    );
    const wordCards: LetterCard[] = wordChips.map((chip, i) => ({
      id: chip.id,
      letter: chip.word,
      group: 'word',
      order: 1000 + i,
    }));

    const preset: CustomPreset = {
      id: `custom-${Date.now()}`,
      label: name.trim(),
      cards: [...selectedLetters, ...wordCards],
      createdAt: new Date().toISOString(),
    };

    onSave(preset);
    reset();
  }
```
With:
```typescript
  function handleSave() {
    const newPreset: CustomPreset = {
      id: `custom-${Date.now()}`,
      label: name.trim(),
      cards: buildCards(orderedCards),
      createdAt: new Date().toISOString(),
    };
    onSave(newPreset);
    reset();
  }
```

Note: `handleSave` in Tasks 3 will extend this to handle edit mode; keep the create-only version for now.

- [ ] **Step 9: Update canSave (line 102)**

Replace:
```typescript
  const totalSelected = selectedLetterIds.size + wordChips.length;
  const canSave = name.trim().length > 0 && totalSelected > 0;
```
With:
```typescript
  const canSave = name.trim().length > 0 && orderedCards.length > 0;
```

- [ ] **Step 10: Update letter count display in the section label (line 158–160)**

Replace:
```tsx
              {selectedLetterIds.size > 0 ? (
                <Text style={creatorStyles.sectionCount}> · {selectedLetterIds.size}টি বাছা হয়েছে</Text>
              ) : null}
```
With:
```tsx
              {orderedCards.filter((c) => c.type === 'letter').length > 0 ? (
                <Text style={creatorStyles.sectionCount}>
                  {' '}· {orderedCards.filter((c) => c.type === 'letter').length}টি বাছা হয়েছে
                </Text>
              ) : null}
```

- [ ] **Step 11: Update letter cell selection check and toggle call (lines 167, 174)**

Replace `const selected = selectedLetterIds.has(card.id);` with:
```typescript
                    const selected = orderedCards.some(
                      (c) => c.type === 'letter' && c.card.id === card.id,
                    );
```

Replace `onPress={() => toggleLetter(card.id)}` with:
```tsx
                        onPress={() => toggleLetter(card)}
```

- [ ] **Step 12: Replace word chip row with DraggableFlatList (lines 232–246)**

Replace the entire chip row block:
```tsx
            {wordChips.length > 0 ? (
              <View style={creatorStyles.chipRow}>
                {wordChips.map((chip) => (
                  <Pressable
                    key={chip.id}
                    accessibilityLabel={`${chip.word} সরান`}
                    onPress={() => handleRemoveWord(chip.id)}
                    style={({ pressed }) => [creatorStyles.chip, pressed && creatorStyles.chipPressed]}
                  >
                    <Text style={creatorStyles.chipText}>{chip.word}</Text>
                    <Text style={creatorStyles.chipRemove}> ✕</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
```
With:
```tsx
            {orderedCards.length > 0 ? (
              <View style={creatorStyles.cardList}>
                <Text style={creatorStyles.sectionLabel}>কার্ডের ক্রম</Text>
                <DraggableFlatList
                  data={orderedCards}
                  keyExtractor={(item) => (item.type === 'letter' ? item.card.id : item.id)}
                  onDragEnd={({ data }) => setOrderedCards(data)}
                  renderItem={({ item, drag, isActive }: RenderItemParams<OrderedCard>) => {
                    const label =
                      item.type === 'letter'
                        ? item.card.group === 'vowelSign'
                          ? `◌${item.card.letter}`
                          : item.card.letter
                        : item.word;
                    return (
                      <ScaleDecorator>
                        <Pressable
                          onLongPress={drag}
                          style={[creatorStyles.cardRow, isActive && creatorStyles.cardRowActive]}
                        >
                          <Text style={creatorStyles.cardRowText}>{label}</Text>
                          <Text style={creatorStyles.dragHandle}>⠿</Text>
                          <Pressable
                            onPress={() => removeCard(item)}
                            style={creatorStyles.cardRowRemove}
                          >
                            <Text style={creatorStyles.cardRowRemoveText}>✕</Text>
                          </Pressable>
                        </Pressable>
                      </ScaleDecorator>
                    );
                  }}
                />
              </View>
            ) : null}
```

- [ ] **Step 13: Add new styles to creatorStyles**

At the very end of the `creatorStyles = StyleSheet.create({...})` block, before the closing `});`, add:

```typescript
  cardList: {
    gap: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e5ddc7',
  },
  cardRowActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    backgroundColor: '#f0ece0',
  },
  cardRowText: {
    flex: 1,
    fontSize: 22,
    color: '#111827',
    fontWeight: '600',
  },
  dragHandle: {
    fontSize: 18,
    color: '#9ca3af',
    paddingHorizontal: 8,
  },
  cardRowRemove: {
    padding: 4,
  },
  cardRowRemoveText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '700',
  },
```

- [ ] **Step 14: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 15: Commit**

```bash
git add components/path/CustomPresetCreator.tsx
git commit -m "feat(ctx-16): unified orderedCards state + DraggableFlatList reorder UI"
```

---

## Task 3: Add edit mode to CustomPresetCreator (preset? prop)

**Files:**
- Modify: `components/path/CustomPresetCreator.tsx`

- [ ] **Step 1: Add preset? to props type**

Replace:
```typescript
export type CustomPresetCreatorProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (preset: CustomPreset) => void;
};
```
With:
```typescript
export type CustomPresetCreatorProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (preset: CustomPreset) => void;
  preset?: CustomPreset;
};
```

- [ ] **Step 2: Add preset to function destructuring**

Replace:
```typescript
export function CustomPresetCreator({ visible, onClose, onSave }: CustomPresetCreatorProps) {
```
With:
```typescript
export function CustomPresetCreator({ visible, onClose, onSave, preset }: CustomPresetCreatorProps) {
```

- [ ] **Step 3: Add initialization useEffect after the state declarations**

After `const [wordInput, setWordInput] = useState('');`, add:
```typescript
  useEffect(() => {
    if (!visible || !preset) return;
    setName(preset.label);
    setOrderedCards(
      preset.cards.map((card) =>
        card.group === 'word'
          ? { type: 'word' as const, id: card.id, word: card.letter }
          : { type: 'letter' as const, card },
      ),
    );
  }, [visible, preset]);
```

- [ ] **Step 4: Update handleSave to preserve id/createdAt in edit mode**

Replace:
```typescript
  function handleSave() {
    const newPreset: CustomPreset = {
      id: `custom-${Date.now()}`,
      label: name.trim(),
      cards: buildCards(orderedCards),
      createdAt: new Date().toISOString(),
    };
    onSave(newPreset);
    reset();
  }
```
With:
```typescript
  function handleSave() {
    const cards = buildCards(orderedCards);
    const saved: CustomPreset = preset
      ? { ...preset, label: name.trim(), cards }
      : { id: `custom-${Date.now()}`, label: name.trim(), cards, createdAt: new Date().toISOString() };
    onSave(saved);
    reset();
  }
```

- [ ] **Step 5: Update modal title**

Replace (the header title Text element):
```tsx
          <Text style={creatorStyles.headerTitle}>নতুন দ্রুত পথ</Text>
```
With:
```tsx
          <Text style={creatorStyles.headerTitle}>{preset ? 'পথ সম্পাদনা' : 'নতুন দ্রুত পথ'}</Text>
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add components/path/CustomPresetCreator.tsx
git commit -m "feat(ctx-16): edit mode in CustomPresetCreator via optional preset prop"
```

---

## Task 4: Add play button to CustomPresetCreator (onPractice? prop)

**Files:**
- Modify: `components/path/CustomPresetCreator.tsx`

- [ ] **Step 1: Add onPractice? to props type**

Replace:
```typescript
export type CustomPresetCreatorProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (preset: CustomPreset) => void;
  preset?: CustomPreset;
};
```
With:
```typescript
export type CustomPresetCreatorProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (preset: CustomPreset) => void;
  preset?: CustomPreset;
  onPractice?: (cards: LetterCard[]) => void;
};
```

- [ ] **Step 2: Add onPractice to function destructuring**

Replace:
```typescript
export function CustomPresetCreator({ visible, onClose, onSave, preset }: CustomPresetCreatorProps) {
```
With:
```typescript
export function CustomPresetCreator({ visible, onClose, onSave, preset, onPractice }: CustomPresetCreatorProps) {
```

- [ ] **Step 3: Add handlePractice function after handleSave**

After the `handleSave` function body closing brace, add:
```typescript
  function handlePractice() {
    onPractice?.(buildCards(orderedCards));
  }
```

- [ ] **Step 4: Add practice button footer before </SafeAreaView>**

The component currently ends with:
```tsx
        </ScrollView>
      </SafeAreaView>
```

Replace with:
```tsx
        </ScrollView>

        {onPractice ? (
          <View style={creatorStyles.footer}>
            <Pressable
              accessibilityLabel="অনুশীলন করুন"
              disabled={orderedCards.length === 0}
              onPress={handlePractice}
              style={({ pressed }) => [
                creatorStyles.practiceBtn,
                orderedCards.length === 0 && creatorStyles.practiceBtnDisabled,
                pressed && orderedCards.length > 0 && creatorStyles.practiceBtnPressed,
              ]}
            >
              <Text
                style={[
                  creatorStyles.practiceBtnText,
                  orderedCards.length === 0 && creatorStyles.practiceBtnTextDisabled,
                ]}
              >
                অনুশীলন করুন
              </Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
```

- [ ] **Step 5: Add footer + practice button styles**

At the end of `creatorStyles = StyleSheet.create({...})`, before closing `});`, add:
```typescript
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5ddc7',
  },
  practiceBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  practiceBtnDisabled: {
    backgroundColor: '#e5ddc7',
  },
  practiceBtnPressed: { opacity: 0.8 },
  practiceBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  practiceBtnTextDisabled: {
    color: '#9ca3af',
  },
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add components/path/CustomPresetCreator.tsx
git commit -m "feat(ctx-16): add practice button to CustomPresetCreator via onPractice prop"
```

---

## Task 5: Add onEdit prop to CustomPath

**Files:**
- Modify: `components/path/CustomPath.tsx`

- [ ] **Step 1: Add onEdit to CustomPathProps type**

Replace:
```typescript
export type CustomPathProps = {
  presets: CustomPreset[];
  progress: ProgressByCard;
  currentPresetId: string | null;
  onSelect: (presetId: string) => void;
  onCreate: () => void;
  onDelete: (presetId: string) => void;
};
```
With:
```typescript
export type CustomPathProps = {
  presets: CustomPreset[];
  progress: ProgressByCard;
  currentPresetId: string | null;
  onSelect: (presetId: string) => void;
  onCreate: () => void;
  onDelete: (presetId: string) => void;
  onEdit: (preset: CustomPreset) => void;
};
```

- [ ] **Step 2: Add onEdit to function destructuring**

Replace:
```typescript
export function CustomPath({
  presets,
  progress,
  currentPresetId,
  onSelect,
  onCreate,
  onDelete,
}: CustomPathProps) {
```
With:
```typescript
export function CustomPath({
  presets,
  progress,
  currentPresetId,
  onSelect,
  onCreate,
  onDelete,
  onEdit,
}: CustomPathProps) {
```

- [ ] **Step 3: Change outer row press from onSelect to onEdit**

The outer `<Pressable>` row (line 90–100, `onPress={() => onSelect(preset.id)}`) opens practice. Change it to open the editor:

Replace:
```tsx
              onPress={() => onSelect(preset.id)}
```
With:
```tsx
              onPress={() => onEdit(preset)}
```

**Do NOT change** the inner play button `<Pressable>` at line 151 — that one still calls `onSelect(preset.id)`.

- [ ] **Step 4: Verify TypeScript (expect one error in App.tsx — missing onEdit prop)**

```bash
npx tsc --noEmit
```

Expected: 1 error in `App.tsx` — "Property 'onEdit' is missing". This will be fixed in Task 6.

- [ ] **Step 5: Commit**

```bash
git add components/path/CustomPath.tsx
git commit -m "feat(ctx-16): add onEdit prop to CustomPath, row tap opens editor"
```

---

## Task 6: Wire everything in App.tsx

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Add editingPreset state near showCreator (~line 593)**

After `const [showCreator, setShowCreator] = useState(false);`, add:
```typescript
  const [editingPreset, setEditingPreset] = useState<CustomPreset | null>(null);
```

- [ ] **Step 2: Extract handleSelectPresetDirect from handleSelectPreset (~line 1126)**

Replace the existing `handleSelectPreset` function body with two functions:
```typescript
  function handleSelectPresetDirect(preset: PracticePreset) {
    const nextUnlockedCards = getUnlockedCards(preset.cards, progress);
    const nextCards = getEffectivePracticeCards(
      selectedPracticeList,
      preset.cards,
      progress,
      nextUnlockedCards,
    );
    setSelectedPresetId(preset.id);
    setSession(initSessionState(preset.cards, progress));
    setCurrentCardId(nextCards[0]?.id ?? preset.cards[0].id);
    setCurrentTab('practice');
    handleCloseMenu();
  }

  function handleSelectPreset(presetId: string) {
    const preset: PracticePreset =
      PRACTICE_PRESETS.find((practicePreset) => practicePreset.id === presetId) ??
      customPresets.find((p) => p.id === presetId) ??
      DEFAULT_PRESET;
    handleSelectPresetDirect(preset);
  }
```

- [ ] **Step 3: Add new handlers after handleDeleteCustomPreset (~line 1151)**

After the closing brace of `handleDeleteCustomPreset`, add:
```typescript
  function handleEditCustomPreset(preset: CustomPreset) {
    setEditingPreset(preset);
  }

  function handleUpdateCustomPreset(updated: CustomPreset) {
    setCustomPresets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditingPreset(null);
  }

  function handleCreatorSave(preset: CustomPreset) {
    if (editingPreset) {
      handleUpdateCustomPreset(preset);
    } else {
      handleSaveCustomPreset(preset);
    }
  }

  function handlePracticeFromCreator(cards: LetterCard[]) {
    const tempPreset: PracticePreset = {
      id: `temp-${Date.now()}`,
      label: 'অনুশীলন',
      cards,
    };
    setShowCreator(false);
    setEditingPreset(null);
    handleSelectPresetDirect(tempPreset);
  }
```

- [ ] **Step 4: Check that LetterCard and PracticePreset are imported**

```bash
grep -n "LetterCard\|PracticePreset" "/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training/App.tsx" | head -5
```

If `LetterCard` is not in any import, add it to the `data/banglaLetters` import line. If `PracticePreset` is not imported, add it too.

- [ ] **Step 5: Update CustomPath props (~line 1239)**

Replace:
```tsx
                  <CustomPath
                    presets={customPresets}
                    progress={progress}
                    currentPresetId={currentCustomPathPresetId}
                    onSelect={handleSelectPreset}
                    onCreate={() => setShowCreator(true)}
                    onDelete={handleDeleteCustomPreset}
                  />
```
With:
```tsx
                  <CustomPath
                    presets={customPresets}
                    progress={progress}
                    currentPresetId={currentCustomPathPresetId}
                    onSelect={handleSelectPreset}
                    onCreate={() => setShowCreator(true)}
                    onDelete={handleDeleteCustomPreset}
                    onEdit={handleEditCustomPreset}
                  />
```

- [ ] **Step 6: Update CustomPresetCreator props (~line 1827)**

Replace:
```tsx
      <CustomPresetCreator
        visible={showCreator}
        onClose={() => setShowCreator(false)}
        onSave={handleSaveCustomPreset}
      />
```
With:
```tsx
      <CustomPresetCreator
        visible={showCreator || editingPreset !== null}
        preset={editingPreset ?? undefined}
        onClose={() => { setShowCreator(false); setEditingPreset(null); }}
        onSave={handleCreatorSave}
        onPractice={handlePracticeFromCreator}
      />
```

- [ ] **Step 7: Verify TypeScript — 0 errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 8: Commit**

```bash
git add App.tsx
git commit -m "feat(ctx-16): wire editingPreset state and handlers in App.tsx"
```

---

## Task 7: Version bump + final verify

**Files:**
- Modify: `package.json`, `app.json`

- [ ] **Step 1: Invoke bornomala-version-bump skill**

Use the `bornomala-version-bump` skill to bump the version in `package.json` and `app.json`.

- [ ] **Step 2: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Start dev server and verify manually**

```bash
npx expo start --web
```

Work through all 8 verification steps from the spec:
1. **Create flow**: ⚡ tab → "+ নতুন পথ তৈরি করুন" → add 3 letters + 2 words → long-press drag to reorder → save → preset appears in list
2. **Edit flow**: tap preset row body → editor opens pre-filled (name, letters highlighted, cards in order) → change name, remove a letter → save → list shows updated preset (same id, new content)
3. **Reorder persists**: edit a preset, drag cards to new order, save, re-open edit → cards appear in the saved order
4. **Play from editor**: open creator (create or edit), add some cards → tap "অনুশীলন করুন" → practice session opens with those cards; modal closes
5. **Play from list**: tap ▶ button on a row → practice session opens (unchanged from CTX-15)
6. **Long press still deletes**: long-press a row → delete confirmation shown → on confirm, preset removed
7. **Storage survives restart**: kill and reopen the app → custom presets and their card order preserved
8. **Create flow is still clean**: "+ নতুন পথ তৈরি করুন" opens an empty creator with title "নতুন দ্রুত পথ" (not "পথ সম্পাদনা")

- [ ] **Step 4: Commit version bump**

```bash
git add package.json app.json
git commit -m "chore: bump version for CTX-16 custom path edit/reorder/play"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Edit mode — preset? prop, pre-fill from preset | Task 3 |
| Edit mode — preserve id/createdAt on save | Task 3 (handleSave) |
| Modal title "পথ সম্পাদনা" in edit mode | Task 3 |
| Row tap → onEdit, play button → onSelect | Task 5 |
| editingPreset state + handleEditCustomPreset | Task 6 |
| handleUpdateCustomPreset (map by id) | Task 6 |
| Unified orderedCards state | Task 2 |
| Letter grid toggle → append/remove from orderedCards | Task 2 |
| Word add → append to orderedCards | Task 2 |
| DraggableFlatList reorder UI with drag handle | Task 2 |
| Save builds cards in list order | Task 2 (buildCards) |
| GestureHandlerRootView at root | Task 1 |
| onPractice? prop + play button | Task 4 |
| handlePracticeFromCreator → temp preset → practice tab | Task 6 |
