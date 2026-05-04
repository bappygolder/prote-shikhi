# Plan — Future prompt to rename app from Bornomala → Porashikhi

> **Plan-file housekeeping**: This plan was originally auto-created at `~/.claude/plans/also-let-s-change-the-harmonic-bonbon.md` and moved here per the project's `CONTENT-ROUTING.md` + `NAMING-CONVENTIONS.md`. The auto-named stub has been deleted.
>
> The actual deliverable is `docs/prompts/admin/ADMIN-03-rename-to-porashikhi.md` — the future prompt that does the rebrand. This plan also adds small history-marker edits so future sessions can trace the naming trail.

---

## Recommended Model

- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Low
- Reason: Mechanical doc/code authoring — no logic changes, no architecture decisions.

---

## Context

**Why this is happening now.** The user wants the app rebranded from `Bornomala` to `Porashikhi` everywhere — code, docs, GitHub repo, Vercel project, planned subdomain. The earlier rename target (`Porte Shikhi`, tracked in `docs/prompts/admin/ADMIN-01-rename-to-porte-shikhi.md`) is being abandoned in favor of `Porashikhi` / `পড়াশিখি`.

**Why a future prompt instead of doing it now.** The rename touches: in-app code, ~25 doc files, the GitHub repo (`bappygolder/prote-shikhi` — currently a typo), the Vercel project name, and the planned `*.olab.com.au` subdomain + DNS CNAME. Some steps (GitHub repo rename, Vercel rename, DNS edit) need manual clicks and external auth. A pre-written prompt run as a single dedicated session is safer than improvising mid-conversation.

**Decided answers from the user (this session, 2026-05-04):**
- Slug + display: code/URLs use `porashikhi`; in-app Bangla copy where useful uses `পড়াশিখি`.
- Scope: full rebrand — code + docs + GitHub repo + Vercel + DNS.
- AsyncStorage key: rename `bornomala.progress.v1` → `porashikhi.progress.v1` **without** migration (no real users yet, accepts loss of any local progress).
- Old ADMIN-01 prompt: keep as historical, marked Superseded, with a pointer to the new ADMIN-03.

---

## Naming history (preserve as repo memory)

So future sessions can reconstruct the trail:

1. **Bornomala** — original working name. Still present in `package.json`, `app.json`, `App.tsx`, all docs, `~/.claude/skills/bornomala-gm/SKILL.md`.
2. **Porte Shikhi / পড়তে শিখি** — first rename attempt (never executed). Tracked in `docs/prompts/admin/ADMIN-01-rename-to-porte-shikhi.md`. The GitHub repo was created under a typo'd version of this: `bappygolder/prote-shikhi` (not `porte-shikhi`).
3. **Porashikhi / পড়াশিখি** — final rename target (this plan). Replaces both prior names in code, docs, GitHub, Vercel, DNS.

The new prompt (`ADMIN-03-rename-to-porashikhi.md`) carries a short "Naming history" block so anyone reading it later understands why three names appear in git history.

---

## Critical files this plan touches

**Created:**
- `docs/plans/bornomala-ops-rename-to-porashikhi.md` (this file)
- `docs/prompts/admin/ADMIN-03-rename-to-porashikhi.md` — the new executable prompt

**Edited (small marker edits only — no rename work yet):**
- `docs/prompts/admin/ADMIN-01-rename-to-porte-shikhi.md` — Superseded banner
- `docs/ROADMAP.md` — point at ADMIN-03 instead of ADMIN-01
- `docs/plans/bornomala-teacher-student-useful-sequence.md` — point at ADMIN-03
- `docs/TASKS.md` — task A-04 references ADMIN-03 + new name

**Deleted:**
- `~/.claude/plans/also-let-s-change-the-harmonic-bonbon.md` (auto-created stub)

**NOT touched in this plan** (the actual rebrand work — that's what ADMIN-03 does when it's run later):
- `package.json`, `app.json`, `App.tsx`, README.md, CLAUDE.md, GEMINI.md, AGENTS.md, all other `docs/**`, `~/.claude/skills/bornomala-gm/SKILL.md`, GitHub repo settings, Vercel project, DNS, marketing assets, TASKS.md G-06/G-07.

---

## Surface area discovered (informs ADMIN-03 — for reference)

Searched with `rg -i "bornomala|porteshikhi|prote-shikhi|porte-shikhi|porashikh" --hidden -g '!node_modules' -g '!dist' -g '!.git'`. Categories:

| Category | Files / locations |
|---|---|
| App code | `App.tsx` (storage key + 2 console.warn tags), `package.json` name, `app.json` name+slug, `package-lock.json` (auto-regenerates) |
| Tool entry points | `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` |
| Top-level docs | `README.md`, `docs/ARCHITECTURE.md`, `docs/SCHEMA.md`, `docs/DESIGN-DIRECTION.md`, `docs/PRODUCT-LOGIC.md`, `docs/LEARNING-LOGIC.md`, `docs/DATABASE-PLAN.md`, `docs/PROMPT-GUIDE.md`, `docs/ROADMAP.md`, `docs/TASKS.md` |
| Plans | All files under `docs/plans/` |
| Prompts | `docs/prompts/CTX-01-bootstrap.md`, plus build/UX/admin/deploy subfolders |
| Marketing assets | `01. Marketing/porteshikhi.olab.com.png` — rename to `porashikhi.olab.com.png` |
| External | GitHub repo `bappygolder/prote-shikhi` → `bappygolder/porashikhi`. Vercel project name → `porashikhi`. Planned domain `porte-shikhi.olab.com.au` → `porashikhi.olab.com.au`. CNAME for the new subdomain on `olab.com.au` DNS. |
| User skill folder | `~/.claude/skills/bornomala-gm/` → `~/.claude/skills/porashikhi-gm/`. Update `SKILL.md` inside, plus the row in `CLAUDE.md`/`GEMINI.md`/`AGENTS.md`. |
| Project folder | `04_bornomala-bangla-alphabet-training/` — kept as-is. Folder rename is a separate decision. |

Historical strings to **leave alone**: prior commit messages, plan file basenames that start with `bornomala-` (renaming basenames would break links — only update the *content* inside, not the filename). The `PROJECT_SLUG` in CLAUDE/GEMINI/AGENTS will switch from `bornomala` to `porashikhi`, but past plan filenames stay as-is.

---

## Verification (for this plan's small scope only)

1. `ls docs/prompts/admin/` shows `ADMIN-01-rename-to-porte-shikhi.md` (with Superseded banner) and `ADMIN-03-rename-to-porashikhi.md`.
2. `head -8 docs/prompts/admin/ADMIN-01-rename-to-porte-shikhi.md` confirms Superseded banner present.
3. `grep -n "ADMIN-03\|ADMIN-01" docs/ROADMAP.md docs/plans/bornomala-teacher-student-useful-sequence.md docs/TASKS.md` shows ADMIN-03 references where expected.
4. `ls docs/plans/bornomala-ops-rename-to-porashikhi.md` exists; `ls ~/.claude/plans/also-let-s-change-the-harmonic-bonbon.md` does not.
5. `git diff --stat` shows only: this plan, the new ADMIN-03 prompt, the Superseded banner edit on ADMIN-01, and pointer-edits in ROADMAP.md / TASKS.md / sequence plan. No app code, package.json, app.json, README, or external systems touched.

End-to-end verification of the rename itself happens **inside ADMIN-03** when that prompt is run later.
