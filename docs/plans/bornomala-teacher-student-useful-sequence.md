# Bornomala — Teacher/Student Useful Sequence

**Last updated**: 2026-05-04

---

## Goal

Make the app useful to a teacher and student as soon as possible, then layer deployment, branding, accounts, and database support in an order that avoids blocking the no-login teaching flow.

---

## Recommended Sequence

| Rank | Prompt | Why now |
|---:|---|---|
| 1 | `ADMIN-01-rename-to-porte-shikhi.md` | Naming should settle before URLs, landing copy, database names, and screenshots. |
| 2 | `ADMIN-02-document-core-logic.md` | Keeps product, learning, design, and database assumptions explicit before the app grows. |
| 3 | `CTX-02-teacher-quick-teach-mode.md` | Highest usefulness: lets a teacher choose what to practice without login. |
| 4 | `UX-01-help-info-overlay.md` | New teachers need a small explanation without cluttering the practice screen. |
| 5 | `DEPLOY-01-vercel-olab-subdomain.md` | Gets a shareable web URL once the no-login teaching flow is useful. |
| 6 | `UX-02-landing-page.md` | Adds public explanation and entry points after the practice flow exists. |
| 7 | `CTX-03-database-foundation.md` | Prepares persistence architecture without forcing login too early. |
| 8 | `CTX-04-user-accounts-progress-sync.md` | Lets users save progress across devices after local/no-login flow is stable. |

---

## Why This Order

The fastest value is not accounts or a landing page. It is a teacher being able to open the app, choose a small useful set, and practice with a student immediately.

Brand and documentation come early because they affect every later prompt. Database and accounts come later because they add risk and friction; they should support the teaching flow, not define it.

---

## Design Note

The current design is directionally right for the trainer screen. It is sparse, flashcard-like, and learner-focused. The landing page can carry more brand and explanation, but the practice screen should stay quiet.

