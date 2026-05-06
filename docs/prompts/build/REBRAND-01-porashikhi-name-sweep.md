# REBRAND-01 — PoraShikhi Name Sweep (Follow-up)

**Status**: ⏳ Pending
**Created**: 2026-05-06
**Predecessor commit**: `aa11ea2` (chore(rebrand): Bornomala → PoraShikhi, add bundle ID au.com.olab.porashikhi)
**Decision record**: `docs/decisions/active/2026-05-06-rebrand-bornomala-to-porashikhi.md`
**Touches**: documentation, framework files, prompts, README. **No app code, no schema, no behavior change.**
**Risk**: Very low
**Parallel-safe with**: CTX-08, CTX-09, DIAG-01 (different files)
**$ value**: 800
**Urgency**: 2
**Score**: 2.5

---

## What this context window does

Sweep through the repo and replace remaining "Bornomala" references with "PoraShikhi" everywhere it's safe to do so. The first rebrand commit (`aa11ea2`) updated the user-visible app + manifests + storage keys. This prompt finishes the long tail: docs, prompts, framework files, README. **It does NOT rename the project folder, the GitHub repo, or change any app behavior.**

Lower-priority cleanup, batched into one PR-style commit so it's a single review for Bappy.

---

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

---

## Worktree

Run on `main` directly. Pure docs sweep — no merge conflicts with feature work since it touches only `*.md` files.

---

## Recommended model

Haiku 4.5 (`claude-haiku-4-5-20251001`) — mechanical search-and-replace with judgment about which strings to touch. Could also do Sonnet 4.6 if Haiku misses nuance on a couple of doc files.

**Complexity**: Low
**Reason**: Mostly text replacement with a small set of "leave this alone" rules.

---

## Prompt to paste

```markdown
## Before starting

git pull origin main --rebase
git status   # must be clean
git log --oneline -5   # confirm aa11ea2 (rebrand commit) is in history

**Read these files first** (in order):
1. `docs/decisions/active/2026-05-06-rebrand-bornomala-to-porashikhi.md` — the locked decisions
2. `docs/plans/bornomala-rebrand-porashikhi-bundle-id.md` — what shipped in aa11ea2
3. `CLAUDE.md` (this project's) — current state of project description
4. `README.md` (root) — current state

Don't read `App.tsx`, `app.json`, `package.json`, `package-lock.json` — those were already updated in the predecessor commit and contain only legacy migration constants now.

## Goal

Replace "Bornomala" → "PoraShikhi" and `bornomala` → `porashikhi` everywhere it's still safe to do so:

- Project description in `CLAUDE.md` / `GEMINI.md` / `AGENTS.md`
- All references in `docs/ARCHITECTURE.md`, `docs/SCHEMA.md`, `docs/ROADMAP.md`, `docs/CONTEXT.md` (if exists)
- `README.md`
- All `*.md` files inside `docs/prompts/`, `docs/plans/`, `docs/decisions/`, `docs/inbox/` — body content only, not file names
- The GM skill description if it mentions Bornomala (`~/.claude/skills/bornomala-gm/SKILL.md` is referenced from project CLAUDE.md but lives outside the project — DO NOT touch the skill file itself, just update the reference path in CLAUDE.md if the skill gets renamed later)

## What NOT to touch (preservation rules)

1. **The project folder name** `04_bornomala-bangla-alphabet-training/` — leave it. Renaming the directory breaks `~/.claude/projects/...` memory paths and adds zero value.
2. **The decision record file at** `docs/decisions/active/2026-05-06-rebrand-bornomala-to-porashikhi.md` — historical document. Leave the title and content as-is; the "Bornomala" mention there is intentional historical record.
3. **The execution plan file at** `docs/plans/bornomala-rebrand-porashikhi-bundle-id.md` — historical artifact. Leave as-is.
4. **The helper-agent plan at** `docs/plans/bornomala-helper-agent-commit-handoff.md` — historical. Leave as-is.
5. **`App.tsx` lines 54-55, 487, 494** — `LEGACY_STORAGE_KEY`, `LEGACY_LAST_TAB_STORAGE_KEY`, the migration comment, and the `[porashikhi] migrated progress from bornomala.* keys` log message all intentionally reference the old name for the storage migration. **DO NOT change.**
6. **The `bornomala-gm` skill name in `CLAUDE.md`** — the skill file at `~/.claude/skills/bornomala-gm/SKILL.md` is outside this repo. Renaming the skill is a separate operation. For now leave the table row as-is; flag it in the commit body so Bappy can decide.
7. **Any `bornomala-*` filename inside `docs/prompts/`** — file renames affect anything that references those paths. Don't rename files in this prompt; just update body content. File renaming can be a separate small commit.
8. **`PROJECT_SLUG`** in `CLAUDE.md` — currently set to `bornomala`. Naming conventions live in `~/.claude/shared/NAMING-CONVENTIONS.md` — changing the slug here means future plan/prompt filenames would use `porashikhi-*` prefix going forward. **Update this value to `porashikhi`** but do NOT mass-rename existing `bornomala-*.md` files.

## File-by-file checklist

For each file you change, replace:
- `Bornomala` → `PoraShikhi` in display contexts
- `bornomala` → `porashikhi` in slug/identifier contexts
- `the Bornomala app` → `the PoraShikhi app`
- `Bangla alphabet training` and similar tagline text → leave alone unless it directly conflicts with the new name

Required updates:

1. `CLAUDE.md` (project)
   - Heading: "CLAUDE.md — Bornomala" → "CLAUDE.md — PoraShikhi"
   - "This is **Bornomala** running under" → "This is **PoraShikhi** running under"
   - "**Bornomala** — a mobile-first Bangla adult literacy app" → "**PoraShikhi** — a mobile-first Bangla adult literacy app"
   - "**`PROJECT_SLUG`**: `bornomala`" → "**`PROJECT_SLUG`**: `porashikhi`"
   - GM skill row: leave the path `~/.claude/skills/bornomala-gm/SKILL.md` alone, add a note in commit body to follow up

2. `GEMINI.md` and `AGENTS.md` — apply identical changes (these are kept in sync per the framework)

3. `README.md` (root) — update title, description, any "Bornomala" mentions

4. `docs/ARCHITECTURE.md` — replace name references in body

5. `docs/SCHEMA.md` — replace name references in body

6. `docs/ROADMAP.md` — replace name references in body

7. `docs/CONTEXT.md` (if it exists) — replace name references

8. `docs/prompts/build/*.md` — for each file, replace body references. **Filenames stay the same.**

9. `docs/plans/bornomala-roadmap-may2026-improvements.md` — body references only, not the filename. (If the roadmap filename is felt to be confusing later, that's a separate file rename.)

10. Any `docs/inbox/discuss/*.md`, `docs/inbox/decide/*.md`, `docs/inbox/do/*.md` — body references

## Verification

After all edits:

```bash
# Should ONLY show the preservation-list files (decision record, rebrand plan, helper-agent plan, App.tsx legacy constants/comment/log message, and any bornomala-* filenames):
grep -rn -i "bornomala" --include="*.md" --include="*.ts" --include="*.tsx" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist . \
  | grep -v "LEGACY_\|migration\|migrated progress\|2026-05-06-rebrand\|bornomala-rebrand-porashikhi\|bornomala-helper-agent"
```

Expected hits after sweep: just filenames (`bornomala-roadmap-may2026-improvements.md`, etc.) — body content should be clean. If anything else shows up, decide whether to update or add it to the preservation list.

```bash
npm run typecheck
```

Should pass — no code touched, but worth confirming nothing accidentally landed in `*.ts` files.

## Commit

```bash
git add <only the files you changed>
git commit -m "$(cat <<'EOF'
docs(rebrand): sweep Bornomala → PoraShikhi across docs and framework

Follow-up to aa11ea2. Replaces remaining "Bornomala" references in
project README, framework files (CLAUDE.md / GEMINI.md / AGENTS.md),
docs/, and the bodies of build prompts in docs/prompts/.

Preserved (intentional historical or migration references):
- App.tsx legacy storage constants + migration comment + log
- decision record at docs/decisions/active/2026-05-06-rebrand-...
- rebrand execution plan + helper-agent handoff plan
- bornomala-* filenames in docs/prompts/ and docs/plans/ (file
  renames are a separate commit)

Follow-ups still needed:
- bornomala-gm skill at ~/.claude/skills/bornomala-gm/ (separate)
- GitHub repo rename from `prote-shikhi` to `porashikhi` (Bappy)
- Filename renames for bornomala-*.md docs (low priority)
- App icon / splash visual refresh (separate design pass)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"

git push origin main
```

## Hand-off after completion

Reply with:
- Number of files touched
- Number of references replaced
- Anything you weren't sure about (preservation gray areas)
- Confirmation that `npm run typecheck` passed
- Confirmation that the verification grep shows only preservation-list hits
```

---

## Out of scope (separate decisions for Bappy)

These are **not** in this prompt — they need explicit calls from Bappy:

1. **GitHub repo rename**: `bappygolder/prote-shikhi` → `bappygolder/porashikhi`. Affects clone URLs, deploy hooks, anyone with the repo bookmarked. See sibling prompt for the manual steps Bappy runs.
2. **Project folder rename**: `04_bornomala-bangla-alphabet-training/` → something else. Breaks Claude Code memory paths at `~/.claude/projects/...`. Not worth it.
3. **App icon / splash redesign**: visuals are still Bornomala-era. Needs a real design pass, not a sweep.
4. **`~/.claude/skills/bornomala-gm/` skill rename**: lives outside this repo. Separate operation that needs the skill content + file paths updated together.

---

## Why this is a follow-up, not an aa11ea2-extension

Keeping the original rebrand commit small and focused (manifests + storage keys + user-visible footer) made it easy to verify and easy to revert if needed. Sweeping every doc in one commit would have been a larger blast radius for the same shipped value. This prompt picks up the long-tail cleanup once the core change is settled.
