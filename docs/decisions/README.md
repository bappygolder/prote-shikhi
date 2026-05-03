# Decision Records

This folder stores the output of board sessions and strategic decisions.

See `~/.claude/shared/DECISION-RECORDS.md` for the full system documentation.

---

## Folder Structure

```
docs/decisions/
├── INDEX.md          ← active decisions only, one line each, hard cap of 15 entries
├── active/           ← full text of active Decision Records (currently in force)
├── archived/         ← superseded decisions (agents do not read this folder)
└── daily-notes.md    ← running log of daily huddle outcomes (append-only)
```

## Rules

- Decision Records are permanent — do not edit after committing. Write a new one to supersede.
- No Decision Record is committed without explicit CEO approval.
- Agents read only `INDEX.md` and `active/` — never `archived/`.
