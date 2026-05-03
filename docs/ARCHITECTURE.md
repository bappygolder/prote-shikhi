# Architecture — Bornomala

**Last updated**: 2026-05-04

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo React Native |
| Language | TypeScript |
| Styling | React Native StyleSheet |
| State | React state first; add Zustand only when shared state grows |
| Persistence | Local device storage in MVP |
| Database | Deferred |
| Auth | Deferred |
| Deployment | Expo for mobile preview/builds |

---

## App Structure

```
App.tsx             ← first flashcard trainer screen
```

---

## Key Directories

```
├── App.tsx           ← Current MVP screen before routing is needed
├── components/       ← Shared UI components
├── data/             ← Letter sets and learning content
├── lib/              ← Progress logic, scheduling, helpers
├── docs/             ← Project documentation
└── temp/             ← Scratch files, gitignored
```

---

## Data Flow

1. Teacher sees one Bangla letter card.
2. Learner answers verbally.
3. Teacher taps Right or Wrong.
4. App updates the letter's local stats.
5. Scheduler chooses the next card, favoring letters below mastery.

---

## Key Decisions

<!-- Record architectural decisions here as they are made -->

| Decision | Rationale |
|---|---|
| Expo React Native | Fastest path to Android/iOS preview and mobile-first iteration. |
| Bangla-only card face | Keeps learner attention on recognition, without helper text. |
| Human-assisted grading | No audio/AI recognition needed for MVP; a teacher marks Right/Wrong. |
| Vowels-first starter deck | Simple first learning set while the teaching flow is validated. |
| 10 correct responses for mastery | Simple fixed MVP rule; make configurable later if needed. |
