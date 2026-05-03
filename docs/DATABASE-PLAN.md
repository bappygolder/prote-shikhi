# Database Plan — Bornomala

**Last updated**: 2026-05-04

---

## Current State

The MVP has no remote database. Progress is saved locally on the device with `AsyncStorage`.

This is correct for the earliest no-login teaching flow. A database becomes useful once users need cross-device progress, saved learner profiles, teacher history, or accounts.

---

## Recommended Direction

Use a hosted Postgres-backed service when accounts are introduced. Supabase is the most likely fit because it gives authentication, Postgres, row-level security, and a fast path for a small Expo app.

Do not make the first useful teacher mode depend on login. The no-login flow should remain available.

---

## Core Tables

| Table | Purpose |
|---|---|
| `profiles` | One row per account |
| `learners` | Learner profiles owned by a profile or local/imported later |
| `cards` | Canonical learning items: letters, signs, words |
| `decks` | Named groups of cards |
| `deck_cards` | Card ordering inside decks |
| `learner_progress` | Rollup progress per learner/card |
| `attempts` | Individual right/wrong practice attempts |
| `teacher_sessions` | Optional grouped practice sessions |

---

## Account Rules

- Anonymous/no-login practice remains available.
- Logged-in users can save and sync progress.
- A teacher account can create learners and practice sessions.
- A learner can exist locally first, then be linked to an account later.
- Data export/import should stay possible so local progress is not trapped.

---

## Migration Strategy

1. Keep the current local progress model.
2. Introduce a storage adapter so app code does not care whether progress is local or remote.
3. Add account auth.
4. Add remote sync for progress rollups.
5. Add per-attempt history after the core sync is stable.

---

## Open Decisions

| Decision | Default recommendation |
|---|---|
| Supabase vs Firebase vs custom backend | Supabase |
| Require login before practice? | No |
| Store per-attempt history immediately? | Not until accounts are working |
| Multiple learners per teacher? | Yes, but after no-login teacher mode |

