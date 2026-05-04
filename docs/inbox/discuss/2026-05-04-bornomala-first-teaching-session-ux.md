# UX Journal — First Teaching Session with a Real Learner

- **Date:** 2026-05-04
- **Type:** User-experience report (raw capture)
- **Setting:** Bappy teaching a real learner using the current Bornomala build
- **Status:** Unprocessed — do not act on individual items from this file
- **Follow-up:** [`docs/prompts/ux/UX-03-process-first-teaching-session.md`](../../prompts/ux/UX-03-process-first-teaching-session.md) will fan this out into proper plans, decisions, and UX prompts later

> This file is intentionally raw. It groups everything observed during the session by surface so the follow-up prompt can route each item to the right doc. Nothing here is a final decision.

---

## 1. Top-level findings

- Users have real difficulty remembering certain letters and words. The app needs to **adapt** to this — not just present the same path to everyone.
- The teacher needs a way to **manually re-adjust** how much of the path the app believes the learner has completed. Today there is no clean way to do this.
- Whenever we run a session like this, we should **save the user-experience report** the same way as this file. (See inbox README convention.)

---

## 2. Naming, IA, and tab language

### Rename "Preset" → "Path" / "Jatra" (journey)

- In the menu, use the short label **"Path"**.
- When more space is available (e.g. inside the surface itself), the fuller phrasing can be used — Bappy's note on screen captured as *"check our boss"* / fuller Bangla label, exact wording to be confirmed in the follow-up.
- The structure on the Path screen should be a **clean top-to-bottom list**. **Not** a Duolingo-style zigzag.
- Each Path item should show what's inside it (which letters / which range).
- Add a **percentage progress bar at the top** of the Path screen showing how much of the full journey has been completed.

### App-name placement

- The app name **"Porashikhi"** should not appear as a subtitle on the learning surface. Today it shows as a second subtitle under "Shiki / Poteshiki" — this clutters the learning view.
- Move the app name into the **menu** (a header inside the menu drawer is fine). The learning surface should be focused on learning, not branding.
- Anywhere the older name **"Poteshiki"** still appears, rename to **"Porashikhi"**.
- The learning surface should have **one** title only — something like *"Learning from X to Y"* — and drop the secondary subtitle entirely.

### Menu reorganisation

- Move **copyright info** and **"built by"** to the **bottom** of the menu (currently sit too high / at the top).
- **"Restart"** at the top of the menu should be renamed to **"Reset Everything"** and moved to the bottom of the menu.
- **"Talika Shop"** = "list" — Bappy is unsure of its current use case. **Audit before changing.** Don't rename or move it until we re-confirm what it does.

---

## 3. "Occor" tab (the second tab) — needs a major rework

### Current broken behavior

- Tapping the Occor tab itself currently jumps **straight to Shiki**. Don't want that. The tap should keep the user on Occor and surface functionality there.
- Tapping on **"Path"** currently jumps to the other tab. Don't want that either. Tap should give functionality on the same surface.

### What each Occor row should display

- Reset button (per-row reset)
- Progress (done / not done)
- How many items the row contains
- "From → to" range it covers
- A **backfill / progress fill** on the row indicating how far that specific item has been completed

### Restore lost functionality

- We previously had a **per-stage / per-journey reset** and lost it in a recent iteration. Bring it back.

### Press-and-hold (or tap) submenu

- Press-and-hold a row → submenu options:
  - **Remove progress**
  - **Re-adjust progress**
- Or simpler alternative: **tap to toggle on/off**.
- Decision deferred — capture as an inbox `decide/` item in the follow-up.

### Drill-down: tap into a single letter from Occor

- Should open a per-letter detail view showing **stats**:
  - Times attempted
  - Times correct
  - Mistake count
  - Struggle level
- And offer actions from that detail view (mark mastered, reset, push into a focused practice session).

---

## 4. Shiki (typing / repetition surface)

### Current rule

- A letter must be typed **10 times in a row with no mistakes**. One mistake resets the streak.

### Top-of-screen percentage

- Today the top % only ticks up when an entire letter completes its 10× streak.
- Change to **continuous accumulation**: every correct rep adds proportional points so the bar moves smoothly.
- The bar's **color can shift** as the percentage grows — adds visual interest as a learner approaches mastery.
- **No "step" visualization** is needed.

### Audio (planning only — out of scope today)

- Need a sound per letter. Need volume control.
- Evaluate options:
  - **ElevenLabs** (synthesized voice)
  - **Custom recordings** (real human voice — Bappy's or a Bangla speaker's)
  - **Open / existing datasets**
- Decide where audio lives: bundled in app vs. streamed.
- Decide how playback feels in-flow (auto-play on letter reveal? tap-to-hear?).

### "Lesson per letter" idea

- Each letter could become a **mini-lesson**: example pictures, videos, spoken examples.
- Tap to cycle through media for that letter.
- The letter becomes a small **content surface**, not just a typing target.
- Defer details to follow-up.

---

## 5. Adaptive learning logic (post-MVP, not now)

- Teacher should be able to **narrow the active lesson** down to just a few letters. Flexibility in **how many letters are taught at once** is a future requirement.
- If a learner is struggling: **reduce** letters in play, **increase** number of cards / repetitions on the ones they have.
- Between sessions, surface the items the learner missed most — **schedule extra practice** on those.
- Maintain **per-letter stats**: attempts, correct, mistakes, time spent, last seen.
- Tapping a letter from Occor should expose those stats and let the teacher take action (mark mastered, reset, push into focused practice).

---

## 6. Explicitly out of scope today

The following items came up during the session but are **not** to be acted on now. They are captured here and will be picked up via the follow-up prompt:

- Audio integration
- Lesson-per-letter media
- ElevenLabs decision
- Adaptive scheduling algorithm
- Per-letter stats schema and storage

---

## 7. Direct quotes worth preserving

These phrasings from Bappy capture intent more cleanly than my paraphrase, so they are kept verbatim:

- *"We don't need a Duolingo-style zigzag. We just need clean, top-to-bottom items."*
- *"When we tap, we want functionality."*
- *"At the moment, we only increase it once 1 letter is completed 10 times. We don't want that."*
- *"It could just change colors as the percentage grows to make it more interesting for the user."*
- *"The user must type one letter 10 times in a row. It can't have any mistakes. If they make a mistake, it will be reset."*
- *"If the student is struggling, we can reduce a letter or a word or item and we can just increase the number of cards."*
- *"In between the learning sessions, we should make sessions where the ones that students struggle the most, made the most mistakes, we should probably keep track of those and teach them more of these."*
- *"Whenever we see what the user experience is, we need to save that."*

---

**Follow-up prompt:** [`docs/prompts/ux/UX-03-process-first-teaching-session.md`](../../prompts/ux/UX-03-process-first-teaching-session.md)
