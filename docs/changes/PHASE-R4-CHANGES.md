# Refactor R4: scrolling pages with a Next button

**Rule applied everywhere:** the student moves by **scrolling up and down**; a **Next** button under each page is there for those who prefer tapping. Nothing depends on the Next button.

| Where | Before | Now |
|---|---|---|
| **Modules, Notes, Amharic Notes** | One lesson per screen, Previous / Next buttons | The lessons of the tab follow one another on **one continuous page** (one language, as set by the tab). **Next** under each lesson jumps to the next; scrolling up goes back. The header shows the lesson on screen. |
| **Quiz 1, 2, 3** | One question per screen; Next enabled only after checking | **All questions on one scrolling page.** Instant feedback and locked answers stay. Single and True/False check on tap; multiple choice and short answer have a Check button. **Next** under each question (**Finish** on the last). Progress header shows the question on screen. |
| **Exams (Mid, Final, Mock) and COC exams** | Scrolling list (R2) with no Next | Same scrolling list, and now **Next** under each question (Submit stays at the end). All questions palette still jumps to a question. |
| **Review answers** (after exams and COC) | Scrolling list | Same, with **Next** under each reviewed question. |

The old **Previous** buttons are removed (scroll up instead); their strings are deleted (392 keys, English and Amharic match).

## Behaviour details

- **Memory and data.** Every list is virtualized: only the pages near the screen are built. For lessons, only the lesson on screen and its neighbours are loaded from the server (or the phone, if downloaded), so scrolling does not download a whole course.
- **Starting position.** Tapping lesson 5 opens the page at lesson 5; lessons 1 to 4 are above it. A resumed quiz or exam scrolls back to the question the student was on.
- **Locked lessons** stay in the sequence and show the lock message; the Next button still moves past them.
- **Downloads and access** are unchanged: a downloaded lesson, quiz, exam or COC set scrolls the same way offline, and locks still follow course access.
- **Exam integrity unchanged:** the timer, saving, resume, submit and review work as in R2 and F4d.

## Added / changed

- Domain: `practiceReducer` action `goto` (same question again is not a change, so scrolling does not re-save), with `practice.test.ts` (4 tests)
- New: `shared/hooks/useScrollList.ts`, `reader/hooks/useLessonFeed.ts`, `reader/components/LessonPage.tsx`, `quizzes/components/PracticeQuestionItem.tsx`
- Rewritten: `reader/screens/ReaderScreen.tsx`, `quizzes/screens/PracticeScreen.tsx`, `quizzes/hooks/usePracticeSession.ts`
- Changed: `ExamQuestionItem.tsx`, `ExamRunner.tsx` (now uses the shared hooks), `ExamReview.tsx`, both language files, README, ROADMAP, ARCHITECTURE
- **Deleted:** `reader/hooks/useReader.ts` (replaced by `useLessonFeed.ts`). If you copy files by hand, delete it too.

## Verified here

- Domain tests **61 of 61** (new: practice goto and locking). Domain type-checks.
- Whole-app structural type check (stubbed external packages, all internal imports and props resolved): no undefined names, no missing imports or exports. Hook-placement audit clean (159 hook calls). No hard-coded colours.

## NOT verified (needs your phone)

I could not run the app, so scrolling behaviour itself has not been seen. Please check:

1. **Lessons:** open lesson 3 of Notes: the page starts at lesson 3; scroll down into lesson 4 without tapping; tap **Next** under a lesson and it scrolls to the next; scroll up to lesson 2. The top bar title follows the lesson on screen. Do the same in Amharic Notes and Modules.
2. **A very long lesson** (several screens): the title in the top bar still changes correctly when you reach the next lesson.
3. **Quiz:** answer, see feedback, scroll or tap Next; Check button for select-all and short-answer; Finish on the last question shows the score; close and reopen mid-quiz returns to the same question.
4. **Exam and COC:** Next under each question; the All questions palette; submit; review with Next.
5. **Smoothness and memory** on a low-end phone, especially lessons or quizzes with formulas (web views).
6. **Jump distance:** Next on a very tall page may need a moment to find the next one on the first try (the list measures pages as it goes).

## Known limits

- A lesson far from the screen shows its title and a short wait until it is near; that is by design to save data.
- Next scrolls the next page to the top of the screen; if you prefer it to stop slightly above, say so.
