# CTX-09 — Accounts Foundation (Firebase)

**Status**: ⏳ Pending
**Created**: 2026-05-06
**Supersedes drafts in**: `CTX-03-database-foundation.md`, `CTX-04-user-accounts-progress-sync.md`
**Roadmap link**: `docs/plans/bornomala-roadmap-may2026-improvements.md` → row 2 + per-prompt scope
**Provider chosen**: Firebase Auth + Firestore (locked 2026-05-06 by Bappy)
**$ value**: 9000
**Urgency**: 4
**Score**: 7.5

## What this context window does

Stand up Firebase Auth + Firestore for PoraShikhi. Add sign-in / sign-up / profile screens, sync the learner's per-letter progress to the cloud, and preserve guest mode (no-account = local-only, same UX as today). Lay the seam for Teacher Mode (CTX-17) by giving every user a `role` field defaulted to `'student'`.

## Prerequisites

- Bappy has provisioned a Firebase project at console.firebase.google.com.
- Bappy has Auth enabled (Email/Password + Apple + Google) and Firestore (Native mode).
- Bappy has the iOS bundle ID added to Firebase for Apple sign-in (if iOS testing this round).
- The agent has access to: `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`. If any are missing, **stop and ask Bappy** before installing or editing.

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Worktree

Spin up a worktree branch `feat/ctx-09-accounts` so this runs in parallel with UI work on `main`.

## Recommended model

Opus 4.6 (`claude-opus-4-6`) — auth + sync + security rules need careful reasoning.

---

## Prompt to paste

```markdown
## Before starting

git checkout -b feat/ctx-09-accounts
git pull origin main --rebase

**Read these files first:**
- `App.tsx` (full file — understand current state shape, AsyncStorage key, menu panel)
- `lib/learning.ts` (the `LetterProgress` shape — Firestore docs mirror this)
- `package.json` (current Expo + React Native versions)
- `docs/plans/bornomala-roadmap-may2026-improvements.md` (CTX-09 section, master spec)

**Confirm with Bappy** if `EXPO_PUBLIC_FIREBASE_*` env vars are not in `.env.local`. Do not invent values.

---

## Task 1 — Install Firebase + auth deps

```bash
npx expo install firebase expo-auth-session expo-crypto @react-native-async-storage/async-storage
```

Add `expo-auth-session` plugin to `app.json` if iOS scheme not yet configured.

---

## Task 2 — Firebase client (`lib/firebase/`)

Create:
- `lib/firebase/client.ts` — `initializeApp` once, export `auth` and `db` (`getAuth`, `getFirestore`). Web: call `enableIndexedDbPersistence(db)` inside try/catch (suppress multi-tab warnings).
- `lib/firebase/auth.ts` — wrappers: `signInEmail`, `signUpEmail`, `signOutUser`, `signInWithApple`, `signInWithGoogle`, `onAuthChange(callback)`. Use `signInWithCredential` pattern with `expo-auth-session`.
- `lib/firebase/profile.ts` — `getOrCreateProfile(uid, displayName, email)` writes to `users/{uid}` if missing.
- `lib/firebase/progress.ts` — `subscribeProgress(uid, onSnapshot)`, `upsertCardProgress(uid, cardId, data)` (debounced 1s in caller), `migrateLocalToCloud(uid, localProgress)`.

---

## Task 3 — Firestore data model

Document the schema in a new file `docs/SCHEMA-FIRESTORE.md`:

```
users/{uid}
  displayName: string
  email: string
  role: 'student' | 'teacher'   // default 'student' — seam for CTX-17
  createdAt: Timestamp
  lastSeenAt: Timestamp
  schemaVersion: 1

users/{uid}/letterProgress/{cardId}
  // mirrors LetterProgress from lib/learning.ts
  correctCount, wrongCount, seenCount: number
  mastered: boolean
  streak, bestStreak: number
  recentResults: ('c' | 'w')[]
  firstSeenAt, lastSeenAt: Timestamp | null
  updatedAt: Timestamp

users/{uid}/sessions/{sessionId}   // optional — write at session end
  startedAt, endedAt: Timestamp
  cardsSeen, cardsMastered: number
```

---

## Task 4 — Firestore security rules

Write `firestore.rules` in repo root. A user can only read/write under their own `uid`. Reject all other paths. Teachers will be granted cross-user reads in CTX-17 — leave a `// TODO(CTX-17)` comment where that hook will go.

```
match /users/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
  match /letterProgress/{cardId} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
  match /sessions/{sessionId} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
}
```

Print the `firebase deploy --only firestore:rules` command for Bappy to run; do not deploy.

---

## Task 5 — Auth screens (`screens/auth/`)

- `SignInScreen.tsx` — email + password, "Sign in with Apple" (iOS only), "Sign in with Google", "Forgot password?", link to sign up.
- `SignUpScreen.tsx` — display name + email + password, password rules, link back to sign in.
- `ForgotPasswordScreen.tsx` — email input + send reset link.

Style to match the existing PoraShikhi visual language (cream background, dark navy text, the same button styles you see in `App.tsx`). Bangla labels: `সাইন ইন`, `নতুন অ্যাকাউন্ট`, `পাসওয়ার্ড ভুলে গেছি`.

---

## Task 6 — Profile screen + menu integration

- `screens/profile/ProfileScreen.tsx` — shows `displayName`, `email`, `role`, sign-out button, "Delete account" link (calls `deleteUser` from firebase auth).
- In `App.tsx`, add a single new menu item near the top of the menu panel: `প্রোফাইল`. Tapping it routes to ProfileScreen if signed in, or SignInScreen if not.
- **Do not touch any other menu items in this CTX** (those are CTX-08's territory). One additive change only.

---

## Task 7 — Sync layer

- On app mount: if signed in, subscribe to `users/{uid}/letterProgress` snapshot. On snapshot, hydrate local `progress` state (merge — local wins on conflict during the same session).
- In `applyGrade` (lib/learning.ts caller in App.tsx): keep optimistic local update; **debounce** cloud upsert by 1s per card (use a per-card timer map). Cloud writes are fire-and-forget; failures log to console only.
- Use Firestore offline persistence so writes queue when offline (CTX-16 will surface this in UX).

---

## Task 8 — AsyncStorage → Cloud migration (one-time)

On first sign-in for a user that has existing local progress:
1. Read AsyncStorage `bornomala.progress.v1` (or current key).
2. Batch upload each card to `users/{uid}/letterProgress/{cardId}` using `setDoc({ merge: true })`.
3. Mark AsyncStorage key `porashikhi.cloudMigratedAt` with the ISO timestamp so it doesn't re-migrate on every sign-in.

---

## Task 9 — Guest mode preserved

If `auth.currentUser` is null, the app behaves exactly as today — local AsyncStorage only, no cloud calls, no sync layer active. The Profile menu item shows "Sign in to sync" instead of opening the profile screen.

---

## Task 10 — Tests

- `lib/firebase/auth.test.ts` — mock `firebase/auth`, verify wrapper functions call through correctly.
- `lib/firebase/progress.test.ts` — mock `firebase/firestore`, verify debounce + merge logic.
- Existing `lib/learning.test.ts` MUST still pass unchanged (no algorithm edits in this CTX).

---

## Verification (run before declaring done)

1. `npm run typecheck` — passes.
2. `npm test` — all tests pass (including new Firebase tests).
3. `npm run web` — app loads, guest mode works as before, menu shows new "প্রোফাইল" item.
4. With env vars set, sign-up flow creates a Firebase user + a `users/{uid}` doc.
5. Practice 3 cards while signed in → check Firestore console, see `letterProgress/{cardId}` docs with correct counts.
6. Sign out, sign in on a different browser → progress hydrates from cloud.
7. Airplane-mode test: do 5 grades offline → reconnect → see writes flush to Firestore.
8. Existing local-only user: sign up for the first time → local progress appears in Firestore after migration.

## Out of scope (do NOT do in this CTX)

- Teacher role flows (CTX-17)
- Offline UX banner (CTX-16)
- Touching other menu items (CTX-08)
- Any algorithm changes (DIAG-01 only)
- App Store submission config (CTX-13)

## Stop conditions

- Stop and ask Bappy if any Firebase env var is missing.
- Stop and ask if any Firebase product (Auth provider, Firestore mode) is not yet enabled in the Firebase console.
- Stop and ask before deploying security rules.

---

## Handoff

When complete, update this file's status to ✅ and append:
- Branch name: `feat/ctx-09-accounts`
- Commit count
- One-line summary
- Any follow-ups discovered (file as inbox items, do not action)
- Confirmation that all tests pass and guest mode is unbroken
```
