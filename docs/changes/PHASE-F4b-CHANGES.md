# Phase F4b changes (KaTeX formulas, offline)

## Install (once)

```bash
npm install                                   # brings katex, @types/katex, tsx
cd apps/mobile && npx expo install react-native-webview
cd ../.. && npm run format                    # my new lines were not run through Prettier
npm test                                      # domain + formula tests
npm run dev:mobile                            # builds the KaTeX asset file first (prestart)
```

`react-native-webview` runs in Expo Go. No development build is needed for this phase.

## How it works

`RichText` splits each paragraph into text and formulas. If every formula passes `needsLayout` (simple Unicode is faithful), the paragraph
stays native `AppText` with `MathSpan`: no web view, no extra memory. If any formula needs layout (fraction, root, matrix, limits, a
script Unicode cannot draw), the **whole paragraph** is rendered by KaTeX in one offline web view so text and formulas flow together.

## Added

- `packages/domain/src/math/mathLayout.ts` (+ `.test.ts`): `needsLayout(latex)`
- `apps/mobile/scripts/build-katex-assets.mjs`: embeds 12 KaTeX fonts (168 KB woff2) into the stylesheet (244 KB), writes `katexAssets.generated.ts`
- `apps/mobile/src/core/math/`: `katexMarkup.ts`, `katexDocument.ts`, `index.ts`, `katexMarkup.test.ts`
- `apps/mobile/src/shared/ui/KatexParagraph.tsx`
- `.prettierignore`

## Changed

- `shared/ui/RichText.tsx` (routing, parse once with `useMemo`), `MathSpan.tsx` (comment), `shared/ui/index.ts` (export)
- `packages/domain/src/index.ts`, `packages/domain/package.json` (test script), `packages/domain/tsconfig.json` (excludes tests)
- `apps/mobile/package.json` (katex, @types/katex, pre-hooks, test script), `apps/mobile/tsconfig.json` (excludes tests and scripts)
- `package.json` (test script, tsx), `turbo.json` (test task), `.gitignore`, `eslint.config.mjs` (ignore generated file)
- `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`

## Verified here

- Domain rule tests pass (5/5). Markup and page tests pass against KaTeX 0.16.45 (6/6): fractions, roots, matrices render; invalid LaTeX never throws; `\href` is not produced; text is escaped; the page has no external URLs and embeds the fonts.
- The generated page was opened in desktop Chromium **with the content-security policy on**: embedded fonts load, no blocked requests, height is reported. This caught a real bug (display fractions were clipped because KaTeX paints outside its parent box); fixed by measuring the lowest painted descendant.
- Typecheck of the new files with stubbed React Native types (domain package is fully clean).

## NOT verified (needs your phone)

I could not install Expo or run Android here. Please check on a real **2–3 GB Android phone** before calling F4b done:

1. **Memory.** Open a practice question with a fraction in the prompt and in all four options (five web views). Watch the Android memory profiler against the 120 MB budget. If it is too high, the next step is one shared engine that renders formulas to cached images (not started).
2. **Amharic text inside a formula paragraph.** The web view cannot use the app's Noto Sans Ethiopic; it uses the phone's system font. Check a Tecno or Infinix phone. If glyphs are missing, embed the font in the page (adds about 0.5 MB per web view; use a subset).
3. **`katex` in Hermes.** `renderToString` is plain JS and should run; confirm one formula renders on first launch.
4. **Font look.** Text in a formula paragraph uses system sans, other paragraphs use Plus Jakarta Sans. Slightly different; accept or embed.
5. **Wide formulas** are clipped (the web view ignores touch so answer buttons keep working). Tell me if any real content is wider than a phone screen.
