# Bornomala — Finalize App Logo

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Low
- Reason: Procedural image cleanup + asset replacement, no architecture decisions.

## Context

A new logo concept landed at [assets/2. Logo 2 - Gemini_Generated_Image_wnd0w6wnd0w6wnd0.png](../../assets/2. Logo 2 - Gemini_Generated_Image_wnd0w6wnd0w6wnd0.png). It's a 2048×2048 chalkboard-style rounded-square icon featuring the Bangla glyph "অ" in white chalk on a dark slate background. The raw export has two problems that block direct use:

1. **Empty grey padding** (~8–10%) wraps the actual icon on all four sides — the rounded-square art does not bleed to the canvas edges.
2. **Watermark text** "PREMIUM APP ICON – SCALABLE DESIGN" is burned into the bottom-right grey margin.

[app.json](../../app.json) wires the Expo app to four asset slots (`icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`) currently filled with the default Expo placeholders. We need a clean, square-bleed master logo, a curated set of Expo-ready exports, and a tidy filename so the new branding can be reviewed and shipped.

Goal: produce a clean 1024×1024 master logo for review, then on approval replace the four Expo asset slots and archive the raw source files.

## Approach

Two stages, gated on user review.

### Stage 1 — Produce clean master logo (do now, share for review)

1. **Install Pillow** (Python imaging — already have Python 3.14.3, no Pillow yet, no ImageMagick):
   ```
   python3 -m pip install --user pillow
   ```
   Pillow over `brew install imagemagick` because it's faster, no system-level package, and gives us a single scriptable step.

2. **Run a one-shot Python script** (kept inline in the bash call, no script file committed) that:
   - Opens the source PNG.
   - Crops off the bottom 12% before bbox detection so the watermark text doesn't pull the bounding box southward.
   - Builds a luminance mask (`L < 110`) to isolate the dark rounded-square icon, then `mask.getbbox()` for the tight bounding box of the icon body.
   - Re-anchors the bbox onto the full image, expands it to a perfect square (centered on the icon's centroid) so the result is symmetrical.
   - Saves the cropped square as **`assets/logo.png`** at 1024×1024 (LANCZOS resample).
   - Prints the detected crop rectangle + final size to stdout for traceability.

3. **Deliverable for review**: tell the user the path is [assets/logo.png](../../assets/logo.png) and pause.

### Stage 2 — Finalize into Expo asset slots (do after user approves)

Once Bappy approves the master:

1. **Move the raw source files into a `source/` archive** (so they aren't bundled by Metro):
   - `assets/1. Logo Idea 1 - Gemini_Generated_Image_*.png` → `assets/source/logo-raw-v1-rejected.png`
   - `assets/2. Logo 2 - Gemini_Generated_Image_*.png` → `assets/source/logo-raw-v2-final.png`

2. **Replace the four Expo slots** from `assets/logo.png`:
   - `assets/icon.png` — copy of master at 1024×1024 (already correct).
   - `assets/adaptive-icon.png` — 1024×1024, master pasted onto a 1024×1024 canvas with ~18% safe-area inset (Android masks the outer 33%; we want the chalkboard icon centered with breathing room).
   - `assets/splash-icon.png` — 1024×1024, master padded onto the existing `#ffffff` splash background (per [app.json:13](../../app.json) `backgroundColor: "#ffffff"`, `resizeMode: "contain"`).
   - `assets/favicon.png` — 64×64 LANCZOS downscale of the master.

3. **No changes to [app.json](../../app.json)** — the existing paths already point at the four files we're replacing.

4. **Verify** by listing `assets/` and confirming each file's pixel dimensions via `sips -g pixelHeight -g pixelWidth`.

## Files Modified

- **Created**: `assets/logo.png` (master), `assets/source/logo-raw-v1-rejected.png`, `assets/source/logo-raw-v2-final.png` (Stage 2 only)
- **Replaced**: `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash-icon.png`, `assets/favicon.png` (Stage 2 only)
- **Removed**: `assets/1. Logo Idea 1 - Gemini_Generated_Image_*.png`, `assets/2. Logo 2 - Gemini_Generated_Image_*.png` (moved into `source/`)
- **Untouched**: [app.json](../../app.json) — all asset paths stay the same.

## Verification

After Stage 1:
```
sips -g pixelHeight -g pixelWidth -g format assets/logo.png
# expect: 1024 × 1024 png
```
Visually open `assets/logo.png` and confirm: no grey margin, no watermark, square aspect, glyph centered.

After Stage 2:
```
sips -g pixelHeight -g pixelWidth assets/icon.png assets/adaptive-icon.png assets/splash-icon.png assets/favicon.png
ls assets/source/
npx expo start --clear   # confirm splash + app icon render in simulator
```
Open the Expo dev client / simulator and confirm: launch screen shows the chalkboard icon centered on white, app icon on the home screen shows the chalkboard icon (iOS will round corners cleanly since the design is already rounded-square on a dark fill).

## Open Questions

None blocking — proceeding with chalkboard-style icon as-is. If you want a tighter or looser crop, or a transparent background instead of the dark slate bleeding to the edges, that's a Stage 1.5 tweak after you see the master.
