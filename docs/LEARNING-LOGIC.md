# Learning Logic — Bornomala

**Last updated**: 2026-05-04

---

## Teaching Model

Bornomala currently uses a teacher-assisted recall model:

1. The app shows only the Bangla glyph.
2. The learner answers out loud or points/identifies.
3. A human teacher decides whether the answer was correct.
4. The app records the outcome and selects the next item.

This keeps the learner focused on recognition and avoids adding audio recognition, typing, or tracing before the core learning loop is proven.

---

## Card Model

Each card represents one Bangla learning item.

| Field | Meaning |
|---|---|
| `id` | Stable identifier, e.g. `vowel-01` |
| `letter` | Bangla glyph shown on the card |
| `group` | `vowel`, `vowelSign`, or `consonant` |
| `order` | Default teaching order |

Current decks live in `data/banglaLetters.ts`:

| Export | Purpose |
|---|---|
| `VOWEL_CARDS` | Bangla independent vowels |
| `VOWEL_SIGN_CARDS` | Bangla vowel signs displayed with a dotted circle prefix in the UI |
| `CONSONANT_CARDS` | Bangla consonants |
| `PRACTICE_PRESETS` | Teacher-facing practice groups |

---

## Progress Model

Each card tracks:

| Field | Meaning |
|---|---|
| `correctCount` | Total right answers |
| `wrongCount` | Total wrong answers |
| `seenCount` | Total attempts |
| `mastered` | True when `correctCount >= 10` |
| `lastSeenAt` | ISO timestamp from the most recent attempt |

Current progress is stored locally with `AsyncStorage`.

---

## Unlock Logic

The current scheduler unlocks content gradually inside the selected preset:

1. Start with the first 5 cards in the active preset.
2. If all unlocked cards are mastered, unlock 2 more.
3. Repeat until the full preset is unlocked.

This makes the first practice session less intimidating while still letting a strong learner move forward.

---

## Next Card Logic

After each grade, the app chooses from the active practice set:

1. Prefer unmastered cards.
2. Prioritize cards with the most remaining correct answers needed.
3. If tied, prioritize cards with more wrong answers.
4. If tied, prioritize cards seen fewer times.
5. If tied, use the deck order.
6. Pick randomly from the top 3 candidates, avoiding the previous card when possible.

This is not full spaced repetition yet. It is a simple practice scheduler designed for the MVP.

## Practice Preset Logic

The teacher can choose a preset without logging in. The selected preset controls:

- the cards shown in the practice screen
- the cards shown in the letters grid
- the total progress denominator
- the unlock sequence for that practice group

The UI also supports filters for unlocked, all, needs-work, and mastered cards within the selected preset. If a filter would produce no cards for practice, the app falls back to unlocked cards so the session can continue.

---

## Future Learning Extensions

- Teacher-selected custom letter sets
- Practical words built from known letters
- Per-session history
- Daily review scheduling
- Per-learner progress
- Configurable mastery target
