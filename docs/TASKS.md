# Bornomala — Task Backlog

Quick tasks, configuration jobs, and one-off improvements that don't belong in the build prompt sequence. Pick these up whenever there's a spare moment or they become relevant.

> **Prompt vs Task**: If a task involves changes to multiple source files, make it a prompt file in `docs/prompts/`. If it's a config step, external dashboard action, one-off terminal command, or design asset — it belongs here.

> **Priority column**: `[$X · Uy · S=z]` or `[UNSCORED]`. See `~/.claude/shared/PRIORITY-SYSTEM.md`.

---

## App Setup

| # | Task | Priority | Effort | Notes |
|---|---|---|---|---|
| A-01 | Scaffold Expo React Native app | [UNSCORED] | ~10 min | Done 2026-05-04 |
| A-02 | Add first flashcard trainer screen | [UNSCORED] | ~30 min | Done 2026-05-04 |
| A-03 | Add local progress persistence | [UNSCORED] | ~30 min | Done 2026-05-04 |
| A-04 | Run `ADMIN-01` rename to `Porte Shikhi` | [$1000 · U5 · S=5.5] | ~20 min | Do before deployment/domain naming |
| A-05 | Run `CTX-02` teacher quick teach mode | [$7000 · U5 · S=8.5] | ~1-2 hrs | Highest usefulness for teacher/student |
| A-06 | Run `UX-01` help/info overlay | [$2500 · U5 · S=6.3] | ~30-45 min | Explains flow without clutter |

---

## GitHub / DevOps

| # | Task | Priority | Effort | Notes |
|---|---|---|---|---|
| G-01 | Initialize git repository | [UNSCORED] | ~2 min | Done 2026-05-04 |
| G-02 | Create GitHub repository `bornomala` | [UNSCORED] | ~5 min | Blocked: local `gh` token is invalid; use `gh auth login` or create repo in GitHub UI |
| G-03 | Add basic CI after app scaffolding | [UNSCORED] | ~20 min | Typecheck/build gate |
| G-04 | Run `DEPLOY-01` Vercel web deployment prep | [$6000 · U4 · S=7.0] | ~45-90 min | Repo-side config and dashboard checklist |
| G-05 | Create/import Vercel project | [$6000 · U4 · S=7.0] | ~10 min | External dashboard task |
| G-06 | Attach `porte-shikhi.olab.com.au` in Vercel | [$6000 · U4 · S=7.0] | ~10 min | Requires DNS access |
| G-07 | Add DNS record for `porte-shikhi.olab.com.au` | [$6000 · U4 · S=7.0] | ~10 min | External DNS provider task |
| G-08 | Verify HTTPS and public load | [$6000 · U4 · S=7.0] | ~5 min | Final deployment check |

---

## Learning Design

| # | Task | Priority | Effort | Notes |
|---|---|---|---|---|
| L-01 | Validate vowels-first sequence with first learner | [UNSCORED] | 1 session | Start simple and adjust from observation |
| L-02 | Define next consonant set | [UNSCORED] | ~20 min | Add after first session feedback |
| L-03 | Consider Unsure/Skip grading | [UNSCORED] | ~20 min | Deferred beyond MVP |
| L-04 | Document teacher-selected practice sets after CTX-02 | [$1500 · U4 · S=4.8] | ~20 min | Keep `LEARNING-LOGIC.md` current |

---

## Content

| # | Task | Priority | Effort | Notes |
|---|---|---|---|---|
| C-01 | Add full vowel deck | [UNSCORED] | ~10 min | Done 2026-05-04 |
| C-02 | Add consonant deck | [UNSCORED] | ~20 min | Next learning stage |
| C-03 | Add vowel signs | [UNSCORED] | ~30 min | Phase 2 |
| C-04 | Add tiny starter practical word deck | [$3000 · U3 · S=4.5] | ~30-60 min | Only after content model supports mixed items |

## Product / Growth

| # | Task | Priority | Effort | Notes |
|---|---|---|---|---|
| P-01 | Run `UX-02` landing page prompt | [$4000 · U3 · S=5.0] | ~1 hr | Do after trainer is worth sharing |
| P-02 | Add simple feedback/contact path | [$2000 · U3 · S=4.0] | ~30 min | Useful once public URL exists |
| P-03 | Add privacy/data note for local progress | [$2000 · U3 · S=4.0] | ~30 min | Important before accounts |

## Data / Accounts

| # | Task | Priority | Effort | Notes |
|---|---|---|---|---|
| D-01 | Run `CTX-03` database foundation prompt | [$5000 · U3 · S=5.5] | ~1 hr | Storage boundary before remote sync |
| D-02 | Decide database/auth provider | [$7000 · U3 · S=6.5] | ~20 min | Default recommendation: Supabase |
| D-03 | Run `CTX-04` user accounts progress sync prompt | [$7000 · U3 · S=6.5] | ~2-4 hrs | Keep no-login practice available |

---

## Code Quality

| # | Task | Priority | Effort | Notes |
|---|---|---|---|---|
| Q-01 | Run TypeScript/build checks before first commit | [UNSCORED] | ~5 min | Done 2026-05-04 |

---

## Known Bugs

Issues found but not yet fixed. Keep this section current — it feeds the verification gate in prompt files.

| # | Bug | Where | Status | Notes |
|---|---|---|---|---|
| B-01 | None yet | N/A | Closed | Replace this row when real issues are found |
