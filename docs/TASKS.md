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
| A-03 | Add local progress persistence | [UNSCORED] | ~30 min | Can follow after first in-memory MVP |

---

## GitHub / DevOps

| # | Task | Priority | Effort | Notes |
|---|---|---|---|---|
| G-01 | Initialize git repository | [UNSCORED] | ~2 min | Local repo is not initialized yet |
| G-02 | Create GitHub repository `bornomala` | [UNSCORED] | ~5 min | Use GitHub CLI or dashboard depending on auth |
| G-03 | Add basic CI after app scaffolding | [UNSCORED] | ~20 min | Typecheck/build gate |

---

## Learning Design

| # | Task | Priority | Effort | Notes |
|---|---|---|---|---|
| L-01 | Validate vowels-first sequence with first learner | [UNSCORED] | 1 session | Start simple and adjust from observation |
| L-02 | Define next consonant set | [UNSCORED] | ~20 min | Add after first session feedback |
| L-03 | Consider Unsure/Skip grading | [UNSCORED] | ~20 min | Deferred beyond MVP |

---

## Content

| # | Task | Priority | Effort | Notes |
|---|---|---|---|---|
| C-01 | Add full vowel deck | [UNSCORED] | ~10 min | Done 2026-05-04 |
| C-02 | Add consonant deck | [UNSCORED] | ~20 min | Next learning stage |
| C-03 | Add vowel signs | [UNSCORED] | ~30 min | Phase 2 |

---

## Code Quality

| # | Task | Priority | Effort | Notes |
|---|---|---|---|---|
| Q-01 | Run TypeScript/build checks before first commit | [UNSCORED] | ~5 min | Required before GitHub push |

---

## Known Bugs

Issues found but not yet fixed. Keep this section current — it feeds the verification gate in prompt files.

| # | Bug | Where | Status | Notes |
|---|---|---|---|---|
| B-01 | None yet | N/A | Closed | Replace this row when real issues are found |
