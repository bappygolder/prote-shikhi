# Bangla-First Trainer UI Decision Record

**Date**: 2026-05-04
**Meeting type**: CEO directive
**Facilitator**: Codex
**Participants**: Bappy Golder, Codex
**CEO**: Bappy Golder
**Score**: [$2500 · U5 · S=6.3]

---

## Decision

The trainer screen should use simple, easy Bangla words for visible app naming, labels, and controls. The learner-facing front page should stay focused on the card and two horizontal progress bars: total mastery and current-letter mastery. Secondary stats such as unlocked item count and session details belong inside the hamburger menu.

## Rationale

The app is for Bangla reading practice, so the working interface should feel native to the learner and teacher. The earlier stat boxes showed useful data, but they made the front page busier than needed. Horizontal progress bars make completion clearer while keeping the practice screen clean.

## Deferred

Detailed teacher controls, account-specific progress, and richer analytics are deferred to later prompts. This decision only covers the current trainer screen language and information hierarchy.

## Next Actions

- **Implementer**: Update `App.tsx` to use Bangla-first naming, two progress bars, and a hamburger menu.
- **Implementer**: Keep future UI prompts aligned with this Bangla-first language decision.

## Next Meeting

Revisit after the first teacher/student practice session or when adding the landing page.

