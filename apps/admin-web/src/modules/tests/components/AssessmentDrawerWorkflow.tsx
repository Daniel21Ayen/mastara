// apps/admin-web/src/modules/tests/components/AssessmentDrawerWorkflow.tsx
'use client';

import React, { useState } from 'react';
import { Icon } from '@/shared/ui';
import { MathInputHelper, KaTeXRenderer } from '@/shared/math';
import { StudentPreviewModal } from '@/shared/preview';
import { SharedQuestionEditor, QuestionData } from './SharedQuestionEditor';
import styles from './AssessmentDrawerWorkflow.module.css';

export interface AssessmentFormData {
  id?: string;
  title: string;
  instructions: string;
  kind: 'QUIZ' | 'MID' | 'FINAL' | 'MOCK' | 'COC';
  courseId: string;
  courseTitle?: string;
  chapterNumber?: number;
  durationMinutes?: number;
  status: 'DRAFT' | 'PUBLISHED';
  questions: QuestionData[];
}

interface AssessmentDrawerWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<AssessmentFormData>;
  onSave: (data: AssessmentFormData) => Promise<void> | void;
}

export function AssessmentDrawerWorkflow({
  isOpen,
  onClose,
  initialData,
  onSave,
}: AssessmentDrawerWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState(initialData?.title || '');
  const [instructions, setInstructions] = useState(initialData?.instructions || '');
  const [kind, setKind] = useState<AssessmentFormData['kind']>(initialData?.kind || 'QUIZ');
  const [courseId, setCourseId] = useState(initialData?.courseId || 'c-1');
  const [chapterNumber, setChapterNumber] = useState<number>(initialData?.chapterNumber || 1);
  const [durationMinutes, setDurationMinutes] = useState<number>(initialData?.durationMinutes || 60);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>(initialData?.status || 'DRAFT');
  const [questions, setQuestions] = useState<QuestionData[]>(initialData?.questions || []);

  // Question editing sub-flow
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // Student Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (!title.trim()) {
      alert('Please enter an assessment title.');
      return;
    }
    setCurrentStep(2);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const itemA = questions[index];
    const itemB = questions[targetIndex];
    if (!itemA || !itemB) return;
    const copy = [...questions];
    copy[index] = itemB;
    copy[targetIndex] = itemA;
    setQuestions(copy);
  };

  const handleDeleteQuestion = (index: number) => {
    if (confirm('Are you sure you want to remove this question?')) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleSaveQuestion = (qData: QuestionData) => {
    if (editingQuestionIndex !== null) {
      const copy = [...questions];
      copy[editingQuestionIndex] = qData;
      setQuestions(copy);
      setEditingQuestionIndex(null);
    } else {
      setQuestions([...questions, qData]);
      setIsAddingQuestion(false);
    }
  };

  const handleSubmit = async (submitStatus?: 'DRAFT' | 'PUBLISHED') => {
    if (!title.trim()) {
      alert('Please provide a title');
      return;
    }
    const finalStatus = submitStatus || status;
    await onSave({
      id: initialData?.id,
      title,
      instructions,
      kind,
      courseId,
      chapterNumber,
      durationMinutes: kind === 'QUIZ' ? undefined : durationMinutes,
      status: finalStatus,
      questions,
    });
    onClose();
  };

  const isExam = kind !== 'QUIZ';

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
          {/* Header Action Bar */}
          <div className={styles.header}>
            <div>
              <h2 className={styles.headerTitle}>
                {initialData?.id ? 'Edit Assessment' : 'New Assessment Setup'}
              </h2>
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.previewStudentBtn}
                onClick={() => setIsPreviewOpen(true)}
                title="Preview assessment as student (read-only, desktop/mobile frames)"
              >
                <Icon name="eye" size={15} />
                Preview as Student
              </button>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Close"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
          </div>

          {/* Stepper Tabs */}
          <div className={styles.stepperBar}>
            <button
              type="button"
              className={`${styles.stepTab} ${currentStep === 1 ? styles.stepTabActive : ''}`}
              onClick={() => setCurrentStep(1)}
            >
              <span className={styles.stepNum}>1</span>
              <span>Details & Scope</span>
            </button>
            <button
              type="button"
              className={`${styles.stepTab} ${currentStep === 2 ? styles.stepTabActive : ''}`}
              onClick={handleNextStep}
            >
              <span className={styles.stepNum}>2</span>
              <span>Question Builder ({questions.length})</span>
            </button>
          </div>

          {/* Body Area */}
          <div className={styles.bodyArea}>
            {/* If currently editing or adding a question with SharedQuestionEditor */}
            {(isAddingQuestion || editingQuestionIndex !== null) ? (
              <SharedQuestionEditor
                title={editingQuestionIndex !== null ? `Edit Question #${editingQuestionIndex + 1}` : 'Add New Question'}
                initialData={
                  editingQuestionIndex !== null
                    ? questions[editingQuestionIndex]
                    : undefined
                }
                onSave={handleSaveQuestion}
                onCancel={() => {
                  setIsAddingQuestion(false);
                  setEditingQuestionIndex(null);
                }}
              />
            ) : currentStep === 1 ? (
              /* Step 1: Details & Instructions */
              <div className={styles.formCard}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Assessment Title *</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Chapter 4: Electric Circuits & Resistance"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Assessment Type / Kind</label>
                    <select
                      className={styles.select}
                      value={kind}
                      onChange={(e) => setKind(e.target.value as any)}
                    >
                      <option value="QUIZ">Quiz / Section Check (Untimed)</option>
                      <option value="MID">Midterm Exam (Timed)</option>
                      <option value="FINAL">Final Exam (Timed)</option>
                      <option value="MOCK">Mock Exam (Timed)</option>
                      <option value="COC">COC Certification Exam</option>
                    </select>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Parent Course</label>
                    <select
                      className={styles.select}
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                    >
                      <option value="c-1">General Physics I (Freshman)</option>
                      <option value="c-2">Calculus & Linear Algebra</option>
                      <option value="c-3">Introduction to Computing</option>
                    </select>
                  </div>
                </div>

                {/* Chapter or Semester Scope */}
                <div style={{ display: 'grid', gridTemplateColumns: isExam ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Scope / Chapter Number</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      className={styles.input}
                      value={chapterNumber}
                      onChange={(e) => setChapterNumber(parseInt(e.target.value, 10) || 1)}
                    />
                  </div>

                  {isExam && (
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Exam Duration (Minutes)</label>
                      <input
                        type="number"
                        min={5}
                        max={300}
                        step={5}
                        className={styles.input}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 60)}
                      />
                    </div>
                  )}
                </div>

                {/* Course Entitlement Model Notice (SRS Alignment) */}
                <div className={styles.infoBanner}>
                  <Icon name="checkCircle" size={18} />
                  <div>
                    <strong>Course Entitlement Active:</strong> Access control is automatically bound to the parent course enrollment policy. Students who purchase or enroll in this course gain immediate access without manual student assignment lists or access keys.
                  </div>
                </div>

                {/* Instructions with KaTeX Support */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Instructions / Description</label>
                  <textarea
                    rows={4}
                    className={styles.textarea}
                    placeholder="Enter instructions or guidelines for students. Math LaTeX formulas supported ($E=mc^2$)..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                  <MathInputHelper
                    value={instructions}
                    onChange={setInstructions}
                    placeholderHelp="Formula tips: Use $...$ for inline formulas and $$...$$ for display equations"
                  />
                </div>
              </div>
            ) : (
              /* Step 2: Question Builder */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                      Questions in this Assessment ({questions.length})
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                      Reorder, configure types, and preview KaTeX formulas.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() => setIsAddingQuestion(true)}
                  >
                    <Icon name="plus" size={15} />
                    Add Question
                  </button>
                </div>

                {questions.length === 0 ? (
                  <div className={styles.emptyQuestions}>
                    <Icon name="fileText" size={36} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No questions added yet.</p>
                    <p style={{ margin: 0, fontSize: '0.8rem' }}>
                      Add your first question using the shared question builder with real-time KaTeX support.
                    </p>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={() => setIsAddingQuestion(true)}
                    >
                      <Icon name="plus" size={15} />
                      Add Question
                    </button>
                  </div>
                ) : (
                  <div className={styles.questionsList}>
                    {questions.map((q, idx) => (
                      <div key={idx} className={styles.questionItem}>
                        <div className={styles.qNumber}>Q{idx + 1}</div>
                        <div className={styles.qPrompt}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span className={styles.badge}>{q.type.replace('_', ' ')}</span>
                            {q.points && <span className={styles.badge}>{q.points} pts</span>}
                          </div>
                          <div>
                            <KaTeXRenderer text={q.prompt} />
                          </div>
                          {q.options && q.options.length > 0 && (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
                              {q.options.length} answer options provided
                            </div>
                          )}
                        </div>
                        <div className={styles.qActions}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, 'up')}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            disabled={idx === questions.length - 1}
                            onClick={() => handleMoveQuestion(idx, 'down')}
                            title="Move Down"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => setEditingQuestionIndex(idx)}
                            title="Edit Question"
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            onClick={() => handleDeleteQuestion(idx)}
                            title="Delete Question"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          {!isAddingQuestion && editingQuestionIndex === null && (
            <div className={styles.footer}>
              <div>
                {currentStep === 2 && (
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setCurrentStep(1)}
                  >
                    ← Back to Details
                  </button>
                )}
              </div>
              <div className={styles.btnGroup}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={onClose}
                >
                  Cancel
                </button>
                {currentStep === 1 ? (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleNextStep}
                  >
                    Next: Question Builder →
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => handleSubmit('DRAFT')}
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={() => handleSubmit('PUBLISHED')}
                    >
                      Publish Assessment
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview as Student Modal */}
      <StudentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={title || 'Assessment Preview'}
        subtitle={isExam ? `${kind} Exam • ${durationMinutes} min` : 'Quiz / Section Check'}
        category={courseId}
        mode="assessment"
        content={instructions}
        questions={questions.map((q, idx) => ({
          id: `q-${idx}`,
          prompt: q.prompt,
          type: q.type,
          options: q.options,
        }))}
      />
    </>
  );
}
