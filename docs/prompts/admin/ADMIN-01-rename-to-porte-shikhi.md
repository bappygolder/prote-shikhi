# ADMIN-01 — Rename To Porte Shikhi

**Status**: ⏳ Pending  
**Author tool**: Codex CLI (GPT-5)  
**Created**: 2026-05-04  
**Last updated**: 2026-05-04  
**$ value**: 1000  
**Urgency**: 5  
**Score**: 5.5

## What this context window does

Rename the project from Bornomala to a clearer learner-facing name, defaulting to `Porte Shikhi` / `porte-shikhi`. This should happen before public URLs, landing copy, screenshots, and database naming.

## Prerequisites

- CTX-01 bootstrap is done.
- Verify with: `git log --oneline -5`

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Recommended model

`gpt-5.1`
**Thinking**: Off — systematic project rename.

---

## Prompt to paste

```markdown
## Before starting

git pull origin main
git log --oneline -5

Confirm the most recent commit includes the MVP bootstrap/docs status. If not, stop.

**Read these files first:**
- `AGENTS.md`
- `package.json`
- `app.json`
- `App.tsx`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/TASKS.md`
- `docs/PRODUCT-LOGIC.md`
- `docs/LEARNING-LOGIC.md`

---

## Task 1 — Confirm naming surface

Use this default unless Bappy explicitly changes it before execution:

- App display name: `Porte Shikhi`
- Slug/package/project slug: `porte-shikhi`
- Bangla display copy where useful: `পড়তে শিখি`

Do not rename the repository folder in this prompt.

## Task 2 — Rename app metadata

Update:

- `package.json`
- `app.json`
- visible brand text in `App.tsx`

Preserve current functionality.

## Task 3 — Rename docs references

Update docs so they consistently refer to `Porte Shikhi` as the product name.

Files to inspect and update:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/SCHEMA.md`
- `docs/TASKS.md`
- `docs/PRODUCT-LOGIC.md`
- `docs/LEARNING-LOGIC.md`
- `docs/DESIGN-DIRECTION.md`
- `docs/DATABASE-PLAN.md`
- `docs/PROMPT-GUIDE.md`
- `docs/plans/*.md`
- `docs/prompts/**/*.md`

Keep historical commit messages unchanged.

## After all tasks

1. Run `npm run typecheck`.
2. Search for remaining `Bornomala`, `bornomala`, and decide whether each is historical/path-related or should be renamed.
3. Update this prompt status to ✅ Done only if verification passes.
4. Stage and commit:
   `git add package.json app.json App.tsx AGENTS.md CLAUDE.md GEMINI.md docs`
   `git commit -m "chore: rename app to porte shikhi"`
5. Push if remote exists and auth works.

---

## Verification checklist

- [ ] `npm run typecheck` — zero errors: [PASS / FAIL]
- [ ] Visible app name updated: [PASS / FAIL]
- [ ] Docs references updated intentionally: [PASS / FAIL]

## Test instructions

Open the app locally and confirm the header shows `Porte Shikhi` or the approved Bangla/English variant.

## What NOT to do

- Do NOT rename the local project folder.
- Do NOT change learning logic.
- Do NOT add deployment or account features.

## Next step

Run `docs/prompts/admin/ADMIN-02-document-core-logic.md`.
```

