# ADMIN-02 — Document Core Logic

**Status**: ⏳ Pending  
**Author tool**: Codex CLI (GPT-5)  
**Created**: 2026-05-04  
**Last updated**: 2026-05-04  
**$ value**: 1500  
**Urgency**: 5  
**Score**: 5.8

## What this context window does

Harden the product, learning, design, and database documentation so future prompts have a shared source of truth before feature work expands the app.

## Prerequisites

- `ADMIN-01` should be done or consciously deferred.

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Recommended model

`gpt-5.1`
**Thinking**: Off — documentation pass with code verification.

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
- `docs/DESIGN-DIRECTION.md`
- `docs/DATABASE-PLAN.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`

---

## Task 1 — Verify docs against code

Check whether the newly created docs accurately describe the actual app. Fix any mismatch.

## Task 2 — Add missing durable docs only if needed

If the code reveals an important concept without a home, add a concise doc in `docs/`.

Do not create duplicate docs for concepts already covered.

## Task 3 — Cross-link key docs

Update `docs/ARCHITECTURE.md` and `docs/ROADMAP.md` to point to the product, learning, design, and database docs where useful.

## After all tasks

1. Run `npm run typecheck`.
2. Update this prompt status to ✅ Done only if verification passes.
3. Commit:
   `git add docs`
   `git commit -m "docs: document core learning logic"`

---

## Verification checklist

- [ ] Docs match current code: [PASS / FAIL]
- [ ] No duplicate/conflicting docs added: [PASS / FAIL]
- [ ] `npm run typecheck` — zero errors: [PASS / FAIL]

## What NOT to do

- Do NOT implement new app features.
- Do NOT change scheduling behavior.

## Next step

Run `docs/prompts/build/CTX-02-teacher-quick-teach-mode.md`.
```

