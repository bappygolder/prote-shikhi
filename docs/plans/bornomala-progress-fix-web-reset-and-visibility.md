# Bornomala — Fix web reset interactions + ↺ visibility

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Low
- Reason: Single file, three small targeted changes, no new logic.

## Context

After shipping the granular-reset feature ([previous plan](./bornomala-progress-persist-completion-and-granular-reset.md)), browser testing revealed two issues:

1. **All reset buttons are dead in the browser.** `Alert.alert` from `react-native` is a no-op in `react-native-web` — taps fire the handler, the handler calls `Alert.alert`, the alert silently never appears, so the user-confirmation step never resolves and no reset ever runs. On a real Android/iOS device this works correctly because `Alert.alert` is implemented natively. We need a platform-aware shim so web testing actually exercises the reset paths.

2. **↺ only visible on the active row.** The reset button uses a light-gray fill (`#f3f4f6`) which contrasts nicely against the active row's dark background but vanishes against the inactive rows' white background. The button renders, it just isn't visible.

Today is the user's primary test environment is a browser (`npm run web`), and the eventual ship target is Android. Both targets need to work — the shim handles web, native `Alert.alert` continues to handle Android/iOS.

## Implementation

All edits in [App.tsx](../../App.tsx).

### 1. Add a `Platform`-aware confirm helper

Add `Platform` to the existing `react-native` import.

Add a small helper near the other top-level utilities (e.g. just below `toBanglaNumber` around [App.tsx:78](../../App.tsx#L78)):

```ts
function confirmDestructiveAction(
  title: string,
  message: string,
  onConfirm: () => void,
) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'বাতিল', style: 'cancel' },
    { text: 'রিসেট', style: 'destructive', onPress: onConfirm },
  ]);
}
```

### 2. Route all three handlers through the helper

Replace the bodies of [`handleReset`](../../App.tsx#L551), [`handleResetLetter`](../../App.tsx#L578), and [`handleResetPreset`](../../App.tsx#L594) with calls to `confirmDestructiveAction`. The "do the reset" closure stays the same; only the dialog dispatch changes.

Example for `handleResetLetter`:

```ts
function handleResetLetter(card: LetterCard) {
  confirmDestructiveAction(
    'অক্ষর রিসেট',
    `"${card.letter}"-এর অগ্রগতি মুছে ফেলবেন?`,
    () => setProgress((current) => resetCards(current, [card.id])),
  );
}
```

Same shape for the other two. The whole-app reset's body (the multi-setter + `AsyncStorage.removeItem`) goes inside the closure unchanged.

### 3. Make ↺ visible on white rows

Update `presetResetButton` style to add a 1 px border so the circle is outlined regardless of row background:

```ts
presetResetButton: {
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f3f4f6',
  borderWidth: 1,
  borderColor: '#d1d5db',
},
```

Optional but worth it: bump `presetResetIcon` `fontWeight` from `'800'` to `'900'` and color from `#6b7280` to `#374151` so the glyph carries more weight.

### 4. Bump APP_VERSION

Change [`APP_VERSION`](../../App.tsx#L33) from `'v1.1.0'` to `'v1.1.1'`. Update `LAST_UPDATED` to today's date. This gives the user a fast visual signal that the new build is loaded — if the footer still says `v1.1.0` after refresh, Metro hasn't picked up the change.

## Files to Modify

| File | Change |
|---|---|
| `App.tsx` | Import `Platform`; add `confirmDestructiveAction`; refactor 3 reset handlers; outline ↺; bump version |

No new files. No new dependencies.

## Verification

1. After save, watch the Metro terminal for the `Building...` line. If you don't see it, save again.
2. Hard-refresh the browser (`Cmd+Shift+R` on Mac).
3. Open menu — confirm footer shows **`v1.1.1`** (proves the new build is loaded; if still `v1.1.0`, Metro didn't reload — restart `npm run web`).
4. **Reset whole app**: tap **আবার শুরু** → browser confirm dialog appears → OK runs the reset, Cancel does nothing. Verify the progress is wiped.
5. **Reset a list**: expand **প্রিসেট**. Every row (active and inactive) should now have a clearly outlined ↺. Tap one → confirm → that list resets without switching active preset.
6. **Reset a letter**: bottom-tab **অক্ষর** → mouse-down-and-hold a tile for ~½ second → confirm → that tile drops to 0%.
7. **Negative path**: tap a reset button, then **Cancel** in the confirm — nothing should change.
8. **Native parity** (later, when testing on Android via Expo Go): the same buttons should show the proper native `Alert.alert` with red destructive **রিসেট** and grey **বাতিল** buttons.

If any of steps 4–6 still do nothing after `v1.1.1` is showing, the issue is not Alert-related — capture the browser console (Cmd+Opt+J) and we'll dig.
