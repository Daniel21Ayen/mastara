# Refactor R2: student portal

## 1. Show / Hide on every explanation

In the review after an exam or COC set, and in the instant feedback of practice quizzes, the explanation is now behind a **Show explanation / Hide explanation** button (hidden by default). In the review the open/closed choice is kept for the whole list, so it survives scrolling away and back. Both languages (Amharic needs native review).

## 2. COC card on Home

The wide COC banner is gone. COC Exam is now a card of the same size and style as My Courses, Learning Stats and Store Status, in a **2 x 2 grid** (fuchsia, trophy icon). *I read "as courses card" as "same card style". If you meant COC next to the course list or in the three-card row, say so.*

## 3. Exam time set by the Admin

- Every exam and every COC set carries its own `minutes`, set by the Admin and validated: whole minutes from **5 to 240** (`isValidExamMinutes`, tested; the contract rejects anything else).
- The student sees it on every exam row ("20 questions · 45 min"), on the instructions screen and in the timer.
- The mock server now stands in for the Admin's settings (Mid 45, Final 90, Mock 60, COC 60) instead of one fixed value.
- **A sitting keeps the time it started with.** If the Admin changes an exam's time while a student is in the middle of it, that student's clock does not change (the saved sitting stores its minutes).
- The Admin screen to edit the time is part of **F10d** (Questions and COC sets); it is now written into the roadmap.

## 4. Exams scroll instead of Next

- Exam and COC sittings show **all questions on one scrolling page**, with a sticky header (answered count, progress, timer, All questions) and Submit at the end. The Previous / Next buttons are gone.
- **All questions** opens the numbered palette; tapping a number scrolls to that question. The question nearest the top is the "current" one (highlighted in the palette and saved, so a resumed exam scrolls back to it).
- The list is virtualized: only the questions near the screen are built, so a long exam with formulas does not hold many web views in memory. Each question re-renders only when its own answer or flag changes.
- **Review answers** is also one scrolling page, built the same way.
- Practice quizzes (Quiz 1/2/3) still go one question at a time, because each answer gives instant feedback before moving on. Tell me if those should scroll too.

## 5. Light and Dark theme on every page

- **Profile → Appearance**: Light / Dark / Auto (follow the phone). Also under the language buttons on the login page, so it can be set before signing in. Applies to every page at once and is remembered.
- **Dark palette** with the same colour names as the light one: dark page, slightly lighter cards, light text, the brand blue and the error red lightened, accents lightened with dark ink on top. The unselected answer option now has a visible edge in both themes.
- **Contrast is tested for both themes** (18 tests): body and muted text on card and page (4.5:1), links and error text on card, page and tinted backgrounds (4.5:1), button text (4.5:1), icons on accent tiles (3:1). One real weakness was found and fixed (light amber was 2.75:1).
- **How it was done.** Styles used to be built once at start from fixed colours, so they could not change. All **92 screen and component files were converted** with a script (TypeScript compiler API), not by hand: `const useStyles = createStyles((theme) => ({...}))` at the top and `const styles = useStyles()` in the component. Four files with colour tables were converted by hand (AppText, Badge, OptionButton, watermark). The old way is now blocked by a lint rule.
- Status bar, keyboard and system dialogs follow the theme; `userInterfaceStyle` is now `automatic`.

## Verified here

- Domain tests 45, token tests 18 (new: dark palette contrast, both themes complete). Domain and token packages type-check.
- **Whole-app structural type check** (external packages stubbed, all internal imports and props resolved for real): zero undefined names, missing imports or missing exports, before and after the conversion. It found one real mistake (a default parameter in `Icon` that used the theme before its hook ran); fixed.
- **AST audit of the conversion**: 154 hook calls, every one at the top level of a component or hook, none in a plain helper or inside a callback; no `StyleSheet.create` or old `theme` import left; no memoized value that could keep an old colour (KaTeX page now depends on the text colour).
- No hard-coded colours anywhere in the app (searched).
- Both language files valid, same 369 keys.

## NOT verified (needs your phone)

I could not install Expo or run the app here, so nothing was seen on a screen.

1. **Dark mode, every page.** Open each screen in Dark and look for anything still bright, unreadable or invisible. Likely trouble spots: the colour accents on cards, the COC and fuchsia banner, the splash screen, the payment screens. Tell me which look wrong and I will adjust the palette.
2. **Switch while on a screen.** Toggling in Profile changes the page behind it at once; the login page toggle works before signing in.
3. **KaTeX formulas in dark mode.** Text inside a formula paragraph must turn light. The page is rebuilt when the theme changes.
4. **Scrolling exam on a low-end phone**: smooth scrolling, no blank gaps, jump from the palette lands on the right question (a long jump may need a moment to find it), flags and answers stay when scrolling away and back, resume scrolls to the saved question.
5. **Memory** on a question list with fraction formulas in many questions (see F4b notes).
6. **Show / Hide** in review and in practice feedback.
7. **A first run after install** shows the phone's theme, then the saved choice.
8. Run `npm run format` once: the conversion script does not reformat, and a few long lines will move.

## Known limits

- The first frame follows the phone's own setting before the saved choice is read (a very brief flash is possible if the saved choice differs).
- Dark colours were chosen from contrast rules and judgement, not seen on screen.
- The Admin portal (F10) will reuse the same light and dark palettes from `packages/ui-tokens`.
