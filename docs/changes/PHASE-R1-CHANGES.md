# Refactor R1: Home, Review Answers, content protection, colours

## 1. Continue Learning removed

`ContinueLearningCard` is deleted. `continueLearning` is removed from the Home contract (`homeSummarySchema`), the mock Home API and the screen. The unused strings were removed; `home.continue.chapter` is renamed `home.recent.chapter` and `home.continue.emptySub` is now `home.empty` (English and Amharic keep the same 353 keys).

## 2. Review answers

After any exam or COC set is submitted, the result shows **Review answers**. It opens `ExamReview`: one question at a time (light on memory when questions contain formulas) with Previous / Next, a status badge (Correct, Incorrect, Not answered), the student's choice marked, the correct answer, and the explanation. A question left blank shows "Not answered" with the answer and reason, without marking it wrong. Short-answer boxes are read-only in review.

- New: `exams/components/ExamReview.tsx`. Changed: `ExamFlow` (new `review` phase), `ExamResultView` (button), `FeedbackPanel` and `QuestionView` (`skipped`), `TextField` (`editable`), strings in both languages (Amharic needs native review).
- Works for exams and COC because both use `ExamFlow`. Quizzes already show feedback after every question.
- **Limit:** the answers are kept in memory for that visit. Reopening an old result from Progress shows the score only. Reviewing old results later needs the answers stored per result; say if you want that (small change, F4e).
- An exam submitted automatically while the student was away (F4d) has no review.

## 3. Content protection

- `expo-screen-capture`: Android blocks screenshots and screen recording and hides the app in the recent-apps preview; iOS blocks recording and blanks screenshots.
- A faint watermark (masked phone or email, for example `091•••44 · Mastara`) covers every screen. It does not get in the way of touches.
- Applies to the whole signed-in app, not only content screens: simpler and safer, and the student's own receipts come from the bank app or gallery, which are not affected. Turn off with `EXPO_PUBLIC_PROTECT_CONTENT=false` to take screenshots for design or support.

**What this cannot do (please be clear with your team):**
- **A second camera or phone pointed at the screen cannot be blocked by any app.** The watermark deters this and lets a leaked photo be traced to an account; it does not prevent it.
- A rooted phone, an emulator or a screen-mirroring tool can bypass the screenshot block. Rooted-device detection can be added later.
- Content already on a student's phone is protected only by the encrypted database (needs the development build).
- Real protection of content value also needs server rules: one device per account (done), downloading only after payment, and watermarked PDFs for the Scan-to-PDF files (B6).

## 4. Colours and icons

The "only four colours" rule is replaced, on purpose: four **core** colours (text, brand, buttons, errors) plus eight **accent** colours for decoration (`packages/ui-tokens/src/accents.ts`): blue, violet, emerald, orange, cyan, amber, fuchsia, lime. Every accent passes a 3:1 contrast check with a white icon (tested). Accents never carry meaning alone: errors stay red with words and icons.

- Every icon has its own colour by default (`ICON_ACCENT`); filled icons are used for tiles.
- Each **course** has its own colour (initial tile, progress bar, Progress tab), the same everywhere via `accentForKey(course.id)`; same for topics, quiz chapters and universities.
- Home: My Courses (violet), Learning Stats (emerald), Store Status (orange) with tinted cards; COC card fuchsia with a trophy. Tabs: Home blue, Course violet, Progress emerald, Profile orange. Store products, notifications, profile rows, support, COC screen and result are coloured too.
- New: `shared/ui/IconTile.tsx` (`IconTile`, `LetterTile`), `ProgressBar` `accent` prop, `NumberCircle` `accent` prop, `theme.accents`, `accentForKey`, and ten new icons (trophy, language, phone, shield, support, receipt, clock, star, quiz, review).

## Install

```bash
npm install
cd apps/mobile && npx expo install expo-screen-capture
npm run format            # the changes were not run through Prettier
npm test
```

`expo-screen-capture` works in Expo Go.

## Verified here

- Domain tests 23/23 (new: `maskIdentifier`), ui-tokens tests 5/5 (accent stability, spread, contrast, danger never used for decoration). Domain and token packages type-check.
- New components type-check against stubbed React Native types (remaining messages came from my stubs).
- Both language files are valid JSON with matching keys.

## NOT verified (needs your phone)

1. Screenshot attempt shows a black or blocked image; screen recording is blocked; the recents preview is hidden.
2. The watermark is visible but not distracting on a light and a dark photo; text and answer buttons stay tappable under it.
3. Watermark over a formula paragraph (web view) still shows.
4. Review answers works for a normal exam, a COC set, a skipped question, a multiple-answer question and a short-answer question.
5. Colours: check each screen on a real phone in daylight; tell me which colours to change. Icon names come from Ionicons; if one is missing the build will say so.
6. Amharic text in the new review screen and exam leave sheet.
