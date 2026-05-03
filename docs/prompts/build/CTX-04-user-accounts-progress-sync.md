# CTX-04 — User Accounts Progress Sync

**Status**: ⏳ Pending  
**Author tool**: Codex CLI (GPT-5)  
**Created**: 2026-05-04  
**Last updated**: 2026-05-04  
**$ value**: 7000  
**Urgency**: 3  
**Score**: 6.5

## What this context window does

Add the account plan and first implementation path for saving learner progress across devices, while keeping no-login practice available.

## Prerequisites

- Database provider decision made.
- `CTX-03` storage foundation done.
- Deployment path known.

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Recommended model

`gpt-5.1`
**Thinking**: On — auth and sync create product and security edge cases.

---

## Prompt to paste

```markdown
## Before starting

git pull origin main
git log --oneline -5

**Read these files first:**
- `App.tsx`
- `lib/learning.ts`
- `docs/DATABASE-PLAN.md`
- `docs/SCHEMA.md`
- `docs/PRODUCT-LOGIC.md`

---

## Task 1 — Confirm provider

If no provider is explicitly chosen in docs or by Bappy, stop and ask. Recommended default is Supabase, but do not silently add it.

## Task 2 — Add account UX plan

Design account entry so practice remains no-login by default:

- continue without account
- sign in to save/sync progress
- create learner profile after sign-in
- preserve local progress migration path

## Task 3 — Implement first account slice only after provider is confirmed

Add dependencies, environment config, auth client, and minimal sign-in/sign-out flow.

Keep remote progress sync small: start with one learner and progress rollups.

## Task 4 — Update docs

Update:

- `docs/SCHEMA.md`
- `docs/DATABASE-PLAN.md`
- `docs/PRODUCT-LOGIC.md`
- `docs/TASKS.md`

## After all tasks

1. Run `npm run typecheck`.
2. Verify no-login practice still works.
3. Verify account sign-in flow if implemented.
4. Commit with a scope matching actual work.

---

## Verification checklist

- [ ] No-login practice still works: [PASS / FAIL]
- [ ] Account flow works or provider decision blocker is clearly documented: [PASS / FAIL]
- [ ] Local progress migration path documented: [PASS / FAIL]
- [ ] `npm run typecheck` — zero errors: [PASS / FAIL]

## What NOT to do

- Do NOT force login before practice.
- Do NOT store secrets in source control.
- Do NOT implement a broad teacher/admin dashboard in this prompt.

## Next step

Create the next prompt based on what the first account slice reveals.
```

