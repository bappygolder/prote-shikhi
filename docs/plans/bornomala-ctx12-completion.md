# CTX-12 Diagnosis + Completion Plan

> **Move after plan mode exits to**: `docs/plans/bornomala-ctx12-completion.md`

## Recommended Model
- Model: Haiku 4.5 (`claude-haiku-4-5-20251001`)
- Complexity: Low
- Reason: Just verification + PR creation — no complex logic

---

## Context

The user has been running `docs/prompts/CTX-12-progress-bar-bug-fixes-handover.md` and getting what feels like an infinite loop. They want to know: is this a Claude system bug, normal background work, or a prompt problem?

---

## Root Cause Diagnosis

### What CTX-12 actually is
CTX-12 is a **handover document** (session context transfer), not a task prompt. It documents what was already built and lists the next steps for the following session.

### Why it causes "infinite loops"
When Claude reads "execute this file," it sees the **Next Steps** section and tries to run them:

1. **"Test in browser — open localhost:8081"** → Claude tries to start the Expo dev server (`npx expo start` or `npm start`). This is a long-running foreground process. Claude waits for output that never ends → looks frozen.
2. **"Commit everything"** → Already committed as `bc78cb3`. Git returns "nothing to commit." Claude may loop trying to understand why.
3. The cycle repeats each time the user cancels and restarts.

This is **not a Claude system bug**. It's expected behavior when an automation-style instruction meets a step that requires human intervention (browser testing).

### Is the long waiting normal?
Yes — when Claude starts a dev server or long-running process it genuinely waits for output. It's not hung; it's blocked on a process that never exits. Cancelling is the right call.

---

## Current State (Verified)

| Item | Status |
|------|--------|
| `lib/learning.ts` — `progress` param + mastery guard | ✅ committed in bc78cb3 |
| `lib/learning.ts` — `computeGlobalProgress` | ✅ committed |
| `App.tsx` — imports + `handleGrade` wired | ✅ committed |
| `lib/learning.test.ts` — 3 call sites updated | ✅ committed |
| Browser verification | ❌ not done |
| PR to main | ❌ not done |

---

## Plan: Complete CTX-12 Properly

### Step 1 — Browser verification (manual, ~2 minutes)
You do this, not Claude:
```bash
npx expo start
```
Open on device or simulator. Go to Learn tab. Tap letters. Verify:
- [ ] Bar increments on every correct tap
- [ ] Bar does NOT freeze after mastering cards
- [ ] Bar drops when you press wrong (expected — streak resets)

### Step 2 — Create PR (Claude does this)
After you confirm the browser test passes, Claude runs:
```bash
gh pr create --title "feat(ctx-11): path switcher + progress bar bug fixes" \
  --base main \
  --body "..."
```

### Step 3 — Archive the prompt
Mark `docs/prompts/CTX-12-progress-bar-bug-fixes-handover.md` with `Status: ✅ Complete` so it's never re-run.

---

## What NOT to Do

- Do **not** ask Claude to "run CTX-12" again — it will hit the same dev-server loop
- The code changes are already in git — no re-implementation needed
- Browser testing cannot be automated by Claude without browser MCP tools

---

## Verification

Task is done when:
1. Browser test passes (you confirm)
2. PR is open on GitHub
3. CTX-12 prompt file is marked complete
