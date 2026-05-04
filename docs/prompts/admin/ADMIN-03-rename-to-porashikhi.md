# ADMIN-03 — Rename App To Porashikhi (পড়াশিখি)

**Status**: ⏳ Pending
**Author tool**: Claude Code (Opus 4.7)
**Created**: 2026-05-04
**Last updated**: 2026-05-04
**Supersedes**: `docs/prompts/admin/ADMIN-01-rename-to-porte-shikhi.md`
**$ value**: 1000
**Urgency**: 5
**Score**: 5.5

## What this context window does

Rebrand the project end-to-end from `Bornomala` to `Porashikhi` (Bangla: `পড়াশিখি`). Touches in-app code, all docs, the GitHub repo, the Vercel project, and the planned `*.olab.com.au` subdomain. This must run in a single dedicated session before any public URLs, landing copy, or screenshots are produced.

## Naming history (read this first)

Three names exist in the repo's history. Don't get confused:

1. **Bornomala** — original working name. Still in code/docs at start of this run.
2. **Porte Shikhi / পড়তে শিখি** — abandoned rename target from `ADMIN-01-rename-to-porte-shikhi.md` (never executed). The GitHub repo was created with a typo'd version of this name: `bappygolder/prote-shikhi`.
3. **Porashikhi / পড়াশিখি** — the final target. This prompt makes it real.

When you finish, the only name remaining in the live surface should be `Porashikhi` (English) and `পড়াশিখি` (Bangla). Historical commit messages, prior plan filenames (e.g. `bornomala-mvp-flashcard-trainer.md`), and the supersede pointer in `ADMIN-01` stay as-is — they are repo memory.

## Prerequisites

- All open work committed: `git status` clean.
- On `main` branch, up to date: `git pull origin main`.
- `npm run typecheck` is currently green before you start.
- `gh auth status` succeeds (needed for GitHub repo rename).
- You have access to the Vercel project and to DNS for `olab.com.au`.

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Recommended model

`claude-sonnet-4-6`
**Reason**: Mechanical rename across many files — feature work, not architecture.

---

## Prompt to paste

```markdown
## Before starting

Read these to understand surface area:
- `docs/prompts/admin/ADMIN-01-rename-to-porte-shikhi.md` (superseded — for context only)
- `docs/plans/bornomala-ops-rename-to-porashikhi.md` (the plan that authored this prompt)
- `package.json`, `app.json`, `App.tsx`
- `README.md`, `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`

Confirm `git status` is clean and you're on `main`. If not, stop.

---

## Canonical naming (use these exact strings)

| Surface | Value |
|---|---|
| English display name | `Porashikhi` |
| Bangla display copy | `পড়াশিখি` |
| URL / package / project slug | `porashikhi` |
| AsyncStorage key | `porashikhi.progress.v1` |
| GitHub repo (after) | `bappygolder/porashikhi` |
| Vercel project (after) | `porashikhi` |
| Planned subdomain | `porashikhi.olab.com.au` |
| `PROJECT_SLUG` in tool files | `porashikhi` |
| GM skill folder | `~/.claude/skills/porashikhi-gm/` |

**Do NOT rename**:
- The local project folder (`04_bornomala-bangla-alphabet-training/`).
- Past commit messages.
- Plan filenames that begin with `bornomala-` under `docs/plans/` — keep filenames, update content only.
- Historical mentions inside `ADMIN-01-rename-to-porte-shikhi.md` (just confirm the Superseded banner is intact).

---

## Task 1 — App code (no migration; storage key changes)

Edit these files:

1. `package.json` — `"name": "porashikhi"`.
2. `app.json` — `"name": "Porashikhi"`, `"slug": "porashikhi"`.
3. `App.tsx`:
   - Line ~34: `const STORAGE_KEY = 'porashikhi.progress.v1';`
   - Replace `[bornomala]` warn tags with `[porashikhi]`.
   - Update any visible header text to show `Porashikhi` (Bangla `পড়াশিখি` if a Bangla header is preferred — confirm by reading the current header before editing).
4. Delete `package-lock.json` and run `npm install` to regenerate it cleanly with the new name (faster + safer than hand-editing the lockfile).

Then: `npm run typecheck` — must be zero errors.

> **Note on storage key**: this rename drops any existing local progress on first launch. The user accepted this — no migration needed.

## Task 2 — Tool entry points (CLAUDE.md / GEMINI.md / AGENTS.md)

Update all three files in lockstep (they must stay in sync):
- Title line: `# CLAUDE.md — Porashikhi` (and equivalents).
- Body references to "Bornomala" → "Porashikhi".
- `PROJECT_SLUG` value: `bornomala` → `porashikhi`.
- The GM role row: `~/.claude/skills/bornomala-gm/SKILL.md` → `~/.claude/skills/porashikhi-gm/SKILL.md`.

## Task 3 — Top-level docs

Update product/brand mentions in:
- `README.md` (also fix the deploy section: `porte-shikhi.olab.com.au` → `porashikhi.olab.com.au`; remove the "planned rename to Porte Shikhi" paragraph since it's now done).
- `docs/ARCHITECTURE.md`, `docs/SCHEMA.md`, `docs/DESIGN-DIRECTION.md`, `docs/PRODUCT-LOGIC.md`, `docs/LEARNING-LOGIC.md`, `docs/DATABASE-PLAN.md`, `docs/PROMPT-GUIDE.md`, `docs/ROADMAP.md`, `docs/TASKS.md`.

In `docs/DESIGN-DIRECTION.md` specifically: replace the "public direction is likely **Porte Shikhi / পড়তে শিখি**" line with `Porashikhi / পড়াশিখি` and drop the "until ADMIN-01 is intentionally run" caveat.

In `docs/TASKS.md` specifically: update G-06 and G-07 references from `porte-shikhi.olab.com.au` → `porashikhi.olab.com.au`. Either close them as ✅ when their work happens in Task 9/10 below, or leave them open if anything is still pending.

## Task 4 — Plans + prompts

Update **content** (not filenames) inside:
- All files under `docs/plans/`.
- All files under `docs/prompts/` (CTX, UX, FIX, ADMIN, build, deploy subfolders).
- Specifically in `docs/prompts/deploy/DEPLOY-01-vercel-olab-subdomain.md`: change subdomain references to `porashikhi.olab.com.au`.
- In `docs/plans/bornomala-ops-github-publish.md`: leave the historical "naming mismatch" note as-is (it's a record of past state) but add a 1-line "Resolved: see ADMIN-03" note at the top.

Leave the existing `ADMIN-01-rename-to-porte-shikhi.md` Superseded banner intact — don't edit further.

## Task 5 — Marketing asset rename

`git mv "01. Marketing/porteshikhi.olab.com.png" "01. Marketing/porashikhi.olab.com.png"` (use `git mv` so history is preserved). If a screenshot now shows the old name in the image itself, flag it for re-capture in `docs/TASKS.md`.

## Task 6 — GM skill folder rename

```bash
mv ~/.claude/skills/bornomala-gm ~/.claude/skills/porashikhi-gm
```

Then edit `~/.claude/skills/porashikhi-gm/SKILL.md` — replace any `Bornomala` / `bornomala` with `Porashikhi` / `porashikhi`. Confirm the trigger phrase still works (`open gm`).

## Task 7 — Commit code/docs first (before remote rename)

```bash
git add -A
git commit -m "chore: rename app from bornomala to porashikhi"
git push origin main
```

This commits code + docs while the remote is still `prote-shikhi`. Push works because GitHub remote rename is a separate operation done next.

## Task 8 — GitHub repo rename

```bash
gh repo rename porashikhi --repo bappygolder/prote-shikhi
```

GitHub auto-creates a redirect from the old URL, so existing clones keep working. Then update the local remote:

```bash
git remote set-url origin https://github.com/bappygolder/porashikhi.git
git remote -v   # verify
git fetch origin
```

## Task 9 — Vercel project + domain

Manual steps in the Vercel dashboard (no reliable CLI for project rename + custom-domain swap in one shot):

1. **Project Settings → General → Project Name**: change to `porashikhi`. Vercel will update the auto-generated `*.vercel.app` URL.
2. **Project Settings → Git**: confirm it's still linked to `bappygolder/porashikhi` (should auto-follow the GitHub rename — verify).
3. **Project Settings → Domains**: remove `porte-shikhi.olab.com.au` if it was ever attached; add `porashikhi.olab.com.au`. Vercel will display a CNAME target — copy it.

## Task 10 — DNS update for olab.com.au

In the DNS provider for `olab.com.au`:
1. Remove the old CNAME for `porte-shikhi` (if one exists).
2. Add a new CNAME: `porashikhi` → (the value Vercel showed in step 9.3).
3. Wait for Vercel to verify + provision HTTPS (usually under 5 min).
4. Open `https://porashikhi.olab.com.au` and confirm the trainer loads.

## Task 11 — Final sweep

Run:
```bash
rg -i "bornomala|porteshikhi|prote-shikhi|porte-shikhi|porte shikhi" --hidden -g '!node_modules' -g '!dist' -g '!.git'
```

Each remaining hit must be one of:
- A historical commit reference (leave alone).
- A plan filename starting with `bornomala-` under `docs/plans/` (leave filename, content already updated).
- The Superseded banner in `ADMIN-01-rename-to-porte-shikhi.md`.
- The "Naming history" / "naming mismatch" historical notes you intentionally left.

Anything else: rename it.

## After all tasks

1. Update this prompt's `Status:` to `✅ Done`.
2. Update `docs/TASKS.md` task A-04 to ✅.
3. Final commit:
   ```
   git add -A
   git commit -m "chore: complete porashikhi rebrand (github repo, vercel, dns)"
   git push
   ```

---

## Verification checklist

- [ ] `npm run typecheck` — zero errors
- [ ] App boots locally (`npx expo start`, then `w` for web). Header reads `Porashikhi` / `পড়াশিখি`.
- [ ] AsyncStorage key visible in devtools is `porashikhi.progress.v1`.
- [ ] `git remote get-url origin` returns the `porashikhi` URL.
- [ ] `https://porashikhi.olab.com.au` loads the trainer over HTTPS.
- [ ] Final `rg` sweep returns only the allow-listed historical mentions.

## What NOT to do

- Don't rename the local project folder.
- Don't rename plan filenames under `docs/plans/`.
- Don't rewrite git history.
- Don't add database/account features (out of scope).

## Next step

Either return to the deploy prompt (`docs/prompts/deploy/DEPLOY-01-vercel-olab-subdomain.md`) if it has remaining work, or pick up the next item in `docs/plans/bornomala-teacher-student-useful-sequence.md`.
```
