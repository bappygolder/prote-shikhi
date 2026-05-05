# Spec Review Cadence — Learning Algorithm

**Created**: 2026-05-05
**Type**: Process rule (not a one-off task)
**Owner**: Bappy (with Claude in the loop)
**Status**: Active

---

## The rule

After **every real teaching session** with a student, [`docs/LEARNING-ALGORITHM.md`](../../LEARNING-ALGORITHM.md) gets a review pass.

The algorithm is the heart of the product. It cannot improve from theory alone — it improves from contact with real learners. That contact has to flow back into the spec, otherwise the spec drifts away from reality and the code follows.

---

## How a review pass works

After a session:

1. **Capture friction.** What confused the learner? What did the algorithm get wrong? What surprised the teacher? Write it as a UX journal in `docs/inbox/discuss/YYYY-MM-DD-<slug>-teaching-session-ux.md`, same shape as the [first session journal](../discuss/2026-05-04-bornomala-first-teaching-session-ux.md).
2. **Re-read the algorithm spec** from top to bottom. Slow scan, not a skim.
3. **For each friction point**, ask:
   - Is this addressed by an existing rule? (If yes — confirm parameters are right.)
   - Is this a new rule? (If yes — draft pseudocode and add as a new section, or extend an existing one.)
   - Is this an open question? (If yes — add to §17 with options.)
4. **Update the change log** (§19) with a new draft version (`v2.0-draft-N+1`).
5. **Bump version number**, update `Last updated` date.
6. **If parameters changed and code already exists**, file a follow-up plan to align code to spec.

---

## What NOT to do

- Don't change the spec mid-session ("emergency hotfix"). Capture in the journal first; reflect on it after.
- Don't delete options from §17 silently. Mark them **LOCKED** with the chosen option so we have traceability.
- Don't lose rejected alternatives — move them to §18 with a one-line reason.

---

## Triggers (when this rule fires)

- A real teaching session with a learner ended.
- A user-test or pilot user reported friction.
- A noticeable algorithmic mistake the teacher had to manually compensate for.
- New product surface (e.g. audio, tracing, multi-learner profiles) introduces a new signal.

---

## What this is NOT

This is **not** about iterating on UI / UX. UI iterations have their own cadence. This is specifically about the **learning algorithm** — the function that decides what to show next and when a card is mastered.

UI changes that affect the algorithm's *interface* (e.g. a new "skip" button) DO trigger a spec review, because the algorithm needs to know how to interpret a skip.

---

## When to graduate this

When the spec stops changing after 3-4 sessions in a row, the algorithm has stabilized. At that point we can:
- Drop the `-draft-N` suffix and go to `v2.0`.
- Reduce review cadence to "after teaching sessions that surface new friction" rather than "every session".
- Move this file from `inbox/do/` to a permanent process doc.
