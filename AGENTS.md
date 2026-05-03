# AGENTS.md — Bornomala

Read this file at the start of every session in this project directory.

---

## YOU ARE HERE

This is **Bornomala** running under the **Golder Dev OS** framework.

You are reading this because you are **Codex CLI** or **GitHub Copilot CLI**. Other AI tools on this project read sibling files:

- `CLAUDE.md` → Claude Code
- `GEMINI.md` → Gemini CLI
- `AGENTS.md` → Codex / Copilot CLI (this file)

All three files point at the **same** framework at `~/.claude/shared/`. Pick the one matching your tool; ignore the others. They are kept in sync by the `use-dev-os` skill — do not edit one without updating the others.

If you're new to this project: read `~/.claude/shared/COMMUNICATION-GUIDE.md` first, then come back to the sections below.

---

## WHAT THIS PROJECT IS

**Bornomala** — a mobile-first Bangla adult literacy app for learning letters, sounds, and practical reading fast.

**Owner**: Bappy Golder  
**Stack**: Expo React Native + TypeScript.
**`PROJECT_SLUG`**: `bornomala` ← used as the filename prefix for every plan, temp, and project-scoped file (see `~/.claude/shared/NAMING-CONVENTIONS.md`).

---

## MODEL RECOMMENDATIONS

See `~/.claude/shared/MODEL-GUIDE.md` for cross-tool guidance.

| Task | Model | Model ID |
|---|---|---|
| Architecture decisions, hard bugs | GPT-5.1 (high reasoning) | `gpt-5.1` |
| Feature implementation (default) | GPT-5.1 | `gpt-5.1` |
| Small edits, quick lookups | GPT-5 mini | `gpt-5-mini` |

Switch via the CLI's model selector. If the user asks for "Opus", "Sonnet", or "Haiku", they're naming Claude tiers — translate to the equivalent OpenAI tier above.

---

## SHARED FRAMEWORK

This project uses the shared AI collaboration system. Framework docs live at `~/.claude/shared/` — read them when relevant, not every session.

**Project-specific prompts, plans, decisions, inbox items, scratch files, and docs all live inside this project.** The shared framework at `~/.claude/shared/` is read-only from a project's perspective — never create project content there. Project content goes in:

```
<project>/
├── docs/
│   ├── plans/        ← project plans (filename: <slug>-<area>-<title>.md)
│   ├── prompts/      ← CTX, UX, FIX, etc. (see PROMPT-SYSTEM.md)
│   ├── decisions/    ← decision records
│   └── inbox/        ← discuss / decide / do
└── temp/             ← scratch, debug traces, throwaways (gitignored)
```

| Doc | When to read |
|---|---|
| `~/.claude/shared/COMMUNICATION-GUIDE.md` | Start of any build session |
| `~/.claude/shared/NAMING-CONVENTIONS.md` | Before naming any new file |
| `~/.claude/shared/CONTENT-ROUTING.md` | Before creating any file (decides where it goes) |
| `~/.claude/shared/BOARD-SYSTEM.md` | Before any board or role session |
| `~/.claude/shared/ROLES-SYSTEM.md` | When adding or invoking a role |
| `~/.claude/shared/PROMPT-SYSTEM.md` | Before creating or running a prompt |
| `~/.claude/shared/PRIORITY-SYSTEM.md` | Before ranking or choosing what to work on |
| `~/.claude/shared/PRIORITY-INDEX.md` | To find the current top-20 items across the OS |
| `~/.claude/shared/DOC-MAINTENANCE.md` | When a build step completes or a doc looks stale |

---

## AVAILABLE ROLES

<!-- Add roles as they are set up for this project -->

| Role | Trigger phrase | Skill file |
|---|---|---|
| GM | "open gm" | `~/.claude/skills/bornomala-gm/SKILL.md` |

> Skills are defined in Claude Code format. Codex / Copilot CLI does not auto-load Claude skills, but the role behaviour described in each `SKILL.md` is plain markdown — read the file directly when the user invokes a role.

---

## KEY DOCS

| Doc | When to read |
|---|---|
| `docs/ARCHITECTURE.md` | Before adding any new component or route |
| `docs/SCHEMA.md` | Before touching database queries |
| `docs/ROADMAP.md` | To check scope |

---

## BUILD CONTEXT WINDOWS

<!-- Add CTX prompts as the project develops -->

| CTX | File | Scope | Status |
|---|---|---|---|
| 01 | `docs/prompts/CTX-01-bootstrap.md` | Scaffold + first flashcard MVP | ✅ |

---

## CONVENTIONS

### File naming
- Components: PascalCase (`MyComponent.tsx`)
- Hooks: camelCase with `use` prefix (`useMyData.ts`)
- Stores: camelCase with `Store` suffix (`myStore.ts`)

### State management
- Server/async data → TanStack Query
- Draft form state → Zustand
- Don't use useState for data that Query or Zustand should own

### Mutations
- Always implement optimistic updates
- Always handle the error case (rollback + toast)

---

## WHAT NOT TO BUILD IN THIS PHASE

<!-- List anything explicitly deferred or out of scope -->

- Audio pronunciation — deferred beyond MVP
- Letter tracing — deferred beyond MVP
- Accounts/cloud sync — deferred beyond MVP
- Unsure/skip grading — deferred beyond MVP
