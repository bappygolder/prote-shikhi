# Bornomala — Persist Completion + Granular Reset

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Medium
- Reason: Localised UI + state changes in a single `App.tsx`, no architectural shift, no new libraries.

## Context

Today the menu's only progress action is **আবার শুরু** ([App.tsx:1077-1086](../../App.tsx#L1077-L1086)) which calls [`handleReset()` (App.tsx:551-562)](../../App.tsx#L551-L562) and **wipes every letter's progress and clears `AsyncStorage`**. Users who finish **স্বর ১** but want to restart **ব্যঞ্জন ক** have no option except nuking everything.

We want three changes:

1. **Visible completion state** — a green ✓ next to any preset whose every card is mastered, so users can see at a glance which lists they've finished.
2. **Granular reset** at three scopes — single letter, single list, whole app — each behind a confirmation.
3. **Strong local memory** — the existing `AsyncStorage` flow works but is silent on parse failures and writes on every keystroke. Tighten it so progress survives reliably until the user explicitly resets or uninstalls.

Persistence already works (key `bornomala.progress.v1`, [App.tsx:30](../../App.tsx#L30); load [App.tsx:285-308](../../App.tsx#L285-L308); save [App.tsx:310-318](../../App.tsx#L310-L318)) — this plan hardens it rather than rewriting it.

## Design Decisions (confirmed)

- **Reset a letter** → long-press a letter tile in the **অক্ষর** (Letters) tab grid → confirm dialog.
- **Reset a list** → small `↺` icon on each preset row inside the menu's existing **প্রিসেট** collapsible → confirm dialog.
- **Reset the whole app** → keep the existing **আবার শুরু** button at the bottom of the menu → add confirm dialog (currently has none).
- All confirmations use React Native's built-in `Alert.alert` (no new dependency).
- A preset is "complete" when **every card** in `preset.cards` has `mastered: true`. Reuse the existing `getProgressForCard` helper — no new mastery rules.

## Implementation

### 1. New helpers in `lib/learning.ts`

Add two pure functions next to the existing helpers:

```ts
export function isPresetComplete(
  cards: LetterCard[],
  progress: ProgressByCard,
): boolean {
  return cards.every((card) => getProgressForCard(progress, card.id).mastered);
}

export function resetCards(
  progress: ProgressByCard,
  cardIds: string[],
): ProgressByCard {
  if (cardIds.length === 0) return progress;
  const next = { ...progress };
  for (const id of cardIds) delete next[id];
  return next;
}
```

`resetCards` powers both single-letter and full-list resets. Keeps `App.tsx` mutation-free.

### 2. Three reset handlers in `App.tsx`

Add alongside [`handleReset()` (App.tsx:551-562)](../../App.tsx#L551-L562):

```ts
function handleResetLetter(card: LetterCard) {
  Alert.alert(
    'অক্ষর রিসেট',
    `"${card.letter}"-এর অগ্রগতি মুছে ফেলবেন?`,
    [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'রিসেট',
        style: 'destructive',
        onPress: () => setProgress((current) => resetCards(current, [card.id])),
      },
    ],
  );
}

function handleResetPreset(preset: PracticePreset) {
  Alert.alert(
    'তালিকা রিসেট',
    `"${preset.label}"-এর সব অক্ষরের অগ্রগতি মুছে ফেলবেন?`,
    [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'রিসেট',
        style: 'destructive',
        onPress: () =>
          setProgress((current) =>
            resetCards(current, preset.cards.map((card) => card.id)),
          ),
      },
    ],
  );
}
```

Wrap the existing `handleReset` body in an `Alert.alert` confirmation with the same Cancel/Reset shape but message "পুরো অ্যাপ রিসেট করবেন? সব অগ্রগতি মুছে যাবে।"

Granular resets only update `progress`; they don't touch `currentCardId`, `selectedPresetId`, or `sessionStats`. The existing save effect at [App.tsx:310-318](../../App.tsx#L310-L318) persists the new `progress` automatically.

> Edge case: if the currently shown card is the one being reset, that's fine — the trainer will just show 0/10 again, which is the intended UX.

Add `Alert` to the React Native imports at [App.tsx:4-14](../../App.tsx#L4-L14).

### 3. Green tick + reset icon on preset rows

Modify the preset row at [App.tsx:1036-1075](../../App.tsx#L1036-L1075). Inside the `.map`, after computing `presetMasteredCount`, also compute:

```ts
const isComplete = isPresetComplete(preset.cards, progress);
```

Restructure the row to: `[label] [count] [✓ if complete] [↺ reset button]`. The `↺` is a `Pressable` with `accessibilityLabel="তালিকা রিসেট"` that calls `handleResetPreset(preset)` and **stops propagation** — wrap the row's `onPress={() => handleSelectPreset(preset.id)}` so the tap on `↺` doesn't also switch presets. Easiest pattern: nest the `↺` Pressable inside the row Pressable; React Native auto-stops propagation when an inner Pressable handles the touch.

Add styles `presetCompleteTick` (green text, `colors.successBorder`) and `presetResetButton` (small circular pressable, muted background) to the existing `StyleSheet.create` block.

### 4. Long-press reset in the Letters tab

The Letters tab is rendered in App.tsx — find the grid where `LETTER_CARDS` are mapped to tiles (search "letters" / "currentTab === 'letters'" in App.tsx; this plan does not yet have its line range — locate during implementation). Each tile is currently a `Pressable` calling `handleChooseLetter(card)` — add `onLongPress={() => handleResetLetter(card)}` and `delayLongPress={400}`. No visual change to the tile; long-press is a hidden affordance with the confirmation dialog providing all the feedback.

### 5. Strong local memory — three small hardening changes

**a. Parse-safe loader.** Replace the `JSON.parse(...)` at [App.tsx:294](../../App.tsx#L294) with a try/catch that falls back to `{}` and logs a warning. As-is, a single corrupt key drops the user back to zero silently — but it also gets re-written immediately by the save effect, masking the loss. A try/catch makes this debuggable.

**b. Shape validation.** After parse, guard with a quick `typeof parsed === 'object' && parsed !== null` check and discard primitives/arrays. Keep `bornomala.progress.v1` as the key so existing users don't lose data.

**c. Debounced writes.** Wrap the save effect at [App.tsx:310-318](../../App.tsx#L310-L318) so it writes at most once every ~300ms (a leading-edge `setTimeout` cleared on cleanup). Each grade tap currently triggers a write; debouncing avoids redundant writes when the user grades quickly. Not a correctness issue today — this is just defense in depth for the "strong local memory" goal.

We deliberately do **not** add migrations, schema versioning machinery, or an extra mirror copy. The current shape is stable, the key is already versioned (`v1`), and the data is small (<5 KB even fully populated).

## Files to Modify

| File | Change |
|---|---|
| `lib/learning.ts` | Add `isPresetComplete` + `resetCards` helpers |
| `App.tsx` | Add `handleResetLetter`, `handleResetPreset`; wrap `handleReset` in Alert; add `↺` + `✓` to preset rows; add `onLongPress` on Letters-tab tiles; harden load + save |

No new files. No new dependencies. No data shape changes.

## Verification

1. Start the dev server: `npx expo start` from project root.
2. Open the app on iOS simulator (or device via Expo Go).
3. **Completion tick**:
   - Grade enough correct answers to fully master **স্বর ১** (6 letters × 10 correct).
   - Open menu → expand **প্রিসেট** → **স্বর ১** row should show a green ✓.
4. **Reset a list**:
   - Tap the ↺ next to **স্বর ১** → confirm dialog appears → tap **রিসেট**.
   - The ✓ disappears, count returns to 0/6, and the trainer for **স্বর ১** shows fresh state.
   - Tap ↺ then **বাতিল** — nothing changes.
5. **Reset a single letter**:
   - In **অক্ষর** tab, long-press **অ** → confirm → counter for **অ** drops to 0/10.
   - Verify other letters in **স্বর ১** retain their progress.
6. **Reset whole app**:
   - Tap **আবার শুরু** → confirm dialog → tap **রিসেট**.
   - All progress wipes, app returns to default preset.
   - Tap **আবার শুরু** then **বাতিল** — nothing changes.
7. **Persistence**:
   - Master a few letters, force-quit Expo Go, relaunch the app — progress should still be there.
   - In simulator: shake → reload → progress survives reload.
8. **Parse-safe loader** (optional):
   - In Expo dev tools, inject a corrupt value: `await AsyncStorage.setItem('bornomala.progress.v1', 'not-json')` then reload. App should boot with empty progress instead of crashing, and a warning appears in the JS console.

## Notes for the Executor

- `~/.claude/plans/take-a-look-at-pure-duckling.md` is the auto-generated plan-mode stub — delete it after this plan is approved (per global CLAUDE.md rule 9). Subsequent plan edits go to **this** file.
- Keep edits to `App.tsx` localised — the file is already large; resist the urge to refactor unrelated sections.
