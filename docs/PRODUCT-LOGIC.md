# Product Logic — Bornomala

**Last updated**: 2026-05-04

---

## Product Goal

Bornomala is a mobile-first Bangla literacy trainer for adult learners. The first useful version should help a teacher sit beside a student and practice recognition quickly, without setup friction.

The app is not trying to replace the teacher in the MVP. It gives the teacher a clean card flow, progress memory, and enough structure to make practice repeatable.

---

## Primary Users

| User | Need | Current support |
|---|---|---|
| Adult learner | See one Bangla item clearly and answer verbally | Bangla-only flashcard |
| Teacher/helper | Mark right or wrong quickly | Two grading buttons and preset selection |
| Returning learner | Continue from prior progress | Local AsyncStorage progress |
| First-time visitor | Understand what to do | Not built yet |

---

## Current MVP Flow

1. Open the app.
2. The learner sees one Bangla letter or vowel sign from the selected preset.
3. The learner says or identifies the letter.
4. The teacher taps `ঠিক` or `ভুল`.
5. The app updates card progress and chooses the next card.
6. Progress is saved locally on the device.

---

## Business Rules

| Rule | Current value | Why |
|---|---:|---|
| Starter content | Letter/sign presets | Lets a teacher choose a small useful set |
| Mastery target | 10 correct answers | Simple visible goal |
| Initial unlock count | 5 letters | Avoid overwhelming the learner |
| Unlock step | 2 letters | Gradual expansion after mastery |
| Grading modes | Right / Wrong | Keeps human-assisted MVP fast |
| Persistence | Local device storage | No login required for earliest usefulness |

---

## Explicit Deferrals

- Audio pronunciation
- Letter tracing
- Unsure/skip grading
- Accounts and cloud sync
- Multi-learner profiles
- Remote database
- Detailed per-attempt analytics

These are not bad ideas. They are held back so the app can become useful to a teacher and student quickly.
