# Bornomala — Auth + Cross-Device Progress Sync (Design)

**Status**: Design — awaiting implementation plan
**Date**: 2026-05-04
**Owner**: Bappy
**Replaces / supersedes**: nothing (this is `CTX-04` from `docs/ROADMAP.md`)
**Recommended Model for implementation**: Sonnet 4.6 (`claude-sonnet-4-6`) — Medium complexity, mostly wiring + one new lib layer.

---

## 1. Goal

Let a learner sign in with email, have their letter-recognition progress saved to the cloud, and pick up on any other device they sign into. Keep the no-login flow working exactly as it does today.

## 2. Non-goals (this build)

- Multiple learners per account
- Per-attempt history (`attempts` table from `DATABASE-PLAN.md`)
- Teacher dashboards
- Password auth, Google OAuth, Apple Sign-In
- Conflict-resolution UI (merges happen silently)
- Account deletion flow (Firebase console for now)
- Native iOS/Android deep-link handling — web-only for now (`olab.com.au`)

## 3. Decisions (already locked in brainstorm)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Login method | Email magic link ("email link sign-in") | No password UI, one API call, works on web |
| 2 | No-login mode | Stays default; sign-in optional | Matches `DATABASE-PLAN.md`; preserves landing UX |
| 3 | Merge strategy on first sign-in | Per-card max, silent | Never loses progress, zero dialogs |
| 4 | Sync timing | Write-through + pull-on-open | Local-first UX, server catches up |
| 5 | Server schema | Single blob row per user, `schemaVersion` column | Quick now, migrate to normalized tables later without breaking clients |
| 6 | Backend | **Firebase Auth + Firestore** | Free tier; Supabase free seats already used elsewhere |

## 4. Architecture

Three layers, each with one job:

```
┌──────────────────────────────────────────────────────┐
│ App.tsx + UI                                          │
│   uses useProgress() and useSession()                 │
└───────────────┬──────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────┐
│ lib/progressStore.ts                                  │
│   - useProgress() hook: read + grade + reset          │
│   - delegates to whichever StorageAdapter is active   │
└───────────────┬──────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────┐
│ lib/storage/StorageAdapter.ts (interface)             │
│   loadProgress() / saveProgress() / onRemoteChange?   │
│                                                       │
│   ├─ LocalAdapter   (signed-out)                      │
│   │     AsyncStorage only — current behavior          │
│   │                                                   │
│   └─ SyncedAdapter  (signed-in)                       │
│         AsyncStorage  +  Firestore                    │
│         pull-on-open, write-through, max-merge        │
└──────────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────┐
│ lib/auth.ts                                           │
│   useSession()  →  { user | null, loading }           │
│   sendMagicLink(email), completeMagicLink(url),       │
│   signOut()                                           │
└──────────────────────────────────────────────────────┘
```

When `useSession()` flips from null → user, `progressStore` swaps `LocalAdapter` for `SyncedAdapter` and runs the one-time merge. UI does not re-render trees; it just sees fresher progress numbers.

`DATABASE-PLAN.md` already prescribes this adapter shape: *"Introduce a storage adapter so app code does not care whether progress is local or remote."*

## 5. Data Model (Firestore)

Single collection, one document per user.

```
/users/{uid}
  progress:       map     // ProgressByCard — same shape as local AsyncStorage today
  schemaVersion:  number  // starts at 1
  updatedAt:      timestamp
  email:          string  // denormalized from auth, optional, for debugging
```

### Security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Equivalent to Postgres RLS: a signed-in user can only read/write their own document.

## 6. Sync Logic

### On app open

1. Restore Firebase session (Firebase SDK does this automatically using `AsyncStorage` persistence).
2. Read local `ProgressByCard` from `AsyncStorage` — render immediately.
3. If signed in: in background, fetch `/users/{uid}`.
4. Merge with **per-card max**: for each card id, take the max of every numeric field (correct count, etc.). Booleans OR together. Unknown fields prefer the side with the higher correct count.
5. If merged differs from local → update React state + write back to AsyncStorage.
6. If merged differs from server → debounced write to Firestore.

### On every grade tap

1. Update React state (instant feedback — unchanged).
2. Single 300 ms debounce fires:
   - Write to AsyncStorage (current behavior).
   - If signed in: `setDoc(/users/{uid}, { progress, schemaVersion: 1, updatedAt: serverTimestamp() }, { merge: true })`.
3. Network errors are swallowed and logged. Local stays correct; next pull-on-open heals divergence.

### On sign-in (was anonymous, now logging in)

1. User taps "Sign in to sync" → enters email → `sendSignInLinkToEmail(email)`.
2. Email arrives, user clicks link → app opens with the action URL.
3. `signInWithEmailLink(email, url)` resolves → session established.
4. Run the same "On app open" merge against the new account's document.
5. Local progress is preserved, server is updated, future devices will pull it.

### On sign-out

1. `signOut()` clears Firebase session.
2. `LocalAdapter` takes over again.
3. Local `ProgressByCard` is **kept** so the user can keep practicing offline. Next sign-in re-merges.

### Offline behavior

- Local writes always succeed; UI never blocks on the network.
- Firestore client SDK queues writes when offline and flushes when online. We don't need a custom queue.
- Pull-on-open will simply skip if offline; will run on next foreground/online event.

## 7. UI Surface (deliberately tiny)

Add to the existing menu only. No new screens.

| State | UI |
|---|---|
| Signed out | Menu row: **"Sign in to sync"** → opens a sheet with: email input, "Send magic link" button, status text ("Check your inbox at *email*"). |
| Awaiting magic-link click | Same sheet, with a "Didn't get it? Resend" link after 30 s. |
| Signed in | Menu row: shows email + "Sign out" button + small **Synced ✓** / **Syncing…** / **Offline** indicator. |

### Magic-link landing route (web)

Firebase email link includes an `?apiKey=…&oobCode=…&mode=signIn&continueUrl=…` URL. The web app on app open:

1. Detects `isSignInWithEmailLink(window.location.href)`.
2. Reads the email from `localStorage` (we stored it when sending the link).
3. Calls `signInWithEmailLink(email, url)`.
4. Cleans the URL (`history.replaceState`) and lands the user back on the practice screen.

If `localStorage` doesn't have the email (user clicked the link on a different device), prompt for email re-entry inside the same sheet.

## 8. Files Added / Changed

```
lib/
  firebase.ts              (new)  — initializeApp, getAuth, getFirestore, persistence
  auth.ts                  (new)  — sendMagicLink, completeMagicLink, signOut, useSession
  progressStore.ts         (new)  — useProgress() hook, adapter selection
  storage/
    StorageAdapter.ts      (new)  — interface
    LocalAdapter.ts        (new)  — wraps current AsyncStorage logic
    SyncedAdapter.ts       (new)  — Local + Firestore + merge
    mergeProgress.ts       (new)  — pure function, unit-testable

App.tsx                    (edit) — replace inline AsyncStorage useEffects with useProgress()
                                    add <SignInSheet /> and account menu row

app.json                   (edit) — add web "scheme" / authorized domains note
.env.example               (new)  — EXPO_PUBLIC_FIREBASE_* keys
.gitignore                 (edit) — ensure .env is ignored
docs/SCHEMA.md             (edit) — document /users/{uid} shape
docs/ROADMAP.md            (edit) — mark CTX-04 in progress
```

## 9. Environment Variables

Public Firebase web-config keys (safe to ship to client; security comes from Firestore rules + authorized domains).

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

Authorized domains in Firebase console must include:

- `localhost`
- `olab.com.au`
- The exact Vercel production alias (e.g. `bornomala.vercel.app`). Firebase does not support wildcard subdomains, so each preview hostname we want to test against must be added explicitly. Day-to-day previews can be tested via `localhost`.

## 10. Test Plan (manual, web-only)

Run after implementation lands.

1. **No-login still works.** Open app cold, practice 5 cards, refresh. Progress persists. ✅
2. **Magic-link send.** Sign-in sheet → enter email → button shows "Check your inbox" → email arrives within 1 min.
3. **Magic-link consume same device.** Click link → land on practice screen, signed in.
4. **Magic-link consume other device.** Click link from phone email when sheet was opened on laptop → app prompts for email re-entry → completes.
5. **Local → cloud merge.** Practice 10 cards signed out. Sign in. Reload app on a second browser signed in as same user → progress matches.
6. **Cloud → device merge.** From device A, practice more. From device B (already signed in), reload → progress updates within a few seconds (or on next manual refresh).
7. **Offline grade.** Disconnect network, grade 3 cards, reconnect → server reflects them within a few seconds.
8. **Sign out preserves local.** Sign out → local progress untouched, can keep practicing.
9. **Sign back in re-merges.** Sign in again with same account → server progress (which may be ahead) merges back without loss.
10. **Two-device race.** Grade simultaneously on A and B → final state is per-card max of both. (No card should regress.)

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Users click magic link on a device that doesn't have the email cached | Sheet falls back to "enter your email again" — Firebase supports this |
| Firestore free tier exhausted | Writes are debounced 300 ms; reads are once-per-app-open. ~1 read + N debounced writes per session. Well under Spark limits. |
| Authorized domain mismatch on preview URLs | Document the add-domain step in `docs/prompts/build/CTX-04-…` |
| Firestore offline queue grows unbounded if user is offline for days | Firestore SDK caps cache; acceptable. Worst case: local works, sync resumes. |
| Schema change later (move to normalized tables) | `schemaVersion` column lets us branch on read; old clients keep writing v1 until updated |

## 12. Rollout

Single deploy. No feature flag needed — the change is additive (new menu row appears; existing flow untouched). If something goes wrong, revert; local progress is unaffected.

## 13. Time Estimate

| Chunk | Time |
|---|---|
| Firebase project + Auth (email link) + Firestore + rules + authorized domains | 30 min |
| `lib/firebase.ts` client + env wiring (Expo web) | 30 min |
| `lib/auth.ts` + `useSession` hook | 1 hr |
| `StorageAdapter` interface + `LocalAdapter` + `SyncedAdapter` + `mergeProgress` (with one unit test for merge) | 2 hr |
| Refactor `App.tsx` to `useProgress()` | 1.5 hr |
| Sign-in sheet + account menu row + sync indicator | 1.5 hr |
| Magic-link landing handling (web) | 1 hr |
| Manual test pass (the 10 cases above) | 1.5 hr |

**Total**: ~9 hrs focused build. Realistically **1 dev day heads-down**, **2 calendar days** with normal interruptions. Native deep-link handling for iOS/Android is **+0.5 day** when those platforms are added — out of scope here.

## 14. Open questions for implementation phase

- Pick a Firebase project name (`bornomala-prod` suggested).
- Confirm `olab.com.au` is the only production domain to whitelist initially.
- Decide whether sign-in sheet should be a modal or a bottom sheet (UX-only — defer to implementation).
