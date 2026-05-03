# CTX-03 — Database Foundation

**Status**: ⏳ Pending  
**Author tool**: Codex CLI (GPT-5)  
**Created**: 2026-05-04  
**Last updated**: 2026-05-04  
**$ value**: 5000  
**Urgency**: 3  
**Score**: 5.5

## What this context window does

Plan and prepare the app for future remote persistence without forcing accounts into the no-login MVP. The main goal is a storage boundary and database docs, not a full backend.

## Prerequisites

- No-login teacher flow should exist.
- `docs/DATABASE-PLAN.md` should be reviewed.

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Recommended model

`gpt-5.1`
**Thinking**: On — persistence architecture affects later auth and sync.

---

## Prompt to paste

```markdown
## Before starting

git pull origin main
git log --oneline -5

**Read these files first:**
- `App.tsx`
- `lib/learning.ts`
- `docs/SCHEMA.md`
- `docs/DATABASE-PLAN.md`
- `docs/LEARNING-LOGIC.md`

---

## Task 1 — Define storage boundary

Introduce a small local storage module for progress persistence so `App.tsx` no longer owns raw `AsyncStorage` details.

Keep behavior identical.

## Task 2 — Draft database schema docs

Update `docs/SCHEMA.md` and `docs/DATABASE-PLAN.md` with concrete table fields for the recommended future database.

Do not add live Supabase/Firebase dependencies unless Bappy has confirmed the provider.

## Task 3 — Preserve local-first flow

Make sure no-login practice still works exactly as before.

## After all tasks

1. Run `npm run typecheck`.
2. Commit:
   `git add App.tsx lib docs`
   `git commit -m "refactor: prepare progress storage foundation"`

---

## Verification checklist

- [ ] Local progress still saves and resets: [PASS / FAIL]
- [ ] Storage logic is isolated from UI: [PASS / FAIL]
- [ ] Future database schema documented: [PASS / FAIL]
- [ ] `npm run typecheck` — zero errors: [PASS / FAIL]

## What NOT to do

- Do NOT add auth.
- Do NOT require remote network calls.
- Do NOT remove local progress.

## Next step

Run `docs/prompts/build/CTX-04-user-accounts-progress-sync.md`.
```

