// apps/admin-web/src/modules/tests/screens/ContentQuizStudioScreen.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuizNumber } from '@mastara/domain';
import { Icon } from '@/shared/ui';
import { useContentCourse } from '@/modules/content';
import { TestListScreen } from './TestListScreen';
import styles from '@/modules/content/components/ContentStudio.module.css';

interface Props {
  quizNo: QuizNumber;
}

interface AnswerOption {
  id: string;
  letter: string;
  text: string;
  isCorrect: boolean;
}

interface ChapterQuizItem {
  id: string;
  name: string;
  title: string;
}

const DEFAULT_QUIZ_CHAPTERS: ChapterQuizItem[] = [
  { id: 'ch-1', name: 'Chapter 1', title: 'Chapter 1 - English Basics' },
  { id: 'ch-2', name: 'Chapter 2', title: 'Chapter 2 - Grammar & Syntax' },
  { id: 'ch-3', name: 'Chapter 3', title: 'Chapter 3 - Vocabulary Building' },
];

const DEFAULT_OPTIONS: AnswerOption[] = [
  { id: 'opt-1', letter: 'A', text: 'A place to live', isCorrect: true },
  { id: 'opt-2', letter: 'B', text: 'A written work', isCorrect: false },
  { id: 'opt-3', letter: 'C', text: 'A type of food', isCorrect: false },
  { id: 'opt-4', letter: 'D', text: 'A vehicle', isCorrect: false },
];

export function ContentQuizStudioScreen({ quizNo }: Props) {
  const router = useRouter();
  const { courses, course, setCourseId } = useContentCourse();

  // Mode: 'editor' (Screenshot 1) vs 'table' (Screenshot 3)
  const [viewMode, setViewMode] = useState<'editor' | 'table'>('editor');

  const [chapters, setChapters] = useState<ChapterQuizItem[]>(DEFAULT_QUIZ_CHAPTERS);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('ch-1');
  const [isFreeTrial, setIsFreeTrial] = useState(false);

  // Question Form State
  const [questionType, setQuestionType] = useState('Multiple Choice');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [questionPrompt, setQuestionPrompt] = useState(
    'What is the correct meaning of the word "book"?',
  );
  const [options, setOptions] = useState<AnswerOption[]>(DEFAULT_OPTIONS);
  const [explanation, setExplanation] = useState(
    'A book is a written work, often made of pages, that gives information or tells a story.',
  );
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const fallbackQuizChapter: ChapterQuizItem = DEFAULT_QUIZ_CHAPTERS[0] ?? {
    id: 'ch-1',
    name: 'Chapter 1',
    title: 'Chapter 1',
  };
  const selectedChapter: ChapterQuizItem =
    chapters.find((ch) => ch.id === selectedChapterId) ?? chapters[0] ?? fallbackQuizChapter;

  const handleTitleChange = (newTitle: string) => {
    setChapters((prev) =>
      prev.map((ch) => (ch.id === selectedChapter.id ? { ...ch, title: newTitle } : ch)),
    );
  };

  const handleAddChapter = () => {
    const nextNum = chapters.length + 1;
    const newCh: ChapterQuizItem = {
      id: `ch-${Date.now()}`,
      name: `Chapter ${nextNum}`,
      title: `Chapter ${nextNum} - Review Topic`,
    };
    setChapters((prev) => [...prev, newCh]);
    setSelectedChapterId(newCh.id);
  };

  const handleTabClick = (targetQuiz: QuizNumber) => {
    router.push(`/content/tests/quiz-${targetQuiz}`);
  };

  const handleOptionTextChange = (id: string, text: string) => {
    setOptions((prev) => prev.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  };

  const handleSelectCorrect = (id: string) => {
    setOptions((prev) =>
      prev.map((opt) => ({
        ...opt,
        isCorrect: opt.id === id,
      })),
    );
  };

  const handleDeleteOption = (id: string) => {
    if (options.length <= 2) return;
    const filtered = options.filter((opt) => opt.id !== id);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const reindexed = filtered.map((opt, i) => ({
      ...opt,
      letter: alphabet[i] || `${i + 1}`,
    }));
    setOptions(reindexed);
  };

  const handleAddOption = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nextIdx = options.length;
    const newOpt: AnswerOption = {
      id: `opt-${Date.now()}`,
      letter: alphabet[nextIdx] || `${nextIdx + 1}`,
      text: '',
      isCorrect: false,
    };
    setOptions((prev) => [...prev, newOpt]);
  };

  const handleAddQuestion = () => {
    setSaveStatus(`Question ${questionNumber} saved!`);
    setQuestionNumber((n) => n + 1);
    setQuestionPrompt('');
    setExplanation('');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleSave = (kind: 'DRAFT' | 'PUBLISH') => {
    setSaveStatus(kind === 'PUBLISH' ? 'Quiz published live!' : 'Quiz draft saved!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className={styles.container}>
      {/* Top Header Row */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Quizzes</h1>
          <span className={styles.draftBadge}>Draft v3</span>
          {saveStatus && (
            <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
              ✓ {saveStatus}
            </span>
          )}
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.actionBtnOutline}
            onClick={() => setViewMode((m) => (m === 'editor' ? 'table' : 'editor'))}
            title="Toggle between Question Editor and Questions Table"
          >
            <Icon name={viewMode === 'editor' ? 'table' : 'edit'} size={16} />
            {viewMode === 'editor' ? 'Questions Table' : 'Question Editor'}
          </button>
          <button
            type="button"
            className={styles.actionBtnOutline}
            onClick={() => handleSave('DRAFT')}
          >
            <Icon name="eye" size={16} />
            Preview as student
          </button>
          <button
            type="button"
            className={styles.actionBtnOutline}
            onClick={() => handleSave('DRAFT')}
          >
            <Icon name="check" size={16} />
            Save draft
          </button>
          <button
            type="button"
            className={styles.actionBtnPrimary}
            onClick={() => handleSave('PUBLISH')}
          >
            <Icon name="send" size={16} />
            Publish
          </button>
        </div>
      </header>

      {/* If table view mode is toggled, render the Test Management Table from Screenshot 3 */}
      {viewMode === 'table' ? (
        <TestListScreen quizNo={quizNo} />
      ) : (
        /* 2-Column Body Layout matching Screenshot 1 */
        <div className={styles.workspace}>
          {/* Left Card: Course & Chapters */}
          <aside className={styles.sidebarCard}>
            <label className={styles.sidebarLabel} htmlFor="quiz-course-select">
              Course
            </label>
            <div className={styles.courseSelectWrapper}>
              <span className={styles.courseSelectIcon}>
                <Icon name="book" size={18} />
              </span>
              <select
                id="quiz-course-select"
                className={styles.courseSelect}
                value={course?.id || ''}
                onChange={(e) => setCourseId(e.target.value)}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
                {courses.length === 0 && <option value="eng">English Language</option>}
              </select>
            </div>

            <span className={styles.chaptersLabel}>Chapters</span>
            <ul className={styles.chapterList}>
              {chapters.map((ch) => {
                const isSelected = ch.id === selectedChapter.id;
                return (
                  <li
                    key={ch.id}
                    className={`${styles.chapterItem} ${
                      isSelected ? styles.chapterItemActiveBlue : ''
                    }`}
                    onClick={() => setSelectedChapterId(ch.id)}
                  >
                    <span className={styles.chapterIcon}>
                      <Icon name="file" size={16} />
                    </span>
                    <span>{ch.name}</span>
                  </li>
                );
              })}
            </ul>

            <button type="button" className={styles.addChapterBtn} onClick={handleAddChapter}>
              + Add New Chapter
            </button>
          </aside>

          {/* Right Card: Quiz Question Editor */}
          <main className={styles.editorCard}>
            <div className={styles.tabsBar}>
              <nav className={styles.tabsList} aria-label="Quiz levels">
                <button
                  type="button"
                  className={`${styles.tabBtn} ${quizNo === 1 ? styles.tabBtnActive : ''}`}
                  onClick={() => handleTabClick(1)}
                >
                  Quiz 1
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${quizNo === 2 ? styles.tabBtnActive : ''}`}
                  onClick={() => handleTabClick(2)}
                >
                  Quiz 2
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${quizNo === 3 ? styles.tabBtnActive : ''}`}
                  onClick={() => handleTabClick(3)}
                >
                  Quiz 3
                </button>
              </nav>

              <label className={styles.freeTrialContainer}>
                <input
                  type="checkbox"
                  className={styles.freeTrialCheckbox}
                  checked={isFreeTrial}
                  onChange={(e) => setIsFreeTrial(e.target.checked)}
                />
                <span>Free trial</span>
              </label>
            </div>

            {/* Chapter title */}
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="quiz-chapter-title">
                Chapter title
              </label>
              <input
                id="quiz-chapter-title"
                type="text"
                className={styles.textInput}
                value={selectedChapter.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Chapter 1 - English Basics"
              />
            </div>

            {/* Row: Question Type & Question Number */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel} htmlFor="quiz-question-type">
                  Question type
                </label>
                <select
                  id="quiz-question-type"
                  className={styles.selectInput}
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                >
                  <option value="Multiple Choice">Multiple Choice</option>
                  <option value="True / False">True / False</option>
                  <option value="Short Answer">Short Answer</option>
                  <option value="Blank Space">Blank Space</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel} htmlFor="quiz-question-number">
                  Question number
                </label>
                <input
                  id="quiz-question-number"
                  type="number"
                  className={styles.textInput}
                  value={questionNumber}
                  onChange={(e) => setQuestionNumber(Number(e.target.value))}
                  min={1}
                />
              </div>
            </div>

            {/* Question Prompt */}
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="quiz-question-prompt">
                Question
              </label>
              <textarea
                id="quiz-question-prompt"
                className={styles.textareaInput}
                value={questionPrompt}
                onChange={(e) => setQuestionPrompt(e.target.value)}
                placeholder="What is the correct meaning of the word 'book'?"
                rows={3}
              />
            </div>

            {/* Answers List */}
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel}>Answers</label>
              <div className={styles.answersList}>
                {options.map((opt) => (
                  <div key={opt.id} className={styles.answerRow}>
                    <input
                      type="radio"
                      name="correct-answer-radio"
                      className={styles.answerRadio}
                      checked={opt.isCorrect}
                      onChange={() => handleSelectCorrect(opt.id)}
                      title="Select as correct answer"
                    />
                    <input
                      type="text"
                      className={styles.answerInput}
                      value={opt.text ? `${opt.letter}. ${opt.text}` : `${opt.letter}. `}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^[A-Z]\.\s*/, '');
                        handleOptionTextChange(opt.id, val);
                      }}
                      placeholder={`${opt.letter}. Option text`}
                    />
                    <button
                      type="button"
                      className={styles.answerDeleteBtn}
                      onClick={() => handleDeleteOption(opt.id)}
                      title="Delete answer option"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" className={styles.addAnswerBtn} onClick={handleAddOption}>
                + Add Answer
              </button>
            </div>

            {/* Description (Explanation) */}
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="quiz-explanation">
                Description (Explanation)
              </label>
              <textarea
                id="quiz-explanation"
                className={styles.textareaInput}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="A book is a written work, often made of pages, that gives information or tells a story."
                rows={3}
              />
            </div>

            <button type="button" className={styles.addQuestionBtn} onClick={handleAddQuestion}>
              + Add Question
            </button>
          </main>
        </div>
      )}
    </div>
  );
}
