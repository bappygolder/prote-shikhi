# CTX-13 — Sound Hint Button (Auto-Fail)

**Status**: ⏳ Pending
**Created**: 2026-05-11
**Depends on**: CTX-12 ✅
**Touches**: `App.tsx` (learn card UI + grading buttons + handleGrade state)
**Risk**: Low (additive UI change — no algorithm or data model changes)
**Parallel-safe with**: any non-App.tsx prompt

---

## What this context window does

Adds a **sound hint button** (🔊) to the Learn tab card. When tapped:

1. `expo-speech` speaks the Bangla letter aloud.
2. The **ঠিক (correct) button is immediately disabled** for this card — the learner used a hint.
3. The learner must press **ভুল (wrong)** to advance to the next card.
4. The disabled state **resets automatically** when the next card loads.

This preserves grading integrity — you cannot hear the answer and then claim a correct score.

No changes to the learning algorithm, grading logic, or data model. Pure UI state + TTS.

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Recommended model

Sonnet 4.6 (`claude-sonnet-4-6`)

---

## Prompt to paste

```markdown
## Before starting

Read these files first:
- `App.tsx` lines 795–942: `handleGrade` function — understand how grading flows
- `App.tsx` lines 1223–1247: the `<View style={styles.actions}>` grading button block — this is where the sound button and disabled state live
- `data/banglaLetters.ts`: understand what `currentCard` looks like — specifically what text field to speak

---

## Task 1 — Install expo-speech (if not present)

Check if `expo-speech` is already in `package.json`. If not:

```bash
npx expo install expo-speech
```

Verify `import * as Speech from 'expo-speech'` compiles without error before continuing.

---

## Task 2 — Add `hintUsed` state to App.tsx

Near the other card-level state variables in `App.tsx`, add:

```tsx
const [hintUsed, setHintUsed] = useState(false);
```

Reset it whenever the current card changes. Find where `currentCardId` is set (in `handleGrade` after `chooseNextCard`) and add a `setHintUsed(false)` call immediately after each `setCurrentCardId(...)` call.

There will be two or three `setCurrentCardId` call sites — reset `hintUsed` at all of them.

---

## Task 3 — Add the sound button to the learn card UI

In the learn card section of `App.tsx`, above the `<View style={styles.actions}>` grading row (around line 1220), add a centred sound button:

```tsx
<Pressable
  accessibilityLabel="শব্দ শোনো"
  onPress={() => {
    Speech.speak(currentCard.letter, { language: 'bn' });
    setHintUsed(true);
  }}
  style={({ pressed }) => [
    styles.soundButton,
    pressed && styles.buttonPressed,
  ]}
>
  <Text style={styles.soundButtonIcon}>🔊</Text>
</Pressable>
```

Where `currentCard.letter` is the Bangla letter string for the current card — verify the correct field name from `data/banglaLetters.ts`.

Add to `StyleSheet.create(...)`:

```tsx
soundButton: {
  alignSelf: 'center',
  marginBottom: 12,
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 24,
  backgroundColor: 'rgba(0,0,0,0.06)',
},
soundButtonIcon: {
  fontSize: 28,
},
```

---

## Task 4 — Disable the ঠিক button when `hintUsed` is true

In the `<Pressable>` for the ঠিক (correct) button (around line 1240):

- Add `disabled={hintUsed}` prop.
- Apply a disabled style when `hintUsed`:

```tsx
<Pressable
  accessibilityLabel="ঠিক হয়েছে"
  onPress={() => handleGrade(true)}
  disabled={hintUsed}
  style={({ pressed }) => [
    styles.actionButton,
    styles.rightButton,
    pressed && !hintUsed && styles.buttonPressed,
    hintUsed && styles.disabledButton,
  ]}
>
  <Text style={[styles.actionText, styles.rightText, hintUsed && styles.disabledText]}>
    ঠিক
  </Text>
</Pressable>
```

Add to `StyleSheet.create(...)`:

```tsx
disabledButton: {
  opacity: 0.35,
},
disabledText: {
  color: '#999',
},
```

The ভুল button requires **no changes** — it always works normally.

---

## Task 5 — Verify reset on card change

Confirm that after pressing ভুল (which calls `handleGrade(false)`), the next card renders with ঠিক fully enabled again. Trace through the code:

- `handleGrade(false)` → `chooseNextCard()` → `setCurrentCardId(chosen.id)` → `setHintUsed(false)` ← your Task 2 reset.

If any `setCurrentCardId` call sites were missed in Task 2, the button may stay disabled across cards — fix them.

---

## Verification (run before declaring done)

1. `npx tsc --noEmit` — zero errors.
2. `npm run web`:
   - Learn tab shows 🔊 button above the grading row.
   - Tap 🔊 → letter is spoken aloud AND ঠিক button goes grey/disabled.
   - Tap ভুল → advances to next card; ঠিক is fully enabled on the new card.
   - If you do NOT tap 🔊, ঠিক works as normal.
   - Hard-refresh the browser — no unexpected `hintUsed` state persists.

## Out of scope

- Speaking the letter name or pronunciation description (just the letter glyph for now).
- Audio feedback on correct/wrong grading.
- Haptics.
- Any changes to `lib/learning.ts` — no algorithm changes.

## Stop conditions

- If `expo-speech` has no `'bn'` language support on web, fall back to `language: 'bn-BD'` then `'bn-IN'`. If none work on web, speak without a language param and note the limitation in the handoff.
- If the `currentCard` text field name differs from `letter`, check `data/banglaLetters.ts` and use the correct field.

---

## Handoff

When complete, update this file's **Status** to ✅ and append:
- Branch + commit hash
- Which `setCurrentCardId` call sites were patched with `setHintUsed(false)`
- Language code used for `expo-speech` on web
- Confirm `npx tsc --noEmit` passes
```
