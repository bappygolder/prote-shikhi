# CTX-02 — Teacher Quick Teach Mode

**Status**: ⏳ Pending  
**Author tool**: Codex CLI (GPT-5)  
**Created**: 2026-05-04  
**Last updated**: 2026-05-04  
**$ value**: 7000  
**Urgency**: 5  
**Score**: 8.5

## What this context window does

Make the app immediately more useful for a teacher by adding no-login controls for choosing what to practice: vowels, selected letters, and a simple word/letter teaching mode if the codebase can support it cleanly.

## Prerequisites

- CTX-01 bootstrap is done.
- Documentation pass is done or consciously deferred.

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Recommended model

`gpt-5.1`
**Thinking**: On — changes learning state, content model, and teacher workflow.

---

## Prompt to paste

```markdown
## Before starting

git pull origin main
git log --oneline -5

**Read these files first:**
- `App.tsx`
- `data/banglaLetters.ts`
- `lib/learning.ts`
- `docs/PRODUCT-LOGIC.md`
- `docs/LEARNING-LOGIC.md`
- `docs/ROADMAP.md`

---

## Task 1 — Design the smallest useful teacher mode

Keep no-login practice as the default. Add a compact teacher control surface that lets a teacher:

- choose the full vowel deck
- choose a smaller letter set
- reset the current session
- keep learner-facing card display clean

If adding words is clean, add a tiny starter word deck. If it would overcomplicate the current model, add only the data shape/docs and defer word UI.

## Task 2 — Update content model

Refactor `data/banglaLetters.ts` only as much as needed to support teacher-selected practice sets.

Prefer clear typed arrays and simple helpers over a large abstraction.

## Task 3 — Update scheduler behavior

Ensure `lib/learning.ts` works with selected card sets and does not select cards outside the active set.

Preserve current mastery behavior unless a selected-set edge case requires a small fix.

## Task 4 — Update UI

Update `App.tsx` to support the teacher mode. Keep the practice screen mobile-first and sparse.

Do not require accounts, routing, or a database.

## Task 5 — Update docs

Update:

- `docs/LEARNING-LOGIC.md`
- `docs/PRODUCT-LOGIC.md`
- `docs/ROADMAP.md`
- `docs/TASKS.md`

## After all tasks

1. Run `npm run typecheck`.
2. Start Expo web if available and manually inspect the mobile layout.
3. Update this prompt status to ✅ Done only if verification passes.
4. Commit:
   `git add App.tsx data lib docs`
   `git commit -m "feat: add teacher quick teach mode"`

---

## Verification checklist

- [ ] Teacher can choose a practice set without login: [PASS / FAIL]
- [ ] Grading still updates progress: [PASS / FAIL]
- [ ] Scheduler stays inside selected set: [PASS / FAIL]
- [ ] `npm run typecheck` — zero errors: [PASS / FAIL]

## Test instructions

Open the app, choose a smaller letter set, mark several right/wrong answers, and confirm only selected letters appear.

## What NOT to do

- Do NOT add auth.
- Do NOT add a remote database.
- Do NOT clutter the card face with helper text.

## Next step

Run `docs/prompts/ux/UX-01-help-info-overlay.md`.
```

