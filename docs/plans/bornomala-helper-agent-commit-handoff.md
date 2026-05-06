# Helper-Agent Handoff — Commit Roadmap Docs + Stand By for CTX-08 / CTX-09 / DIAG-01 Q&A

## Context

The other session ("the primary agent") drafted a three-track parallel launch — Firebase accounts (CTX-09), UI quick-wins (CTX-08), and a variety-loop diagnosis (DIAG-01). Four files were staged in the working tree but never committed:

- `docs/plans/bornomala-roadmap-may2026-improvements.md` — May 2026 roadmap (340 lines)
- `docs/prompts/build/CTX-08-ui-quickwins-party.md` — UI quick-wins prompt (110 lines)
- `docs/prompts/build/CTX-09-accounts-foundation-firebase.md` — Firebase auth + Firestore prompt (208 lines)
- `docs/prompts/build/DIAG-01-variety-loop-diagnose.md` — Algorithm variety diagnose+fix prompt (158 lines)

These docs need to land on `main` **before** the parallel agents are launched. Each agent will be told to read its own prompt file by path; if the files aren't on `main`, the worktrees they branch from will be missing their own spec.

My role here is the **helper agent**: commit the docs cleanly so Bappy can launch the three primary agents in separate sessions, then stay open to answer questions about any of the three prompts while those agents run.

## Approach (one commit, docs only)

1. **Stage the four untracked docs explicitly by path** — no `git add -A` (CLAUDE.md global rule against accidentally including secrets / scratch).
2. **Commit on `main`** with a docs-only message:
   > `docs(plans): add May 2026 roadmap + CTX-08/CTX-09/DIAG-01 build prompts`
   followed by the standard `Co-Authored-By: Claude` footer.
3. **Verify** — `git status` shows clean tree, `git log -1 --stat` shows the four files (~816 lines added).
4. **Do NOT push.** Leaves room for amends; CLAUDE.md says don't push unless explicitly asked.
5. **Do NOT launch any of the three primary agents.** Bappy is launching them in separate sessions to keep their context isolated.

## Q&A standby (after the commit)

I now have full context loaded for:

| Prompt | What it does | Touches | Risk |
|---|---|---|---|
| **CTX-08** | 8 visual cleanups (header collapse, chip row, heatmap toggle, tab icon) | `App.tsx` only | Low |
| **CTX-09** | Firebase Auth + Firestore + sync layer + guest mode + migration | `lib/firebase/*` (new), `screens/auth/*` (new), `screens/profile/*` (new), one `App.tsx` menu add | Med (longest, env-dependent) |
| **DIAG-01** | Diagnose "stuck on 2 letters" variety issue, pick ONE narrow fix | `lib/learning.ts`, `lib/learning.test.ts`, optional 1-line copy in `App.tsx` | Med (algo, but bounded) |

Conflict map (from primary-agent's note, verified against the prompts):

- CTX-09 ↔ CTX-08 — only at CTX-09's last step (one new menu item in `App.tsx`). Land CTX-08 first; CTX-09 rebases cleanly.
- DIAG-01 ↔ everything — none. The optional copy line in `App.tsx` is dead-last and trivially mergeable.
- Recommended merge order: **DIAG-01 → CTX-08 → CTX-09**.

Ask anything like: "what env vars does CTX-09 need before I launch?", "is DIAG-01's Phase-1 test going to flake?", "what's the merge order again?", "what does CTX-08 mean by `〰` icon swap?". I have the prompt text in context and can quote line numbers.

## Files touched in this session

- **Commit only.** No source code changes.
- Plan file: `docs/plans/bornomala-helper-agent-commit-handoff.md` (this file). Will not be staged in the same commit — it's session scaffolding, separate from the roadmap docs.

## Verification

- `git status` → clean working tree (or only this plan file remaining).
- `git log -1 --stat` → 4 files added, ~816 lines.
- Spot-check on `main`: the three prompt files and the roadmap file open as expected.

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Low
- Reason: One docs commit + Q&A against prompts I've already read. No code reasoning required in this session.

## Out of scope

- Launching any of the three primary agents.
- Editing `App.tsx`, `lib/learning.ts`, or anything under `lib/firebase/`.
- Pushing to `origin/main`.
- Touching the prompt files themselves (they're inputs to the other agents).
