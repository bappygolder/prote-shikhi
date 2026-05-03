# UX-02 — Landing Page

**Status**: ⏳ Pending  
**Author tool**: Codex CLI (GPT-5)  
**Created**: 2026-05-04  
**Last updated**: 2026-05-04  
**$ value**: 4000  
**Urgency**: 3  
**Score**: 5.0

## What this context window does

Add a simple public landing page or intro surface that explains the app and routes users into the trainer, without weakening the fast no-login practice flow.

## Prerequisites

- App name settled.
- Trainer flow useful enough to show publicly.
- Deployment path known.

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Recommended model

`gpt-5.1`
**Thinking**: On — may require routing/navigation decisions.

---

## Prompt to paste

```markdown
## Before starting

git pull origin main
git log --oneline -5

**Read these files first:**
- `App.tsx`
- `docs/DESIGN-DIRECTION.md`
- `docs/PRODUCT-LOGIC.md`
- `docs/ROADMAP.md`

---

## Task 1 — Choose the smallest navigation approach

If routing is still absent, choose the simplest approach:

- intro/landing state inside `App.tsx`, or
- add a lightweight navigation/routing structure only if clearly worth it.

Do not overbuild.

## Task 2 — Build landing experience

The landing page should:

- show the app name clearly in the first viewport
- explain that it is for Bangla reading practice with a teacher/helper
- offer a clear `Start practice` action
- mention no login required for practice
- keep a hint of the practice flow visible or immediately reachable

Use visual assets only if they genuinely help. Do not create a decorative marketing page that delays practice.

## Task 3 — Preserve direct practice path

Returning users should be able to get to practice quickly.

## After all tasks

1. Run `npm run typecheck`.
2. Inspect mobile and desktop web layouts.
3. Commit:
   `git add App.tsx docs`
   `git commit -m "feat: add public landing page"`

---

## Verification checklist

- [ ] Landing page has clear brand and start action: [PASS / FAIL]
- [ ] Practice flow remains fast: [PASS / FAIL]
- [ ] Mobile text does not overlap: [PASS / FAIL]
- [ ] `npm run typecheck` — zero errors: [PASS / FAIL]

## What NOT to do

- Do NOT make a bloated marketing page.
- Do NOT require account creation to start.

## Next step

Run `docs/prompts/build/CTX-03-database-foundation.md`.
```

