'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { QuizNumber } from '@mastara/domain';
import { Icon } from '@/shared/ui';
import { useContentCourse, useModules } from '@/modules/content';
import { testsApi } from '../api/tests.api';
import { useQuestions } from '../hooks/useTests';
import { QuestionPreviewDialog } from '../components/QuestionPreviewDialog';
import { toInput, type QuestionFormState } from '../lib/questionForm';
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
  topicId?: string;
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

function toForm(type: string): 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'BLANK_SPACE' {
  if (type === 'True / False') return 'TRUE_FALSE';
  if (type === 'Short Answer') return 'SHORT_ANSWER';
  if (type === 'Blank Space') return 'BLANK_SPACE';
  return 'MULTIPLE_CHOICE';
}

export function ContentQuizStudioScreen({ quizNo }: Props) {
  const router = useRouter();
  const { courses, course, setCourseId } = useContentCourse();
  const modulesState = useModules(course?.id || '');
  const questionsQuery = useQuestions({ quizNo, courseId: course?.id || '' });

  // Mode: 'editor' (Screenshot 1) vs 'table' (Screenshot 3)
  const [viewMode, setViewMode] = useState<'editor' | 'table'>('editor');
  const [previewOpen, setPreviewOpen] = useState(false);

  // Chapters from backend or fallback
  const dynamicChapters: ChapterQuizItem[] = useMemo(() => {
    if (modulesState.data && modulesState.data.length > 0) {
      return modulesState.data.map((m) => ({
        id: m.id,
        name: `Chapter ${m.number}`,
        title: `Chapter ${m.number} - ${m.title}`,
        topicId: m.topics?.[0]?.id || m.id,
      }));
    }
    return DEFAULT_QUIZ_CHAPTERS;
  }, [modulesState.data]);

  const [chapters, setChapters] = useState<ChapterQuizItem[]>(DEFAULT_QUIZ_CHAPTERS);
  const activeChapters = chapters.length > 0 ? chapters : dynamicChapters;

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const selectedChapter =
    activeChapters.find((ch) => ch.id === selectedChapterId) ?? activeChapters[0] ?? DEFAULT_QUIZ_CHAPTERS[0]!;

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
      title: `Chapter ${nextNum} - New Chapter`,
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

  const currentFormState: QuestionFormState = useMemo(() => {
    const formKind = toForm(questionType);
    const correctIdx = options.findIndex((opt) => opt.isCorrect);
    return {
      quizNo,
      topicId: selectedChapter.topicId || selectedChapter.id,
      title: `${selectedChapter.name} - Q${questionNumber}`,
      form: formKind,
      prompt: questionPrompt,
      options: options.map((opt) => opt.text),
      correctOption: correctIdx >= 0 ? correctIdx : null,
      trueIsCorrect: formKind === 'TRUE_FALSE' ? (options.find((o) => o.isCorrect)?.letter === 'A') : null,
      acceptedAnswers: [options.find((o) => o.isCorrect)?.text || ''],
      explanation,
    };
  }, [quizNo, selectedChapter, questionNumber, questionType, questionPrompt, options, explanation]);

  const handleAddQuestion = async () => {
    if (!course?.id) return;
    setSaving(true);
    try {
      const input = toInput(course.id, currentFormState, 'PUBLISHED');
      await testsApi.createQuestion(input);
      setSaveStatus(`Question ${questionNumber} saved to database!`);
      setQuestionNumber((n) => n + 1);
      setQuestionPrompt('');
      setExplanation('');
      void questionsQuery.reload();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus(`Error saving question: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setSaveStatus(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (kind: 'DRAFT' | 'PUBLISH') => {
    if (!course?.id) return;
    setSaving(true);
    try {
      await testsApi.updateQuiz(course.id, quizNo, {
        minutes: 30,
        status: kind === 'PUBLISH' ? 'PUBLISHED' : 'DRAFT',
      });
      setSaveStatus(kind === 'PUBLISH' ? 'Quiz published live to database!' : 'Quiz draft saved to database!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus(`Error saving quiz: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setSaveStatus(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Header Row */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Quizzes</h1>
          <span className={styles.draftBadge}>Draft v3</span>
          {saveStatus && (
            <span style={{ fontSize: '0.85rem', color: '#1a56db', fontWeight: 600 }}>
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
            onClick={() => setPreviewOpen(true)}
            title="Preview question as seen by students"
          >
            <Icon name="eye" size={16} />
            Preview as student
          </button>
          <button
            type="button"
            className={styles.actionBtnOutline}
            onClick={() => void handleSave('DRAFT')}
            disabled={saving}
          >
            <Icon name="check" size={16} />
            Save draft
          </button>
          <button
            type="button"
            className={styles.actionBtnPrimary}
            onClick={() => void handleSave('PUBLISH')}
            disabled={saving}
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
                    className={`${styles.chapterItem} ${isSelected ? styles.chapterItemActiveBlue : ''
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
              <MathInputHelper
                value={questionPrompt}
                onChange={setQuestionPrompt}
                placeholderHelp="Formulas: Inline $E = mc^2$, Display block $$\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$"
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

            {/* Answer explanation */}
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="quiz-explanation">
                Answer explanation
              </label>
              <textarea
                id="quiz-explanation"
                className={styles.textareaInput}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="A book is a written work, often made of pages, that gives information or tells a story."
                rows={3}
              />
              <MathInputHelper
                value={explanation}
                onChange={setExplanation}
                placeholderHelp="LaTeX math symbols supported in student explanation"
              />
            </div>

            <button
              type="button"
              className={styles.addQuestionBtn}
              onClick={() => void handleAddQuestion()}
              disabled={saving}
            >
              {saving ? 'Saving...' : '+ Add Question'}
            </button>
          </main>
        </div>
      )}

      {/* Student Preview Modal with desktop/mobile frames, stripped correct answers */}
      <StudentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={selectedChapter.title || 'Quiz Preview'}
        subtitle={`Quiz ${quizNo} • ${questionType}`}
        category={course?.title || 'Course'}
        mode="question"
        prompt={questionPrompt}
        questionType={questionType}
        options={options.map((opt) => opt.text.trim() || `${opt.letter}. Option text`)}
      />
    </div>
  );
}
