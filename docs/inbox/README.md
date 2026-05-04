# Project Inbox

Items waiting on Bappy's attention for **this project**.

For the full system doc, see [`~/.claude/shared/INBOX-SYSTEM.md`](../../../.claude/shared/INBOX-SYSTEM.md) (or whichever absolute path matches this machine).

## Quick reference

| Folder | What goes here |
|---|---|
| `discuss/` | Open thoughts — ideas, explorations, things to think about |
| `decide/` | Decisions that need Bappy's call |
| `do/` | Things only Bappy can do (not a Claude task) |
| `closed/` | Resolved items — historical only, agents don't read |

Open items are listed one-line each in [`INDEX.md`](INDEX.md).

Global dashboard across all projects: `~/.claude/shared/INBOX.md`.

## User-experience reports

Reports from real teaching sessions or user tests are filed under [`discuss/`](discuss/) using the filename pattern `YYYY-MM-DD-bornomala-<session-tag>-ux.md`. Each report is a raw, unprocessed capture grouped by surface (Path tab, Occor tab, Shiki, menu, etc.) and ends with a pointer to a follow-up UX prompt that fans the observations out into proper plans, decisions, and follow-up prompts. Do not act on individual items inside a UX report directly — process them through the linked follow-up prompt.
