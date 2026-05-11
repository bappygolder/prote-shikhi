---
type: do
priority: medium
created: 2026-05-11
---

# Fix: Card-level progress bars don't drop on wrong answers

## What's broken
In the Learn tab, the per-card progress bars do not visually decrease when the user makes a mistake. Expected: streak reset should cause the bar to drop back.

## Context
Discovered during CTX-12 browser verification (2026-05-11). The global progress bar (top of screen) correctly drops on wrong answers. The card-level bars appear to not reflect the streak reset.

## Where to investigate
- `App.tsx` — how card-level progress is read and passed to the card component
- The card rendering component — check if it reads `streak` or `correctCount` directly
- `computeGlobalProgress` formula vs what the card bar displays

## Deferred because
Another agent is working on algorithm redesign (`feat/ctx-14-algorithm-redesign`). Fix after that work is merged.
