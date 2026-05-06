# CTX-09 — Launch Prompt (paste into a fresh Opus 4.6 chat)

**Use when**: Firebase project + `.env.local` are ready and you're starting CTX-09 in a clean session.
**Recommended model**: `claude-opus-4-6`

---

## Copy-paste prompt

```
You are launching CTX-09 — Accounts Foundation (Firebase) for the PoraShikhi
project. Read the following before doing anything else:

1. /Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training/CLAUDE.md
2. /Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training/docs/decisions/active/2026-05-06-rebrand-bornomala-to-porashikhi.md
3. /Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training/docs/prompts/build/CTX-09-accounts-foundation-firebase.md

The third file is your full spec — Tasks 1-6, Definition of Done, the Prompt
to paste section. Follow it exactly.

Locked context you should know up front:
- App display name: PoraShikhi (the rebrand from Bornomala shipped in commit
  aa11ea2 — bundle ID au.com.olab.porashikhi is in app.json now).
- iOS bundle ID + Android package: au.com.olab.porashikhi (already set).
- The 6 Firebase env vars are in .env.local at the project root (verify they
  exist and are non-empty before installing anything; if any are missing,
  STOP and ask before proceeding).
- Worktree: spin up feat/ctx-09-accounts as the spec instructs.
- Apple Sign-In was deferred this round — Email/Password + Google only is
  fine. If the spec asks you to wire Apple, gracefully skip it and flag in
  your hand-off.

Verify before touching code:
- git status is clean
- git log --oneline -5 shows aa11ea2 (rebrand) in history
- .env.local exists and contains all 6 EXPO_PUBLIC_FIREBASE_* keys
- npm run typecheck passes on main (baseline)

Then proceed with Task 1 of the CTX-09 spec.
```

---

## After you paste

The agent will read the three files and then start Task 1 of CTX-09. If anything looks wrong (missing env vars, dirty tree, baseline typecheck failure), it will stop and ask before installing.

If the agent doesn't reference the rebrand commit (`aa11ea2`) or the bundle ID `au.com.olab.porashikhi` in its first response, it didn't read the decision record — re-prompt with `read /Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training/docs/decisions/active/2026-05-06-rebrand-bornomala-to-porashikhi.md before proceeding`.
