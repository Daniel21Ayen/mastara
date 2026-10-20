// apps/admin-web/src/modules/content/components/ViewDetailModal.tsx
'use client';

import { Icon } from '@/shared/ui';
import type { MaterialItem, TestSetItem } from '../state/contentManagementData';
import styles from './ViewDetailModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  testSet?: TestSetItem | null;
  material?: MaterialItem | null;
}

export function ViewDetailModal({ isOpen, onClose, testSet, material }: Props) {
  if (!isOpen || (!testSet && !material)) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.titleInfo}>
            <span className={styles.categoryBadge}>
              {testSet ? `Quiz ${testSet.quizNo} · Test Set` : `${material?.type.toUpperCase()} · Material`}
            </span>
            <h2 className={styles.title}>
              {testSet ? `${testSet.chapterTitle}: ${testSet.chapterSubtitle}` : `${material?.chapterTitle}: ${material?.title}`}
            </h2>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {testSet && (
            <div className={styles.contentSection}>
              <div className={styles.grid2}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Test Set ID</span>
                  <span className={styles.metaValueHighlight}>{testSet.testSetId}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Course Title</span>
                  <span className={styles.metaValue}>{testSet.courseTitle}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Program</span>
                  <span className={styles.metaValue}>{testSet.program}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Semester & Stream</span>
                  <span className={styles.metaValue}>{testSet.semester} · {testSet.stream}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Time Allowed</span>
                  <span className={styles.metaValue}>{testSet.timeAllowed}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Access Permission</span>
                  <span className={styles.metaValue}>{testSet.access}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Status</span>
                  <span className={`${styles.statusBadge} ${testSet.status === 'Active' ? styles.statusActive : styles.statusInactive}`}>
                    {testSet.status}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Verification</span>
                  <span className={testSet.verified ? styles.verifiedYes : styles.verifiedNo}>
                    {testSet.verified ? '✓ Verified by Admin' : 'Pending Verification'}
                  </span>
                </div>
              </div>

              <div className={styles.notesBox}>
                <h4 className={styles.notesHeading}>Assessment Overview</h4>
                <p className={styles.notesText}>
                  This test set covers {testSet.chapterTitle} concepts for {testSet.courseTitle}. Students have {testSet.timeAllowed} to complete the questions once opened.
                </p>
              </div>
            </div>
          )}

          {material && (
            <div className={styles.contentSection}>
              <div className={styles.grid2}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Material Title</span>
                  <span className={styles.metaValueHighlight}>{material.title} - {material.subtitle}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Course</span>
                  <span className={styles.metaValue}>{material.courseTitle}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Chapter</span>
                  <span className={styles.metaValue}>{material.chapterTitle} ({material.chapterSubtitle})</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Semester & Program</span>
                  <span className={styles.metaValue}>{material.semester} · {material.program}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Status</span>
                  <span className={`${styles.statusBadge} ${material.status === 'Active' ? styles.statusActive : styles.statusInactive}`}>
                    {material.status}
                  </span>
                </div>
              </div>

              <div className={styles.notesBox}>
                <h4 className={styles.notesHeading}>Content Synopsis</h4>
                <p className={styles.notesText}>
                  {material.content || 'Study material and curriculum resource for academic courses.'}
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
