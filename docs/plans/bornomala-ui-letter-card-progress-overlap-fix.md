# Bornomala — Letter Card Progress Strip Overlap Fix

> **Plan-file housekeeping**: This file was auto-created by plan mode at `~/.claude/plans/can-you-take-a-atomic-lerdorf.md`. **First step on execution**: move it to `docs/plans/bornomala-ui-letter-card-progress-overlap-fix.md` (project-scoped per `CONTENT-ROUTING.md`, named per `NAMING-CONVENTIONS.md`) and delete this stub.

---

## Context

On the trainer screen, the per-card progress strip ("এই অক্ষর X/১০" with mini fill bar) is absolutely positioned (`position: 'absolute'`, `bottom: '18%'`) inside the letter card and sits **on top of** the lower portion of the Bangla glyph. Vowel signs rendered with the dotted-circle prefix and any glyph with a descender (প, ফ, র, য, ৎ, etc.) are visually clipped by the strip overlay.

The two recent commits — `9386b05` (remove hardcoded `lineHeight`) and `79b04ba` (remove `numberOfLines`/`adjustsFontSizeToFit`/`includeFontPadding` and reduce excessive `marginBottom`) — addressed clipping at the **text-rendering** level. They did not address this **absolute-positioning overlap** between the strip and the glyph.

User-confirmed approach: keep the strip inside the card but split the card into stacked zones — glyph fills the upper zone, strip occupies a reserved bottom zone with its own space.

## Recommended Model

- **Model**: Sonnet 4.6 (`claude-sonnet-4-6`)
- **Complexity**: Medium
- **Reason**: Layout/styling change in one file, but needs careful zone sizing to keep the glyph visually centered and the decorative accents intact across phone widths.

---

## Approach

Restructure the card from "single centered container + absolute-positioned strip" into a **flex column with two normal-flow children**:

1. **Glyph zone** — `flex: 1`, centers the `<Text>` glyph horizontally and vertically.
2. **Strip zone** — fixed-height wrapper at the bottom holding `<LetterProgressMark>` in normal flow (no `position: absolute`).

The two diagonal accents (`cardAccentTop`, `cardAccentBottom`) stay absolutely positioned — they're decorative pointer-events:none elements overlaying both zones intentionally.

### Files and line references

All changes are in `App.tsx`.

| What | Lines | Change |
|---|---|---|
| Card JSX | [App.tsx:633-697](App.tsx#L633-L697) | Wrap glyph in `<View style={styles.glyphZone}>` and strip in `<View style={styles.stripZone}>`. Accents stay at top of children list. |
| `styles.card` | [App.tsx:1213-1226](App.tsx#L1213-L1226) | Add `flexDirection: 'column'`. Drop `justifyContent: 'center'` and `alignItems: 'center'` (these now live on `glyphZone`). Keep `overflow: 'hidden'`, `minHeight: 250`, padding, border. |
| `styles.letter` | [App.tsx:1244-1252](App.tsx#L1244-L1252) | Remove `marginBottom: 60` — strip zone now reserves the bottom space. |
| `styles.letterProgressMark` | [App.tsx:1255-1271](App.tsx#L1255-L1271) | Remove `position: 'absolute'` and `bottom: '18%'`. Keep `width: '82%'`, `maxWidth: 320`, `minHeight: 60`, the rest of the visual styling. |
| **New** `styles.glyphZone` | (add near `styles.card`) | `{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }` |
| **New** `styles.stripZone` | (add near `styles.card`) | `{ width: '100%', alignItems: 'center', paddingTop: 4, paddingBottom: 4 }` |

### New card JSX shape

```tsx
<Animated.View style={[styles.card, cardAnimatedStyle]}>
  <Animated.View pointerEvents="none" style={[styles.cardAccent, styles.cardAccentTop, ...]} />
  <Animated.View pointerEvents="none" style={[styles.cardAccent, styles.cardAccentBottom, ...]} />

  <View style={styles.glyphZone}>
    <Text style={[styles.letter, isCurrentVowelSign && styles.vowelSignLetter]}>
      {currentDisplayLetter}
    </Text>
  </View>

  <View style={styles.stripZone}>
    <LetterProgressMark ... />
  </View>
</Animated.View>
```

### Sizing notes

- Card `minHeight: 250` stays. Strip zone consumes ~68-76px (its `minHeight: 60` + ~8px wrapper padding). Glyph zone gets ~174-182px of vertical room.
- Vowel-sign glyph at `fontSize: 140` fits comfortably; consonant at `fontSize: 168` may feel slightly cramped. **Tuning step during execution**: if the consonant glyph visibly crowds the zone, bump `card.minHeight` to `280` rather than shrinking the glyph (preserves the strong recognition target).
- The bottom-right teal accent at `bottom: 30, right: -24, opacity: 0.5` will sit *behind* the strip zone. The strip's solid `#fffdf7` background hides any overlap cleanly.

### What stays untouched

- `cardAccent` / `cardAccentTop` / `cardAccentBottom` — decorative absolute positioning preserved.
- Top "মোট শেখা" total progress bar ([App.tsx:624-631](App.tsx#L624-L631)) — different component, different problem.
- Grading buttons, bottom nav, header — unrelated.
- Glyph fontSize values (168 / 140) — keep, only revisit if zone split visibly cramps.
- The `LetterProgressMark` internal layout (glyph preview + body + track + fill) — unchanged.

---

## Verification

1. **Type check**: `npm run typecheck` — must pass with no new errors.
2. **Run dev**: `npm start` and load on device/simulator; open the trainer.
3. **Glyph categories** — switch presets and confirm each renders with no overlap:
   - **Vowels** — অ, আ, ই, ঈ, উ, ঊ, ঋ, এ, ঐ, ও, ঔ
   - **Vowel signs** (dotted-circle prefix) — া, ি, ী, ু, ূ, ৃ, ে, ৈ, ো, ৌ ← the screenshot case
   - **Consonants with descenders** — প, ফ, র, য, য়, ৎ
   - **Consonants with ascenders/headlines** — ক, খ, গ, ত, ন
4. **Strip readability**: "এই অক্ষর X/১০" + fill bar still legible, horizontally centered, animates as letters change.
5. **Decorations intact**: orange top-left and teal bottom-right diagonal accents render with existing rotation + animated translation.
6. **Top bar unchanged**: "মোট শেখা" total bar layout matches pre-change.
7. **No card height regression**: card should feel the same height as before. If taller/shorter, tune `card.minHeight` and re-test.
8. **Recent fix preserved**: confirm we didn't reintroduce `lineHeight` / `includeFontPadding` / `numberOfLines` on the glyph (those were intentionally removed in `9386b05` and `79b04ba`).

---

## Out of scope

- Total-progress bar layout/positioning at the top of the screen.
- Bottom navigation styling.
- Grading-button styling.
- Adding new presets, audio, or tracing.
- Migrating `App.tsx` (~50KB) into smaller components — separate refactor candidate, log to `docs/inbox/discuss/` if desired.
