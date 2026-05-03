# DEPLOY-01 — Vercel Olab Subdomain

**Status**: ⏳ Pending  
**Author tool**: Codex CLI (GPT-5)  
**Created**: 2026-05-04  
**Last updated**: 2026-05-04  
**$ value**: 6000  
**Urgency**: 4  
**Score**: 7.0

## What this context window does

Prepare the Expo web app for Vercel deployment and document the external steps needed to attach a URL under `olab.com.au`, defaulting to `porte-shikhi.olab.com.au`.

## Prerequisites

- App name should be settled.
- No-login teacher flow should be useful enough to share.

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Recommended model

`gpt-5.1`
**Thinking**: On — deployment config has environment/tooling edge cases.

---

## Prompt to paste

```markdown
## Before starting

git pull origin main
git log --oneline -5

**Read these files first:**
- `package.json`
- `app.json`
- `index.ts`
- `docs/TASKS.md`
- `docs/plans/bornomala-teacher-student-useful-sequence.md`

---

## Task 1 — Add Expo web build command

Add a package script for Vercel-compatible web export, likely:

- `build:web`: `expo export --platform web`

Confirm the actual output directory before writing Vercel config.

## Task 2 — Add Vercel config if needed

If Expo web export outputs `dist`, add a minimal `vercel.json` that serves the static export correctly.

Do not hardcode secrets.

## Task 3 — Verify local web export

Run the build command and fix repo-side issues.

## Task 4 — Document external Vercel/DNS tasks

Update `docs/TASKS.md` with dashboard steps:

- create/import Vercel project
- set build command and output directory
- connect GitHub repo once available
- add custom domain `porte-shikhi.olab.com.au`
- add required DNS record in the `olab.com.au` DNS provider
- verify HTTPS

## After all tasks

1. Run `npm run typecheck`.
2. Run the web build command.
3. Commit:
   `git add package.json vercel.json docs`
   `git commit -m "chore: prepare vercel web deployment"`

---

## Verification checklist

- [ ] `npm run typecheck` — zero errors: [PASS / FAIL]
- [ ] Web export succeeds: [PASS / FAIL]
- [ ] Vercel/DNS dashboard tasks documented: [PASS / FAIL]

## Test instructions

After Vercel deployment, open `https://porte-shikhi.olab.com.au` and confirm the trainer loads.

## What NOT to do

- Do NOT require login before deployment.
- Do NOT add a landing page here unless needed for deployment.
- Do NOT store credentials in the repo.

## Next step

Run `docs/prompts/ux/UX-02-landing-page.md`.
```

