// apps/admin-web/src/modules/content/components/ViewDetailModal.tsx
'use client';

import { Icon } from '@/shared/ui';
import type { MaterialItem, QuestionBankItem } from '../state/contentManagementData';
import styles from './ViewDetailModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  questionItem?: QuestionBankItem | null;
  material?: MaterialItem | null;
}

export function ViewDetailModal({ isOpen, onClose, questionItem, material }: Props) {
  if (!isOpen || (!questionItem && !material)) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.titleInfo}>
            <span className={styles.categoryBadge}>
              {questionItem
                ? `Quiz ${questionItem.quizNo} · Question Bank (${questionItem.questionId})`
                : `${material?.type.toUpperCase()} · Material`}
            </span>
            <h2 className={styles.title}>
              {questionItem
                ? `${questionItem.chapterTitle}: ${questionItem.chapterSubtitle}`
                : `${material?.chapterTitle}: ${material?.title}`}
            </h2>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {questionItem && (
            <div className={styles.contentSection}>
              {/* Question Text Box */}
              <div className={styles.questionBox}>
                <div className={styles.questionMetaHeader}>
                  <span className={styles.questionTypeTag}>{questionItem.questionType}</span>
                  <span className={styles.questionIdTag}>{questionItem.questionId}</span>
                </div>
                <p className={styles.questionPromptText}>{questionItem.question}</p>
              </div>

              {/* Options if available */}
              {questionItem.options && questionItem.options.length > 0 && (
                <div className={styles.optionsList}>
                  <h4 className={styles.sectionHeading}>Answer Choices</h4>
                  {questionItem.options.map((opt, i) => {
                    const isCorrect = opt === questionItem.correctAnswer;
                    return (
                      <div
                        key={i}
                        className={`${styles.optionItem} ${
                          isCorrect ? styles.optionItemCorrect : ''
                        }`}
                      >
                        <span className={styles.optionMarker}>
                          {isCorrect ? '✓' : '○'}
                        </span>
                        <span className={styles.optionText}>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Explanation if available */}
              {questionItem.explanation && (
                <div className={styles.explanationBox}>
                  <h4 className={styles.notesHeading}>Explanation & Solution</h4>
                  <p className={styles.notesText}>{questionItem.explanation}</p>
                </div>
              )}

              <div className={styles.grid2}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Course Title</span>
                  <span className={styles.metaValue}>{questionItem.courseTitle}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Program</span>
                  <span className={styles.metaValue}>{questionItem.program}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Semester & Stream</span>
                  <span className={styles.metaValue}>
                    {questionItem.semester} · {questionItem.stream}
                  </span>
                </div>
                {questionItem.testSetId && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Linked Test Set</span>
                    <span className={styles.metaValueHighlight}>
                      {questionItem.testSetId}
                    </span>
                  </div>
                )}
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Status</span>
                  <span
                    className={`${styles.statusBadge} ${
                      questionItem.status === 'Active'
                        ? styles.statusActive
                        : styles.statusInactive
                    }`}
                  >
                    {questionItem.status}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Verification</span>
                  <span
                    className={
                      questionItem.verified ? styles.verifiedYes : styles.verifiedNo
                    }
                  >
                    {questionItem.verified ? '✓ Verified by Admin' : 'Pending Verification'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {material && (
            <div className={styles.contentSection}>
              <div className={styles.grid2}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Course</span>
                  <span className={styles.metaValue}>{material.courseTitle}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Chapter</span>
                  <span className={styles.metaValue}>
                    {material.chapterTitle} ({material.chapterSubtitle})
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Semester & Program</span>
                  <span className={styles.metaValue}>
                    {material.semester} · {material.program}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Status</span>
                  <span
                    className={`${styles.statusBadge} ${
                      material.status === 'Active'
                        ? styles.statusActive
                        : styles.statusInactive
                    }`}
                  >
                    {material.status}
                  </span>
                </div>
              </div>

              <div className={styles.notesBox}>
                <h4 className={styles.notesHeading}>Content Synopsis</h4>
                <p className={styles.notesText}>
                  {material.content ||
                    'Study material and curriculum resource for academic courses.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.doneBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
