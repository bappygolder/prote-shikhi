# PoraShikhi — May 2026 Improvements Roadmap

**Status:** Plan (awaiting approval)
**Owner:** Bappy Golder
**Created:** 2026-05-06
**Supersedes the auto-generated stub at:** `~/.claude/plans/we-recently-did-a-golden-hellman.md`

---

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`) for execution prompts; Opus 4.6 (`claude-opus-4-6`) for the user-accounts work and the path-architecture refactor
- Complexity: Medium overall; High for accounts + path-types
- Reason: Most items are scoped UI edits inside `App.tsx`; accounts touch new infra, path types touch architecture

---

## Context

User finished a real teaching session and the v2 algorithm is now live (CTX-05/06/07 shipped). The next push is **interface quality + identity + accounts**, in that order, so the app is presentable and shareable before the App Store push.

Three forces shape the sequencing:

1. **`App.tsx` is monolithic.** Two prompts editing it in parallel will conflict. Multi-item "parties" must be ONE prompt that batches related edits, not two prompts in parallel against the same file.
2. **Accounts are greenfield.** That's a long-running track — start it in parallel from day one, on its own branch/worktree, since it touches new files (`lib/supabase/`, `app/(auth)/`, schema migrations) and won't conflict with UI work in `App.tsx`.
3. **Brand confirmed.** UI uses `পড়াশিখি`. Code/files use `PoraShikhi`. (`bornomala-ops-rename-to-porashikhi.md` already plans this — refresh and execute.)

---

## Decisions locked

- **Auth + DB:** Firebase Auth + Firestore (chosen 2026-05-06). Apple/Google OAuth via `expo-auth-session` + `firebase/auth`. Progress documents under `users/{uid}/letterProgress/{cardId}`.
- **Brand:** UI = `পড়াশিখি`. Code/files = `PoraShikhi`. `PROJECT_SLUG` (`bornomala`) stays as the folder name only.
- **Path tab icon:** keep `⇡` text glyph for now; cheap swap to `〰` or `⌒`. Real SVG/Lottie deferred until Bappy supplies an asset.
- **Logo redesign:** filed to inbox, not in this plan.

---

## Risk-ordered prompt sequence

Each row maps to one prompt file in `docs/prompts/build/` (or `ux/` for cosmetic-only). Lower row = higher risk. **Parallel column** = which prompts can run simultaneously (different files / no conflict).

| # | Prompt | Risk | Parallel with | Touches |
|---|---|---|---|---|
| 1 | CTX-08 — UI Quick-Wins Party (header consolidation, hide global title, menu cleanup, chip simplification, sticky/grid toggles, group ই/ঈ and উ/ঊ pairs, tab icon swap) | Low | CTX-09 | `App.tsx` |
| 2 | CTX-09 — Accounts Foundation (Firebase Auth + Firestore, profile screen, progress sync) | High | CTX-08, UX-04 | `lib/firebase/`, new files |
| 3 | UX-04 — Visual Polish Party (rebrand to PoraShikhi, top progress bar percentage, fix blurred-letter first-paint, add letter-progress visibility) | Low-Med | CTX-09 | `App.tsx`, `data/`, `package.json` |
| 4 | CTX-10 — Letter Stats Drill-down (tap a letter card → modal with attempts/correct/wrong/firstSeen/lastSeen/dayCount) | Med | CTX-09 | `App.tsx`, `lib/learning.ts` (read-only) |
| 5 | CTX-11 — Path View Switcher + Flat View (introduce `PathView` enum, top-of-page switcher, build flat horizontal view alongside zigzag) | Med-High | CTX-09 | `App.tsx`, new `components/path/` |
| 6 | CTX-12 — Mastery Confetti + Unlock Celebration (Reanimated/Lottie, victory animation when a letter masters / a path completes) | Med | CTX-09 | `App.tsx`, `package.json` |
| 7 | CTX-13 — App Store Submission Prep (icons, splash, screenshots, EAS submit config, TestFlight first build) | Med | — (after CTX-09 lands) | `app.json`, `eas.json`, `assets/` |
| **8** | **DIAG-01 — Algorithm Variety / "Stuck on 2 Letters" Diagnose & Fix** (reproduce, identify root cause: low active set vs visibilityScore weights vs offline assumption, then fix) | Med | CTX-09 | `lib/learning.ts`, possibly `App.tsx` |
| **9** | **CTX-14 — Mastery Stop Points + Remaining-Steps Indicator** (info icon on each screen showing "X reps left to master / Y letters left in path", terminal "course complete" state) | Low-Med | CTX-09, CTX-16 | `App.tsx`, `lib/learning.ts` |
| **10** | **CTX-15 — Engagement & Celebration System** (color-progression on bars, emoji-rain on first-bar-fill, hearts-float on mastery, toast feedback for milestones; builds on CTX-12 confetti foundation) | Med | CTX-09 | `App.tsx`, `package.json` |
| **11** | **CTX-16 — Offline Mode UX** (network-state hook, "no internet" banner, Firestore offline-persistence verification, retry caps to prevent loops, ensure local-only experience never feels stuck) | Med | CTX-09 | `lib/firebase/`, `App.tsx`, new `lib/network.ts` |
| **12** | **CTX-17 — Teacher Mode (Admin Panel)** (separate teacher role in Firebase, student linkage by code/invite, threshold overrides per student, teacher dashboard with student stats, mentor notes) | High | — (after CTX-09 + CTX-14 land) | `screens/teacher/`, `lib/firebase/teacher.ts`, Firestore schema additions, security rules |

Future / backlog (NOT in this plan, deferred to inbox):
- Practical path (word-by-word) — needs new content authoring
- Custom path (teacher-built) — needs Teacher Mode (CTX-17) first, then authoring UI
- Voice features (per-letter audio) — needs asset pipeline + recording
- Logo redesign — see inbox item below

---

## Run order recommendation

**Wave A — Pre-launch foundation (Days 1-6)**
```
Day 1  → Run CTX-08 (UI Quick-Wins Party)              ← solo, ~30-60 min
       → In parallel start CTX-09 (Accounts) on a worktree
Day 2  → Run UX-04 (Visual Polish) once CTX-08 lands
       → CTX-09 still running in parallel
Day 3  → Run CTX-10 (Letter Stats Drill-down)
       → Run DIAG-01 (Variety bug diagnose+fix) — slot here if reproduces during testing
Day 4  → Run CTX-11 (Path Switcher + Flat View)
Day 5  → Run CTX-12 (Confetti) — optional polish
Day 6  → Land CTX-09, then run CTX-13 (App Store Prep)
```

**Wave B — Post-launch quality (after Wave A ships)**
```
Day 7  → Run CTX-14 (Stop Points + Remaining Indicator)
Day 8  → Run CTX-15 (Engagement & Celebration System)
Day 9  → Run CTX-16 (Offline Mode UX)                  ← only meaningful after CTX-09
Day 10+→ Run CTX-17 (Teacher Mode)                     ← largest, dedicate full session
```

You can ask "run the UI party" → CTX-08. "Run the polish party" → UX-04. "Run the engagement party" → CTX-15. The accounts track runs as its own session ("work on accounts") because it lives on a worktree.

**Re-prioritise DIAG-01 to Day 1** if the variety bug is reproducible — it's a current-state issue, not a future concern.

---

## Per-prompt scope (what each CTX file will tell the agent to do)

### CTX-08 — UI Quick-Wins Party  *(low risk, ship as one)*
**File:** `docs/prompts/build/CTX-08-ui-quickwins-party.md`
**Touches:** `App.tsx` (lines noted from exploration)
**Checklist for the executing agent:**
- [ ] Hide the global "পড়তে শিখি" brand title on every screen except where it's the screen's own header (line ~1002). Tab labels in the bottom bar already convey identity — recover that vertical space.
- [ ] Okkhor page header (lines 1139–1151): collapse to a single row → `অক্ষর · ০/৬ শেখা · স্বর ১`. Move the right-side total badge into the same row.
- [ ] Remove the "Letter 6" badge if it's redundant with the new inline count.
- [ ] Simplify the chip row (lines 1154–1192). Keep `সব` (all) and `খোলা` (unlocked, active set). Remove `চর্চা` and `শেখা` — those duplicate filtering you can derive from per-card state colour. Add a one-line tooltip / helper on `খোলা` explaining "currently learning".
- [ ] On the path screen, ensure the daily streak banner + `UniverseHeatmap` (lines 1009–1028, 315–341) are NOT sticky, and add a small "lukao / dekhao" toggle (eye icon) in the path screen header to hide/show the heatmap. Persist toggle state in AsyncStorage under `porashikhi.ui.heatmap.visible.v1`.
- [ ] Group similar letters in the Okkhor grid: render ই and ঈ in adjacent cells; render উ and ঊ in adjacent cells. (3-col grid: row 1 = অ, আ, ই / row 2 = ঈ, উ, ঊ — this already happens; verify the order in the cards array matches the pair-grouping intent.)
- [ ] Swap the path tab icon from `⇡` to a sideways path glyph (use `〰` or `⌒` placeholder — note in the prompt that a real SVG is coming).
- [ ] Reduce top spacing on the Shiki/practice screen header.

**Verification:** `npm run typecheck`, then load on web (`npm run web`), navigate Path → Okkhor → Shiki, confirm vertical space recovered, chips simplified, heatmap toggleable. Compare against the screenshot in this plan.

---

### CTX-09 — Accounts Foundation (Firebase)  *(high risk, parallel track)*
**File:** `docs/prompts/build/CTX-09-accounts-foundation.md`
**Worktree:** spin up a feature worktree so this doesn't collide with UI work in `App.tsx`.
**Depends on:** existing plan `bornomala-auth-progress-sync.md` and stub `CTX-04-user-accounts-progress-sync.md` — refresh those as input.
**Touches:** new `lib/firebase/`, new `screens/auth/`, `App.tsx` (menu item only), new Firestore security rules
**Checklist:**
- [ ] Provision Firebase project (Bappy: console.firebase.google.com → new project → enable Auth + Firestore). Prompt asks for `EXPO_PUBLIC_FIREBASE_*` env vars (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
- [ ] Install: `firebase`, `expo-auth-session`, `expo-crypto`. Add iOS bundle ID to Firebase console for Apple sign-in.
- [ ] `lib/firebase/client.ts` — `initializeApp`, `getAuth`, `getFirestore` exports.
- [ ] `lib/firebase/auth.ts` — wrappers for email sign-up/in, Google OAuth (web + native), Apple OAuth (iOS only). Use `signInWithCredential` pattern.
- [ ] Firestore data model:
  - `users/{uid}` → `{ displayName, email, createdAt, lastSeenAt, schemaVersion }`
  - `users/{uid}/letterProgress/{cardId}` → mirrors `LetterProgress` shape from `lib/learning.ts`
  - `users/{uid}/sessions/{sessionId}` → session-level rollups
- [ ] Firestore security rules: a user can only read/write under their own `uid`.
- [ ] Auth screens in `screens/auth/`: Sign-in, Sign-up, Forgot Password.
- [ ] Profile menu item in the Settings panel — opens profile screen showing displayName, email, sign-out, "delete account" link.
- [ ] Sync layer: on app start, fetch all `letterProgress` docs into local state. On `applyGrade`, optimistic local update + debounced (1s) `setDoc` with `{ merge: true }`. Use Firestore offline persistence for resilience.
- [ ] Migration: on first sign-in for an existing AsyncStorage user, batch-upload local progress → Firestore, then mark `migratedToCloud: true` in AsyncStorage.
- [ ] Preserve guest mode (no account = local AsyncStorage only, same UX as today).

**Verification:** sign up flow, sign out, sign back in on a different device/browser, confirm progress synced. Toggle airplane mode mid-grade → confirm local writes survive and replay on reconnect. Run `lib/learning.test.ts` — must still pass (algorithm untouched).

---

### UX-04 — Visual Polish Party  *(low-medium risk, run after CTX-08)*
**File:** `docs/prompts/ux/UX-04-visual-polish-party.md`
**Touches:** `App.tsx`, `data/banglaLetters.ts`, `app.json`, `package.json` (if reanimated needed)
**Checklist:**
- [ ] **Rebrand:** All UI strings → `পড়াশিখি`. All filenames, identifiers, doc references → `PoraShikhi`. (Reuse `bornomala-ops-rename-to-porashikhi.md` as the source of truth.) Update `app.json` `name` + `slug`. The `PROJECT_SLUG` in `CLAUDE.md` stays `bornomala` (folder name) — only product brand changes.
- [ ] **Top progress bar = percentage:** On the Shiki screen, replace the segmented bar with a continuous `letterProgressFill` that animates width-% as `correctCount / MASTERY_TARGET` grows. Show numeric `%` to the right.
- [ ] **Letter-progress mark visibility:** Currently `LetterProgressMark()` only renders when `correctCount > 0`. Make it a faint placeholder (10% opacity) on first render so users see the slot exists, then animate to full opacity on first correct.
- [ ] **Fix blurred letter on first paint:** Add `expo-font` preload for the Bangla font, gate the Okkhor grid on font-load with a `<SplashScreen>` or `useFonts()` boundary. Confirms the rendering issue is font-load timing, not opacity.

**Verification:** screenshot comparison; confirm no remaining instance of "পড়তে শিখি" in user-visible strings (`grep -r "পড়তে শিখি" .`).

---

### CTX-10 — Letter Stats Drill-down  *(medium risk)*
**File:** `docs/prompts/build/CTX-10-letter-stats-drilldown.md`
**Touches:** `App.tsx` (new modal component), `lib/learning.ts` (read-only — schema already has the fields)
**Checklist:**
- [ ] Change letter-card tap behaviour. Today: `handleChooseLetter(card)` routes to practice. New: tap → opens stats modal. Long-press still resets (existing behaviour).
- [ ] Add a "Practice this letter" button inside the modal that does the old `handleChooseLetter` action.
- [ ] Modal shows from `LetterProgress`:
  - Attempts: `seenCount`
  - Correct: `correctCount`
  - Wrong: `wrongCount`
  - First seen: `firstSeenAt`
  - Last seen: `lastSeenAt`
  - Best streak: `bestStreak`
  - Mastered? `mastered` + date if true
  - Days practised: count of unique calendar days where this card had a `seenCount` increment
- [ ] **Schema add:** `dayHistory: string[]` (ISO dates) on `LetterProgress` to support "days practised". Migrate v2→v3.
- [ ] Active-letter highlight (the dark-bordered card): keep existing `letterTileActive` style.

**Verification:** unit test for "days practised" counter; manual: tap each card, verify stats; reset a card, verify stats clear; cross-day test (mock date) for day counter.

---

### CTX-11 — Path View Switcher + Flat View  *(medium-high risk)*
**File:** `docs/prompts/build/CTX-11-path-view-switcher.md`
**Touches:** `App.tsx`, new `components/path/PresetPath.tsx`, `components/path/FlatPath.tsx`, `components/path/PathSwitcher.tsx`
**Checklist:**
- [ ] Extract the existing zigzag path renderer (`PresetPath` lines 353–446) into `components/path/PresetPath.tsx`.
- [ ] Build `components/path/FlatPath.tsx` — vertical list of horizontal cards, one per step, each showing letter, mastery %, status icon. Tap → opens step detail (next milestone).
- [ ] Add `PathView` type: `'zigzag' | 'flat'`. (Leave room for `'practical' | 'custom'` future.)
- [ ] Add `PathSwitcher` segmented control at the top of the path screen.
- [ ] Persist selection in AsyncStorage `porashikhi.ui.pathView.v1`.
- [ ] No behaviour change in algorithm — only render layer.

**Verification:** toggle switcher, both views render same data, no double-renders, no jank. Reload preserves selection.

---

### CTX-12 — Mastery Confetti + Unlock Celebration  *(medium risk, optional)*
**File:** `docs/prompts/build/CTX-12-mastery-confetti.md`
**Touches:** `App.tsx`, `package.json` (add `react-native-reanimated` + a confetti lib like `react-native-confetti-cannon`)
**Checklist:**
- [ ] Add reanimated to package + babel config.
- [ ] Hook `applyActiveSetOnMastery` event → trigger confetti burst + a brief "🎉 শিখলে!" banner.
- [ ] Hook `path-complete` event → bigger celebration screen.
- [ ] Test with reduced-motion preference respected.

**Verification:** master a card in test mode, see confetti; trigger path-complete (force via dev menu), see celebration.

---

### CTX-13 — App Store Submission Prep  *(medium risk, runs after CTX-09 ships)*
**File:** `docs/prompts/build/CTX-13-app-store-prep.md`
**Touches:** `app.json`, `eas.json` (new), `assets/` (new icon set, splash, screenshots), App Store Connect listing copy
**Checklist:**
- [ ] EAS build setup (Bappy will need an Apple Developer account ready).
- [ ] Generate icon set + splash from current logo (placeholder until logo redesign lands).
- [ ] Screenshot pipeline (Maestro or manual).
- [ ] Listing copy in Bangla + English (PoraShikhi tagline, description).
- [ ] First TestFlight upload via `eas submit`.
- [ ] Privacy manifest (since accounts now collect email + progress data).

**Verification:** TestFlight install on a real device; sign-up flow on iOS; progress syncs; no crashes for 10-min test session.

---

### DIAG-01 — Algorithm Variety / "Stuck on 2 Letters" Diagnose & Fix  *(medium risk, current bug)*
**File:** `docs/prompts/build/DIAG-01-variety-loop-diagnose.md`
**Touches:** `lib/learning.ts`, possibly `App.tsx`, may add `lib/learning.diagnostics.ts`
**Hypothesis space (the diagnose step picks one):**
- (a) Active set stays at 2 cards too long because mastery threshold is too high and unlock criteria are too strict.
- (b) `visibilityScore` weights cluster too tightly on lowest-mastery cards in active set, so RNG picks the same 1-2 cards >80% of the time.
- (c) Sprinkle eligibility never fires for newcomers, starving variety from the broader pool.
- (d) Misperception — user was offline AND in a small starter set; behaviour is by design but feels wrong.

**Checklist:**
- [ ] Reproduce: log every `chooseNextCard` decision for 50 consecutive grades from a fresh state. Capture `activeSet`, `visibilityScores`, picked card.
- [ ] Run the log through `lib/learning.test.ts` — add a "variety histogram" assertion: in any 20-pick window from a fresh user, no single card appears > 60% of the time.
- [ ] If the assertion fails, identify which hypothesis (a-d) holds, then propose ONE targeted fix (do not over-engineer; do not rewrite the algorithm).
- [ ] If (a): widen unlock criteria — e.g. allow active-set growth to 3 cards once a learner has any 2 correct (not requiring full mastery).
- [ ] If (b): apply softmax with a temperature parameter to flatten the distribution; document the new constant.
- [ ] If (c): allow sprinkle eligibility to fire from the unlocked-but-not-active pool, not only mastered cards.
- [ ] If (d): no algo change — instead UX: surface "you're learning your first 2 letters — keep going!" copy in the practice screen and bump the active-set growth rate.
- [ ] Add the variety histogram test to the permanent suite so this can't regress.

**Verification:** new test passes; manual: do 30 grades from fresh state, confirm at least 3 distinct letters appeared.

---

### CTX-14 — Mastery Stop Points + Remaining-Steps Indicator  *(low-medium risk)*
**File:** `docs/prompts/build/CTX-14-stop-points-and-remaining.md`
**Touches:** `App.tsx`, `lib/learning.ts` (read-only helpers)
**Checklist:**
- [ ] Add `getRemainingForCard(progress, settings) → { repsLeft, daysOnIt }` helper in `lib/learning.ts`.
- [ ] Add `getPathProgress(allProgress, preset) → { mastered, inProgress, remaining, percentComplete }` helper.
- [ ] Practice screen: small info `ⓘ` icon next to the card. Tap → tooltip `"আরও X বার ঠিক হলে শেখা হয়ে যাবে"` (X more correct = mastered).
- [ ] Letter stats modal (from CTX-10): show "Reps left: X / Y" prominently.
- [ ] Path screen header: small "X of Y letters mastered" line under the daily streak.
- [ ] **Terminal "course complete" state:** when `remaining === 0` for the current preset, the path screen shows a completion screen (large checkmark + "শেষ! পরবর্তী ধাপ?" + button to next preset OR a celebration screen if no next preset).
- [ ] Settings/teacher hook (forward-compat): wire `MASTERY_TARGET` through a `settings.masteryTarget` value pulled from a `userSettings` object. Default 10 (today's value). This is the seam Teacher Mode (CTX-17) will override per-student.

**Verification:** unit test for both helpers; manual: take a card to mastery, confirm the indicator counts down each correct; complete a preset, see the terminal state.

---

### CTX-15 — Engagement & Celebration System  *(medium risk)*
**File:** `docs/prompts/build/CTX-15-engagement-system.md`
**Touches:** `App.tsx`, `package.json` (depends on Reanimated added by CTX-12)
**Checklist:**
- [ ] **Color progression on letter-progress bar:** map percent → hue (red < 25% / orange < 50% / yellow < 75% / green < 100% / gold = mastered). Smooth interpolated transition.
- [ ] **First-bar-fill emoji rain:** when a card's `correctCount` increments from 0 → 1, animate 3-5 ⭐ floating up from the card.
- [ ] **Mastery hearts-float:** on `applyActiveSetOnMastery`, animate ❤️ × 8 floating up from card, fading at top.
- [ ] **Toast feedback:** brief Bangla toasts for milestones — `প্রথম শেখা!` (first ever mastery), `স্ট্রিক ৫!` (5-streak), `নতুন অক্ষর খুললো` (new card unlocked).
- [ ] **First-time-on-card encouragement:** when a card is shown for the first time, brief banner `নতুন অক্ষর! এটা শেখো!` + 🎯 emoji.
- [ ] **Path-complete confetti:** already covered by CTX-12 — extend with a Bangla "শাবাশ!" overlay.
- [ ] All animations respect `AccessibilityInfo.isReduceMotionEnabled()`.

**Verification:** master a card → see hearts; trigger first-correct → see stars; reduce-motion ON → animations replaced with static badges.

---

### CTX-16 — Offline Mode UX  *(medium risk, only meaningful after CTX-09)*
**File:** `docs/prompts/build/CTX-16-offline-mode-ux.md`
**Touches:** `lib/firebase/`, `App.tsx`, new `lib/network.ts`, `package.json` (`@react-native-community/netinfo`)
**Checklist:**
- [ ] Install `@react-native-community/netinfo`. Add `useNetworkState()` hook in `lib/network.ts`.
- [ ] Top-of-screen subtle banner when offline: `অফলাইন — অগ্রগতি সেভ হচ্ছে স্থানীয়ভাবে` (offline — progress saving locally). Auto-dismiss when connection returns.
- [ ] Confirm Firestore offline persistence is enabled (`enableIndexedDbPersistence` for web, native default for iOS/Android). Document expected behaviour.
- [ ] Cap retry attempts in the sync layer — never busy-loop. Use exponential backoff with max 5 retries, then surface error toast `সিঙ্ক করতে সমস্যা — পরে আবার চেষ্টা করব`.
- [ ] Verify gameplay never blocks on a network call. All `applyGrade` calls are local-first; cloud sync is fire-and-forget.
- [ ] Add a dev-tool toggle in the menu (debug builds only): `ফোর্স অফলাইন` for testing.

**Verification:** airplane mode mid-session — UI keeps working, banner appears, grades persist locally; reconnect → sync resumes silently. No infinite-loop behaviour.

---

### CTX-17 — Teacher Mode (Admin Panel)  *(high risk, post-launch)*
**File:** `docs/prompts/build/CTX-17-teacher-mode.md`
**Worktree:** dedicated branch — large surface area.
**Depends on:** CTX-09 (accounts), CTX-14 (settings seam already present)
**Touches:** new `screens/teacher/`, new `lib/firebase/teacher.ts`, Firestore schema additions, security rules
**Checklist:**
- [ ] **Role on user doc:** add `role: 'student' | 'teacher'` to `users/{uid}` (default `'student'`). Set via teacher invite flow or admin-set during sign-up.
- [ ] **Linkage model:** teacher generates an invite code; student enters code on profile screen → creates `teacherStudents/{teacherId_studentId}` doc. Many-to-many supported (one student can have multiple teachers, one teacher many students).
- [ ] **Per-student settings overrides:** new doc `users/{studentId}/teacherOverrides/{teacherId}` with fields like `masteryTarget`, `activeSetSize`, `enabledPresets`. The student app reads the most-recent override on session start. Without overrides, defaults apply.
- [ ] **Teacher dashboard screen:** list of linked students. Tap a student → see their `LetterProgress` per card (same data as CTX-10 stats modal), plus a "Reduce mastery target to 3" / "Reset card" / "Skip card" action.
- [ ] **Mentor notes:** teacher can leave a note per student per letter: `users/{studentId}/teacherNotes/{noteId}` `{ teacherId, cardId, note, createdAt }`. Student can optionally see notes (toggle in profile).
- [ ] **Firestore security rules:** teachers can read student progress only if a `teacherStudents` link exists. Students can read overrides written for them but cannot modify.
- [ ] **Teacher sign-in:** same Firebase Auth, but teacher dashboard route is gated on `role === 'teacher'`.
- [ ] **Audit trail (optional v2):** log each override change to `auditLog/`.

**Verification:** create teacher account; create student account; link via code; teacher overrides student's mastery target to 3; student app honours new target on next session; teacher sees real-time progress updates.

---

## Critical files to be modified (master list)
- `App.tsx` — touched by CTX-08, UX-04, CTX-10, CTX-11, CTX-12, CTX-14, CTX-15, CTX-16 (sequence them, never parallelise)
- `lib/learning.ts` — schema add in CTX-10 (v2→v3); helpers in CTX-14; settings seam in CTX-14; possible weights tweak in DIAG-01
- `lib/learning.test.ts` — variety histogram test in DIAG-01
- `data/banglaLetters.ts` — verify pair grouping in CTX-08
- `package.json` — reanimated + confetti in CTX-12; `firebase` + `expo-auth-session` + `expo-crypto` in CTX-09; `@react-native-community/netinfo` in CTX-16
- `app.json` — brand name in UX-04, build metadata in CTX-13
- New: `lib/firebase/`, `screens/auth/`, `screens/teacher/`, `components/path/`, `lib/network.ts`

---

## Inbox items to file (separate from this plan)

| Bucket | Filename | Note |
|---|---|---|
| `do/` | `2026-05-06-porashikhi-logo-redesign.md` | Logo upgrade — current logo is provisional. Generate or commission a new mark before App Store launch. |
| `discuss/` | `2026-05-06-porashikhi-practical-path-content.md` | Word-by-word "practical" path — needs content authoring; decide source list (target words from learner's daily life) |
| `discuss/` | `2026-05-06-porashikhi-custom-teacher-paths.md` | Teacher-authored custom paths — depends on accounts + an authoring UI; defer until post-launch |
| `discuss/` | `2026-05-06-porashikhi-letter-audio-recordings.md` | Per-letter audio — recording pipeline + storage decisions |

---

## Verification (end-to-end, after CTX-08 + UX-04 + CTX-10 land)

1. `npm run typecheck` — passes
2. `npm test` — all 31 algorithm tests still pass
3. `npm run web` — load app, verify on screenshots:
   - Brand swapped to `পড়াশিখি` everywhere user-visible
   - Okkhor header is one row: `অক্ষর · X/Y শেখা · স্বর ১`
   - Chip row simplified to `সব`/`খোলা`
   - Tap a letter card → stats modal opens (not direct route to practice)
   - Heatmap has eye-toggle and respects persisted state across reload
   - Top progress bar shows continuous % growth and numeric %
   - First-paint: no blurred letter
4. After CTX-09 lands: sign up, sign out, sign in on second browser → progress synced
5. After CTX-13: TestFlight build installs and launches
