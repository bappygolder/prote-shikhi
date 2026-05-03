# Plan — Review and Publish Bornomala to GitHub

**Path note**: this plan was redirected from the plan-mode auto-stub `~/.claude/plans/can-you-review-the-deep-kazoo.md` to its correct project location per `~/.claude/shared/CONTENT-ROUTING.md` and `~/.claude/shared/NAMING-CONVENTIONS.md`.

---

## Context

The Bornomala MVP (Expo RN + TS flashcard trainer for Bangla vowels) has been bootstrapped locally with two commits and a growing set of planning docs. The user wants the project reviewed and pushed to a pre-created empty GitHub repo at `https://github.com/bappygolder/prote-shikhi`. No git remote is configured locally yet; pending doc work is uncommitted. Goal: do a quick code/repo review, commit the in-flight docs, add a minimal README, then publish `main` to GitHub.

## Recommended Model

- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Low–Medium
- Reason: Mechanical git/GH operations + small README write. No architectural decisions.

---

## Review Summary

### What looks good
- **Stack & config**: Expo SDK 54 + RN 0.81 + React 19 + TS 5.9 strict mode (`tsconfig.json:3`). New Architecture enabled (`app.json` `newArchEnabled: true`).
- **Code quality**:
  - `App.tsx`: clean hooks, `isMounted` guard on async load, AsyncStorage error swallowed gracefully, `accessibilityLabel` on grade buttons, `adjustsFontSizeToFit` on the Bangla glyph.
  - `lib/learning.ts`: pure functions, clear types, no hidden state. Mastery + unlock + scheduler logic separated from UI.
  - `data/banglaLetters.ts`: typed static deck, stable IDs (`vowel-01`…), explicit `order`.
- **Repo hygiene**:
  - `.gitignore` excludes `node_modules/`, `.expo/`, `dist/`, native folders, `.env*.local`, certificates/keys, `.DS_Store`. ✅
  - `node_modules` not tracked (verified — 0 matches under `git ls-files`).
  - **No secrets in tracked files** (grep for `api_key|secret|token|password|bearer` returns nothing in source/docs).
- **Docs**: ARCHITECTURE / ROADMAP / TASKS / SCHEMA / DESIGN-DIRECTION / LEARNING-LOGIC / PRODUCT-LOGIC / DATABASE-PLAN / PROMPT-GUIDE form a coherent set; prompt sequence (ADMIN-01 through DEPLOY-01 / CTX-04) is explicit.

### Things to flag (non-blocking for the push)
1. **Naming mismatch**: project = "Bornomala" (`package.json:2`, `app.json` slug `bornomala`); GitHub repo = `prote-shikhi`; planned rename = "Porte Shikhi" (`docs/prompts/admin/ADMIN-01-rename-to-porte-shikhi.md`). Note: the GitHub URL spells it `prote-shikhi`, the docs say `porte-shikhi` — likely a typo on one side. Worth resolving before DNS/domain work.
2. **`temp/` not in `.gitignore`**: ARCHITECTURE.md and CLAUDE.md both say `temp/` is gitignored, but `.gitignore` does not list it. The directory doesn't exist yet, so this is preventive.
3. **No README**: empty repo will show nothing on first visit (this plan adds a minimal one).
4. **No CI**: G-03 in `docs/TASKS.md` already tracks this; not blocking.
5. **No LICENSE**: repo is public with no license — acceptable for now; flag for later.

### Verdict
Code is small, clean, and safe to publish. Push as `bornomala` and rename later via ADMIN-01 — the repo URL is independent from the in-app `name`/`slug`, so the rename is decoupled from this push.

---

## Push Plan (5 steps)

### Step 1 — Commit pending docs
Single commit covering the modified files + all new untracked docs/prompts/plans.

```bash
cd "/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training"

git add \
  docs/ARCHITECTURE.md docs/ROADMAP.md docs/TASKS.md \
  docs/PRODUCT-LOGIC.md docs/LEARNING-LOGIC.md docs/DATABASE-PLAN.md \
  docs/DESIGN-DIRECTION.md docs/PROMPT-GUIDE.md \
  docs/plans/bornomala-teacher-student-useful-sequence.md \
  docs/plans/bornomala-ops-github-publish.md \
  docs/prompts/admin/ docs/prompts/build/ docs/prompts/deploy/ docs/prompts/ux/

git commit -m "docs: add product/learning/database/design docs and prompt sequence"
```

Explicit `git add` (no `git add -A`/`.`) — avoids accidentally staging anything stray.

### Step 2 — Add minimal README
Create `README.md` with:
- Project name + planned rename note
- One-line goal
- Tech stack line
- Run commands (`npm install`, `npx expo start`)
- Pointer to `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `CLAUDE.md`/`AGENTS.md`/`GEMINI.md`

Commit as: `docs: add README`

### Step 3 — Add `temp/` to `.gitignore`
One-line preventive fix. Append `temp/` under the `# debug` section. Commit as: `chore: gitignore temp/`.

### Step 4 — Wire remote and push
```bash
git remote add origin https://github.com/bappygolder/prote-shikhi.git
git remote -v   # verify
git push -u origin main
```

GitHub repo has secret-scanning push protection enabled — the push will be rejected if anything matches a secret pattern. Pre-checked grep showed no matches; if push protection still trips, paste the warning here and we adjust.

### Step 5 — Verify
```bash
gh repo view bappygolder/prote-shikhi --json url,defaultBranchRef,pushedAt,stargazerCount
gh api /repos/bappygolder/prote-shikhi/commits | head -40
git status   # should be clean
git log --oneline -10
```

Expect 5 commits on remote (`main` HEAD = `chore: gitignore temp/` → README → docs → bootstrap status → bootstrap mvp), default branch = `main`, working tree clean.

---

## Critical Files

| File | Why |
|---|---|
| `.gitignore` | Append `temp/` |
| `README.md` (new) | First-visitor entry point |
| `docs/plans/bornomala-ops-github-publish.md` (this file) | Plan record |

No source code changes (`App.tsx`, `lib/learning.ts`, `data/banglaLetters.ts`) — review-only.

---

## Post-Push Follow-Ups (out of scope for this run)

These are surfaced for visibility, not for execution now:
1. Resolve `prote-shikhi` vs `porte-shikhi` spelling. Update the GitHub repo name OR fix `ADMIN-01` doc — pick one canonical spelling before DNS work.
2. Run **ADMIN-01** to rename `package.json` `name`, `app.json` `name`/`slug`, brand string in `App.tsx:127`, and CLAUDE/AGENTS/GEMINI references.
3. Add a license (MIT recommended for a learning tool).
4. **G-03 / CI**: a tiny GitHub Actions workflow that runs `npm ci && npm run typecheck` on PRs to `main`.

---

## Verification

After all 5 steps complete:
- [ ] `git remote -v` shows `origin → https://github.com/bappygolder/prote-shikhi.git` (fetch + push)
- [ ] `git status` is clean on `main`
- [ ] `gh repo view bappygolder/prote-shikhi` returns `defaultBranchRef.name = main` and a recent `pushedAt`
- [ ] Visit `https://github.com/bappygolder/prote-shikhi` — README renders, file tree shows `App.tsx`, `lib/`, `data/`, `docs/`, three tool files (CLAUDE/AGENTS/GEMINI)
- [ ] Confirm `node_modules/` and `.expo/` are NOT in the GitHub file tree
