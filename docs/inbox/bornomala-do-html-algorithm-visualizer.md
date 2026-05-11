---
type: do
status: pending
created: 2026-05-11
---

# Build HTML Algorithm Visualizer

Create a self-contained, nicely designed HTML file (`temp/algorithm-visualizer.html`) that visually explains how the Bornomala learning algorithm works — for review and communication purposes.

## What it should show

- **Card lifecycle diagram**: Waiting Pool → Active Spaces → Graduated Pool flow
- **Level system**: Gray / Blue / Purple levels, 5 pip dots per card, colors
- **Cycle mechanics**: How cards rotate, how cycle order is built, anti-repeat rule
- **Space growth/shrink rules**: What triggers adding or removing a memory slot
- **Wrong penalty**: What happens at each level on a wrong answer
- **Progress bar formula**: Per-card score, global percentage

## Design notes

- Self-contained single HTML file (no external dependencies)
- Dark or light theme, clean and readable
- Interactive if possible (e.g. step through a simulated session)
- Target audience: Bappy reviewing the algorithm logic to direct changes

## Reference

- Algorithm spec: `docs/ALGORITHM.md` (created in CTX-14)
- Implementation: `lib/learning.ts`
