# Roadmap — Bornomala

**Last updated**: 2026-05-04

---

## Phase 1 — Human-Assisted Flashcards (current)

**Goal**: Get a Bangla adult learner practicing letter recognition with a human teacher as fast as possible.  
**Status**: In progress

### In scope
- [ ] Mobile-first Expo React Native app
- [ ] Bangla-only flashcards with no helper text on the learner view
- [ ] Vowels-first starter deck
- [ ] Teacher marks each card as Right or Wrong
- [ ] Mastery target: 10 correct responses per letter
- [ ] Minimal session stats and progress display
- [ ] Local-only data for MVP
- [ ] Teacher can choose a specific practice set without login
- [ ] Help/info overlay explains the teacher-assisted flow
- [ ] Public web deployment under `olab.com.au`

### Explicitly deferred
- Audio pronunciation → Phase 2+
- Letter tracing → Phase 2+
- Unsure/Skip grading → Phase 2+
- Accounts, cloud sync, and multi-device progress → Phase 2+
- Custom text/word imports → Later

### Next prompt sequence

See `docs/plans/bornomala-teacher-student-useful-sequence.md`.

1. `docs/prompts/admin/ADMIN-01-rename-to-porte-shikhi.md`
2. `docs/prompts/admin/ADMIN-02-document-core-logic.md`
3. `docs/prompts/build/CTX-02-teacher-quick-teach-mode.md`
4. `docs/prompts/ux/UX-01-help-info-overlay.md`
5. `docs/prompts/deploy/DEPLOY-01-vercel-olab-subdomain.md`
6. `docs/prompts/ux/UX-02-landing-page.md`
7. `docs/prompts/build/CTX-03-database-foundation.md`
8. `docs/prompts/build/CTX-04-user-accounts-progress-sync.md`

---

## Phase 2 — Sounds, Signs, and Words

**Goal**: Move from letter recognition into practical reading components.  
**Status**: Not started

- Add optional audio pronunciation
- Add vowel signs and consonant signs
- Add combined letters
- Add two-letter and three-letter words
- Add richer flashcard history and daily review

---

## Future Considerations

Items captured but not yet scheduled:

- Sentence practice
- Teacher/admin content tools
- Configurable mastery thresholds
- Custom decks based on useful real-world text
- Detailed per-card analytics by day, session, response, and learner
