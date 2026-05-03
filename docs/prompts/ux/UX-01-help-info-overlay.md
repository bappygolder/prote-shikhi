# UX-01 — Help Info Overlay

**Status**: ⏳ Pending  
**Author tool**: Codex CLI (GPT-5)  
**Created**: 2026-05-04  
**Last updated**: 2026-05-04  
**$ value**: 2500  
**Urgency**: 5  
**Score**: 6.3

## What this context window does

Add a small info/help affordance that explains how to use the trainer without putting permanent instructional text on the learner-facing screen.

## Prerequisites

- CTX-02 teacher quick teach mode should be done or consciously deferred.

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Recommended model

`gpt-5.1`
**Thinking**: Off — scoped UX pass.

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

---

## Task 1 — Add info control

Add a small info icon/button in the app chrome. It should be reachable but not visually dominant.

## Task 2 — Add help overlay

The overlay should explain:

- learner looks at the Bangla card
- learner answers verbally
- teacher taps right or wrong
- progress saves on this device
- login is not required for this mode

Use concise Bangla-first or bilingual copy if it fits. Keep text readable on mobile.

## Task 3 — Preserve learner focus

The card face must remain Bangla-only during practice.

## After all tasks

1. Run `npm run typecheck`.
2. Inspect mobile layout.
3. Commit:
   `git add App.tsx docs`
   `git commit -m "feat: add trainer help overlay"`

---

## Verification checklist

- [ ] Help opens and closes reliably: [PASS / FAIL]
- [ ] Card face stays Bangla-only: [PASS / FAIL]
- [ ] Text fits on mobile: [PASS / FAIL]
- [ ] `npm run typecheck` — zero errors: [PASS / FAIL]

## What NOT to do

- Do NOT add a landing page in this prompt.
- Do NOT add permanent instructional text to the card screen.

## Next step

Run `docs/prompts/deploy/DEPLOY-01-vercel-olab-subdomain.md`.
```

