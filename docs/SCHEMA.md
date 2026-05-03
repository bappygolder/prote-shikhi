# Schema — Bornomala

**Last updated**: 2026-05-04

---

## MVP Data Model

No remote database is planned for the first MVP. Progress can start in app memory and then move to local device storage.

### LetterCard

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable letter id, e.g. `vowel-o` |
| `letter` | `string` | Bangla glyph shown on card |
| `group` | `vowel` \| `consonant` | Starter grouping |
| `order` | `number` | Default learning order |

### LetterProgress

| Field | Type | Notes |
|---|---|---|
| `cardId` | `string` | References `LetterCard.id` |
| `correctCount` | `number` | Total correct responses |
| `wrongCount` | `number` | Total wrong responses |
| `seenCount` | `number` | Total attempts |
| `mastered` | `boolean` | True when `correctCount >= 10` |
| `lastSeenAt` | `string` | ISO timestamp when persistence is added |

### SessionStats

| Field | Type | Notes |
|---|---|---|
| `attempts` | `number` | Cards marked this session |
| `correct` | `number` | Right taps this session |
| `wrong` | `number` | Wrong taps this session |

---

## Later Database Direction

If accounts/cloud sync are added, mirror the local model into learner, session, card, and attempt tables. Keep per-attempt history so future analytics can answer which cards were seen on which days and how the learner performed.

---

## Explicitly Deferred

- Supabase or any remote database
- Authentication
- Multi-learner profiles
- Per-attempt history beyond the first local MVP
