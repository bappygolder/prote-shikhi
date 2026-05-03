# Bornomala — Menu: show letter ranges instead of starting letters

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Low
- Reason: Single-file UI change, one helper + one JSX swap, no state or data shape changes.

## Context

The preset menu currently shows abbreviated section titles like `ব্যঞ্জন ক`, `ব্যঞ্জন চ`, `ব্যঞ্জন ট`… which only hint at the *starting* letter of each group. A learner can't tell at a glance which letters they'll actually practice in a row.

The fix: show the **first → last** letter of each preset as the row title, e.g. `ক → ঙ`, `চ → ঞ`, `০ → ৯`. The data already supports this — every preset is `cards: LetterCard[]`, so first/last are `cards[0]` and `cards[cards.length - 1]`.

## Decisions (locked with user)

- **Range replaces the label** — no subtitle, no second line. Keeps rows compact at the existing 42-px height.
- **Kar signs use the `◌` prefix** — `কার চিহ্ন` becomes `◌া → ◌ৌ` so the marks are visible standalone. Reuses the existing `getDisplayLetter` helper at [App.tsx:88-90](App.tsx#L88-L90).
- **Numbers** display bare digits — `০ → ৯`.
- **Accessibility label** keeps using the original `preset.label` so screen readers still announce "ব্যঞ্জন ক প্রিসেট শুরু করুন" — only the visible title changes.

## Resulting menu

| Preset id | Old title | New title |
|---|---|---|
| `vowels-early` | স্বর ১ | অ → ঊ |
| `vowels-late` | স্বর ২ | ঋ → ঔ |
| `vowel-signs` | কার চিহ্ন | ◌া → ◌ৌ |
| `consonants-ka` | ব্যঞ্জন ক | ক → ঙ |
| `consonants-cha` | ব্যঞ্জন চ | চ → ঞ |
| `consonants-ta-hard` | ব্যঞ্জন ট | ট → ণ |
| `consonants-ta-soft` | ব্যঞ্জন ত | ত → ন |
| `consonants-pa` | ব্যঞ্জন প | প → ম |
| `consonants-last` | শেষ ব্যঞ্জন | য → হ |
| `numbers` | সংখ্যা | ০ → ৯ |

## Implementation

### File: [App.tsx](App.tsx)

**1. Add a helper next to the existing `getDisplayLetter`** (just below [App.tsx:90](App.tsx#L90)):

```ts
function getPresetRangeLabel(preset: PracticePreset): string {
  const { cards } = preset;
  if (cards.length === 0) return '';
  const first = getDisplayLetter(cards[0]);
  const last = getDisplayLetter(cards[cards.length - 1]);
  return cards.length === 1 ? first : `${first} → ${last}`;
}
```

- Reuses `getDisplayLetter` — vowel signs get the `◌` prefix automatically.
- Defensive single-card branch in case future presets are 1-item.
- `PracticePreset` is already exported from [data/banglaLetters.ts:10-14](data/banglaLetters.ts#L10-L14); add to the existing import if not already imported.

**2. Swap the title in the preset row** — [App.tsx:1046](App.tsx#L1046):

```tsx
// before
{preset.label}

// after
{getPresetRangeLabel(preset)}
```

Leave the `accessibilityLabel` on the `Pressable` ([App.tsx:1031](App.tsx#L1031)) unchanged — it still uses `preset.label`.

**3. No changes needed to:**
- Styles ([App.tsx:1697-1731](App.tsx#L1697-L1731)) — `presetLabel` stays the same; range strings are short enough to fit comfortably.
- Counts ([App.tsx:1054-1055](App.tsx#L1054-L1055)) — already correct (`mastered/total` in Bangla numerals).
- The preset definitions in [data/banglaLetters.ts](data/banglaLetters.ts) — data shape is reused as-is.
- The active/pressed states.

## Verification

Manual smoke test with `npx expo start`:

1. Open the side menu → expand the **প্রিসেট** collapsible.
2. Confirm each row reads exactly as in the table above.
3. Verify `কার চিহ্ন` row renders as `◌া → ◌ৌ` with the dotted-circle visible (RN renders Unicode `◌` U+25CC reliably).
4. Tap a preset → the deck loads correctly (no regression — title change is cosmetic only).
5. Mastered count `০/X` next to each row still updates after a correct answer.
6. With VoiceOver / TalkBack on, tapping a row still announces `"<original Bangla label> প্রিসেট শুরু করুন"`.
7. Active row (selected preset) still gets the dark background + yellow count color.

## Critical files

- [App.tsx](App.tsx) — only file modified (helper + one JSX line).
- [data/banglaLetters.ts](data/banglaLetters.ts) — read-only reference, no edits.

## Out of scope

- Renaming or restructuring presets in `PRACTICE_PRESETS`.
- Translating arrow `→` (it's language-neutral).
- Changing the "প্রিসেট" header or count format.
- Audio / pronunciation / tracing — explicitly deferred per project CLAUDE.md.
