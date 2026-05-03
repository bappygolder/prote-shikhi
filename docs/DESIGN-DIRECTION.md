# Design Direction — Bornomala

**Last updated**: 2026-05-04  
**Audience**: handover agents, implementers, UX reviewers, future brand/design work  
**Status**: active source of truth for product UI direction

---

## Product Design Summary

Bornomala is a mobile-first Bangla adult literacy trainer. The current user-facing name in the trainer is **পড়তে শিখি**. The codebase and repository still use the working name **Bornomala** until the planned rename prompt runs.

The design direction is simple: make the app useful for a teacher and adult learner before making it broad, branded, or account-driven. The learner should see one clear Bangla item, answer verbally, and let a teacher mark Right or Wrong. The app should remember progress and keep the next card moving.

This project should feel like a practical teaching tool, not a decorative learning game and not a marketing site. The practice surface should be calm, sparse, Bangla-first, and fast to use in a real tutoring moment.

---

## Owner Direction To Preserve

These are durable product/design signals from Bappy's direction so future agents do not rediscover them from scratch:

- Prioritize a teacher/student flow that works immediately without login.
- Keep the trainer Bangla-first: visible learner/teacher labels should use simple Bangla words.
- Keep the card face clean. Do not put transliteration, English helper text, audio prompts, or long instructions on the practice card.
- Show only the most important progress on the front page: overall set progress and current-letter progress.
- Move secondary information into the menu: unlocked count, session stats, accuracy, presets, and reset.
- Add brand/landing-page warmth later, after the actual trainer is useful.
- Defer accounts, cloud sync, audio, tracing, and analytics until the no-login teaching loop is strong.
- The public direction is likely **Porte Shikhi / পড়তে শিখি**, but do not rename files, package ids, domains, or docs until `ADMIN-01` is intentionally run.

---

## Primary Users

| User | Design need | UI implication |
|---|---|---|
| Adult learner | See and recognize one Bangla item without embarrassment or visual noise | Large centered glyph, no helper text, restrained motion |
| Teacher/helper | Grade quickly and steer practice sets | Two large grading buttons, presets in menu, reset available |
| Returning learner | Continue from saved local progress | Visible progress, AsyncStorage-backed state |
| First-time visitor | Understand what this is | Later help overlay and landing page, not permanent clutter on the card |

---

## Experience Principles

### 1. Utility before identity

The first screen should be the trainer, not a landing page. A teacher should be able to open the app and start practice in seconds.

### 2. Bangla-first, simple words

Use plain Bangla labels such as `শিখি`, `অক্ষর`, `মেনু`, `ঠিক`, `ভুল`, `মোট শেখা`, `এই অক্ষর`, and `আবার শুরু`. Avoid formal or overly academic copy where a simple classroom word works.

### 3. One learning focus at a time

The learner-facing area should center one Bangla glyph or sign. Practice is recognition-first. Do not add competing concepts to the card face.

### 4. Teacher controls stay close but secondary

The teacher needs control, but not all controls need to sit in the main practice view. Put set selection, stats, and reset in the menu or secondary tabs.

### 5. Progress should feel concrete

Use count-based progress rather than abstract scores. A learner or teacher should be able to understand `৩/১০` faster than a hidden confidence model.

### 6. Keep the interface adult-respectful

This is literacy help for adults. Avoid childish illustration, gamified confetti, babyish copy, or school-kid visual language.

---

## Current Information Architecture

The app currently has three main surfaces:

| Surface | Purpose | Current location |
|---|---|---|
| Practice tab | Main teacher-assisted card loop | `App.tsx` |
| Letters tab | Browse current preset and jump to a card | `App.tsx` |
| Menu panel | Preset selection, stats, reset | `App.tsx` |

Bottom navigation:

| Label | Role |
|---|---|
| `অক্ষর` | Opens the letter grid for the selected preset |
| `শিখি` | Returns to the main practice card |
| `মেনু` | Opens the slide-over teacher/admin panel |

---

## Practice Screen Specification

The practice screen is the heart of the product.

### Layout

Top to bottom:

1. Centered app name: `পড়তে শিখি`
2. Stage label: current preset plus current list, e.g. `স্বর ১ · খোলা`
3. Overall progress bar: `মোট শেখা`
4. Large flashcard with one Bangla glyph
5. Embedded current-letter progress mark: `এই অক্ষর`
6. Two grading buttons: `ভুল` and `ঠিক`
7. Bottom navigation

### Card

- White surface with black border.
- Border radius stays restrained at `8`.
- The glyph is the visual anchor and should remain large enough to read at a glance on a phone.
- Vowel signs display with a dotted circle prefix, e.g. `◌া`, so the sign has context without turning into an explanation.
- Decorative accents are allowed only if they stay subtle and do not compete with the glyph.

### Progress

- `মোট শেখা` measures mastered cards in the active preset.
- `এই অক্ষর` measures correct answers for the current card toward `MASTERY_TARGET`.
- Use Bangla digits in UI values.
- Keep progress visible but visually quieter than the card.

### Grading Actions

| Button | Meaning | Current copy |
|---|---|---|
| Wrong | Learner missed the item | `ভুল` |
| Right | Learner identified it correctly | `ঠিক` |

Do not add `Unsure`, `Skip`, or multi-step grading in MVP. Those are explicitly deferred.

---

## Letters Screen Specification

The letters screen lets a teacher see the current preset and jump to a specific item.

### Required behavior

- Show the selected preset only, not every card in the full database.
- Show each tile's mastery percentage.
- Use status styling for active, started, and mastered cards.
- Keep tiles large enough for Bangla glyph readability.
- Selecting a card returns to the practice tab.

### Practice List Filters

| Filter | Meaning |
|---|---|
| `খোলা` | Currently unlocked cards |
| `সব` | All cards in the selected preset |
| `চর্চা` | Cards not yet mastered |
| `শেখা` | Mastered cards |

If a filter would return no cards, the app falls back to unlocked cards for practice.

---

## Menu Panel Specification

The menu is the teacher's secondary control area. It should not feel like a settings maze.

### Current menu contents

- Current preset
- Current list/filter
- Unlocked item count
- Session attempts
- Session right count
- Session wrong count
- Accuracy
- Preset chooser
- Reset button

### Preset chooser

The menu currently supports letter/sign groups from `PRACTICE_PRESETS`:

- `স্বর ১`
- `স্বর ২`
- `কার চিহ্ন`
- consonant subsets such as `ব্যঞ্জন ক`, `ব্যঞ্জন চ`, `ব্যঞ্জন ট`, `ব্যঞ্জন ত`, `ব্যঞ্জন প`, `শেষ ব্যঞ্জন`

Keep preset names short. A teacher should be able to scan them while sitting with a learner.

### Reset

`আবার শুরু` resets local progress, session stats, selected preset, active list, and current tab. Keep it visually distinct and mildly cautionary without creating a modal unless accidental taps become a real problem.

---

## Visual System

### Overall feel

Quiet, practical, warm, and paper-like. The UI can feel human and encouraging, but it should not become playful in a way that undermines adult learning.

### Current palette

| Use | Color | Notes |
|---|---|---|
| App background | `#f7f3e8` | Warm paper tone |
| Card/menu light surface | `#ffffff`, `#fffaf0`, `#fffdf7` | Clean teaching surfaces |
| Main text/borders | `#111827` | Strong readable ink |
| Secondary text | `#4b5563`, `#6b7280`, `#8b8790` | Use for hierarchy |
| Teal progress | `#88d4c9`, `#14b8a6` | Overall progress/accent |
| Orange progress/accent | `#f97316`, `#f59e0b` | Current-letter progress/accent |
| Success | `#047857` family | Right feedback/actions |
| Error/caution | `#be123c`, `#fff1f2`, `#fecaca` | Wrong/reset caution |

Avoid turning the entire product into a one-hue palette. The warm base should be balanced by black text, teal progress, and orange accents.

### Typography

- Use heavy weight for Bangla glyphs and important short labels.
- Keep letter spacing at `0`.
- Use `adjustsFontSizeToFit` and single-line constraints for glyph-heavy controls where overflow is likely.
- Do not scale font sizes directly with viewport width.
- Keep compact panel headings smaller than hero/card glyph type.

### Shape and spacing

- Default UI radius should stay at `8` or less unless the existing style requires otherwise.
- Avoid nested cards. Use cards for the flashcard, tiles, repeated preset buttons, or modal-like panels only.
- Use stable dimensions for buttons, progress tracks, tiles, and nav items so state changes do not shift layout.

---

## Motion And Feedback

Motion is present but quiet:

- Card entrance uses a small spring.
- Background card accents drift subtly.
- Right/wrong feedback appears briefly and fades.
- Menu slides in from the side.
- Progress bars animate over roughly 420ms.

Do not add celebratory animation until real learner testing shows it helps. The current motion should support orientation, not entertain.

---

## Accessibility And Readability

Minimum expectations:

- All tappable controls need accessibility labels.
- Progress bars should expose accessibility values.
- Bangla digits should be used for visible numeric UI.
- Text must not overflow buttons, tiles, or nav items on mobile.
- Tap targets should remain comfortable for teacher use on a phone.
- Avoid low-contrast helper copy. If it is visible, it must be readable.

Known future improvement: add a help/info overlay that explains the teacher-assisted flow without permanent instructions on the card.

---

## Responsive Rules

The app is mobile-first but should not break on web export.

- Main shell max width is currently `520`.
- The trainer should stay centered on larger screens.
- Bottom navigation should remain reachable and stable.
- The menu panel should not exceed a comfortable phone width.
- Letter tiles should preserve glyph readability before density.
- Do not introduce a desktop-only layout before the mobile flow is proven.

---

## Content Design Rules

### Learning items

Each item should have a stable id, Bangla glyph, group, and teaching order. See `data/banglaLetters.ts`.

### Presets

Presets are teacher-facing groups. They should be small enough to practice intentionally. Prefer adding a clear preset over dumping a large mixed deck into the default experience.

### Copy

Use Bangla for learner/teacher UI. Use English for developer docs and implementation comments unless the text is user-facing.

---

## What Not To Add Yet

Do not add these to the trainer without a specific prompt/decision:

- Login-gated practice
- Audio pronunciation
- Letter tracing
- Unsure/Skip grading
- Long instructional text on the card
- A full analytics dashboard
- Childlike gamification
- A landing page that replaces the actual trainer as the first screen

These may become useful later. They are deferred so the core teacher-assisted loop stays sharp.

---

## Future Design Direction

Near-term:

- Run the planned rename to **Porte Shikhi / পড়তে শিখি** when ready.
- Add the help/info overlay.
- Validate preset names and order with a real teacher/student practice session.
- Make the public landing page only after the trainer flow is useful.

Later:

- Introduce a clearer brand system for the public website.
- Add learner profiles and cloud sync while preserving no-login practice.
- Expand learning surfaces into words and sentence practice.
- Add richer review/session history for teachers.

The landing page can carry more warmth and explanation than the trainer. The trainer itself should stay quiet, fast, and focused.

---

## Handover Checklist For Future Agents

Before changing UI, read:

- `docs/DESIGN-DIRECTION.md`
- `docs/PRODUCT-LOGIC.md`
- `docs/LEARNING-LOGIC.md`
- `docs/ROADMAP.md`
- `docs/decisions/active/2026-05-04-bangla-first-trainer-ui.md`

Before committing UI changes, verify:

- The card still shows one primary Bangla item.
- Main visible controls still use simple Bangla.
- Teacher controls are available without login.
- Secondary stats are not pushed back onto the main card.
- Progress remains understandable as counts toward mastery.
- Mobile layout has no overlapping text or clipped Bangla glyphs.

