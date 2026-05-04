# UX-03 — Process First Teaching Session UX Journal

**Status**: ⏳ Pending
**Author tool**: Claude Code (Opus 4.7)
**Created**: 2026-05-04
**Last updated**: 2026-05-04
**$ value**: TBD
**Urgency**: 6
**Score**: TBD

## What this context window does

Reads the raw UX journal from the **first real teaching session** and **fans it out** into the right docs across the OS — decision records, plans, follow-up UX prompts, and inbox `decide/` items. **This prompt produces documentation only. It does not implement any UI, schema, or logic.**

## Prerequisites

- Journal exists at `docs/inbox/discuss/2026-05-04-bornomala-first-teaching-session-ux.md`. If it does not, stop and ask Bappy.
- Bappy has confirmed he is ready to start fanning the journal out (he explicitly deferred this on the day it was filed — don't run this prompt without his go-ahead).

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Recommended model

`claude-sonnet-4-6` (Sonnet 4.6) — medium complexity. Routing + drafting, no implementation.

---

## Prompt to paste

```markdown
## Before starting

git pull origin main
git log --oneline -5

**Read these files first, in order:**
- `docs/inbox/discuss/2026-05-04-bornomala-first-teaching-session-ux.md` (the journal — source of truth)
- `~/.claude/shared/NAMING-CONVENTIONS.md`
- `~/.claude/shared/CONTENT-ROUTING.md`
- `~/.claude/shared/PROMPT-SYSTEM.md`
- `docs/ROADMAP.md`
- `docs/PRODUCT-LOGIC.md`
- `docs/LEARNING-LOGIC.md`
- `docs/DESIGN-DIRECTION.md`

You are NOT implementing anything in this prompt. You are routing the journal into the right documents. Treat each item below as one document to draft.

---

## Task 1 — Decision records

For each, create a file in `docs/decisions/` named per the project decision-record convention (`YYYY-MM-DD-<slug>.md`). Each decision record should include: context, options considered, recommendation, open questions.

1. **Rename "Preset" → "Path / Jatra" + remove "Porashikhi" subtitle from the learning surface.**
   - Lock: short label "Path" in menu; full Bangla phrasing on the screen itself (confirm exact wording with Bappy).
   - Lock: app name "Porashikhi" appears only inside the menu, not on learning surfaces.
   - Lock: rename any remaining "Poteshiki" to "Porashikhi".

2. **Audio strategy for letter pronunciation.**
   - Options: ElevenLabs synthesis, custom human recordings, open Bangla audio datasets, hybrid.
   - Decide: bundled vs streamed, auto-play vs tap-to-hear, volume control surface.
   - Flag cost + voice-identity tradeoff explicitly.

## Task 2 — Plans

For each, create a file in `docs/plans/` using the project naming convention (`bornomala-<area>-<title>.md`). Each plan should include: context, approach, critical files, verification.

1. `bornomala-occor-tab-redesign.md` — full Occor rework:
   - Stop tap-through to Shiki; keep functionality on Occor.
   - Per-row content: reset button, progress (done/not done), item count, "from → to" range.
   - Restore the per-stage / per-journey reset that was lost in a recent iteration.
   - Press-and-hold submenu: **Remove progress** / **Re-adjust progress** (or tap-to-toggle — see Task 4 inbox item).
   - Add backfill / progress fill on each row.
   - Drill-down: tapping a single letter opens a stats view with per-letter stats and actions.

2. `bornomala-path-tab-redesign.md` — Path / Jatra screen:
   - Replace zigzag with clean top-to-bottom list.
   - Each row shows what's inside (letters / range).
   - Add a percentage progress bar at the top showing total path completion.
   - Tap on Path should NOT jump to another tab. Define what tap actually does.

3. `bornomala-shiki-continuous-progress.md` — top-of-screen percentage:
   - Switch from per-letter step increment to continuous accumulation per correct rep.
   - Color of the bar shifts as percentage grows.
   - No step visualization.
   - Confirm: 10-in-a-row-no-mistakes mastery rule stays as-is unless explicitly changed.

4. `bornomala-letter-stats-tracking.md` — per-letter stats foundation:
   - Fields: attempts, correct, mistakes, time spent, last seen, struggle level (derived).
   - Storage location (local first, cloud later).
   - Surface: drill-down view from Occor.
   - This plan is the prerequisite for the adaptive-sizing plan below.

5. `bornomala-adaptive-lesson-sizing.md` — post-MVP:
   - Teacher control over how many letters are active in a session.
   - Auto-rules for struggling learners: reduce letters in play, increase reps per remaining letter.
   - Between-session focused practice on the most-missed items.

6. `bornomala-letter-lesson-media.md` — future content layer:
   - Each letter as a mini-lesson: example pictures / videos / spoken examples.
   - Tap to cycle through media.
   - Out of MVP scope.

7. `bornomala-menu-reorg.md` — quick-win IA pass:
   - Move copyright + "built by" to bottom of menu.
   - Rename "Restart" → "Reset Everything", move to bottom.
   - Audit "Talika Shop": confirm current use case before renaming or moving.
   - Add a menu header for the app name "Porashikhi".

## Task 3 — Follow-up UX prompt

Create `docs/prompts/ux/UX-04-help-overlay-rename-pass.md` (use the next free UX number after auditing what exists). This prompt covers updating the help/info overlay copy after the renames in Task 1 land. Do not write the content of UX-04 in detail — leave it as a stub with: scope, prerequisites (the rename decision must be merged), acceptance criteria.

## Task 4 — Inbox decisions

Create files in `docs/inbox/decide/` (one per genuinely-open question):

1. `2026-05-04-occor-row-action-style.md` — press-and-hold submenu vs simple tap-to-toggle for Occor row actions. Trade-offs documented; Bappy decides.
2. `2026-05-04-talika-shop-purpose.md` — confirm what "Talika Shop" is before any rename or rearrangement.
3. `2026-05-04-path-screen-bangla-title.md` — exact full Bangla phrasing for the Path screen ("Jatra" / fuller wording).

## Task 5 — Roadmap update

Append a "First teaching session — UX changes" section to `docs/ROADMAP.md` listing all the plans and decisions created in Tasks 1–2 in the order they should be picked up. Suggested order:

1. Decision: rename "Preset" → "Path / Jatra".
2. Plan: menu reorg (small, clears the path).
3. Plan: Path tab redesign.
4. Plan: Occor tab redesign.
5. Plan: Shiki continuous progress.
6. Plan: per-letter stats tracking.
7. Decision: audio strategy.
8. Plan: lesson media.
9. Plan: adaptive lesson sizing.

## After all tasks

1. Move the journal from `docs/inbox/discuss/` to `docs/inbox/closed/` once all items above are filed (the journal is then "processed").
2. Verify `docs/ROADMAP.md` lists every new plan and decision.
3. Commit:
   `git add docs`
   `git commit -m "docs: fan first teaching session journal into plans + decisions"`

---

## Verification checklist

- [ ] All 2 decision records exist in `docs/decisions/`
- [ ] All 7 plan files exist in `docs/plans/`
- [ ] UX-04 stub exists in `docs/prompts/ux/`
- [ ] All 3 inbox `decide/` items exist
- [ ] `docs/ROADMAP.md` updated with the new section
- [ ] Journal moved to `docs/inbox/closed/`
- [ ] No code, schema, or component changes were made

## What NOT to do

- Do NOT implement any UI, schema migration, or logic.
- Do NOT make audio decisions yourself — produce the decision-record skeleton and stop.
- Do NOT rename any code or files in the Expo app.
- Do NOT decide on press-hold vs tap — surface as inbox `decide/`.
- Do NOT touch "Talika Shop" — surface as inbox `decide/` first.

## Next step

Bappy reviews the new plans/decisions and picks one to execute via a fresh build prompt.
```
