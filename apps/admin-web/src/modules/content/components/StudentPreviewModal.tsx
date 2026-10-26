// apps/admin-web/src/modules/content/components/StudentPreviewModal.tsx
'use client';

import { useState } from 'react';
import { parseMath, latexToUnicode } from '@mastara/domain';
import { Icon } from '@/shared/ui';
import styles from './StudentPreviewModal.module.css';

export interface StudentPreviewChapter {
  id: string;
  name: string;
  title: string;
  content: string;
}

export interface AttachedDocumentInfo {
  name: string;
  sizeKb: number;
  isScanned?: boolean;
}

interface StudentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  courseCode?: string;
  chapter: StudentPreviewChapter;
  chapters: StudentPreviewChapter[];
  onSelectChapter: (id: string) => void;
  isFreeTrial?: boolean;
  attachedPdf?: AttachedDocumentInfo | null;
}

export function StudentPreviewModal({
  isOpen,
  onClose,
  courseTitle,
  courseCode,
  chapter,
  chapters,
  onSelectChapter,
  isFreeTrial = false,
  attachedPdf,
}: StudentPreviewModalProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentIndex = chapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  const handleSimulatedDownload = (fileName: string) => {
    setDownloadNotice(`Opened "${fileName}" in Student Document Viewer.`);
    setTimeout(() => setDownloadNotice(null), 3500);
  };

  // Render text segments with KaTeX / Unicode math support
  const renderMathContent = (text: string) => {
    if (!text.trim()) {
      return <p style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>No chapter content provided yet.</p>;
    }

    const segments = parseMath(text);
    return (
      <div className={styles.contentArea}>
        {segments.map((seg, i) =>
          seg.kind === 'text' ? (
            <span key={i}>{seg.value}</span>
          ) : (
            <span key={i} className={styles.mathFormula} title="Math Expression">
              {latexToUnicode(seg.value)}
            </span>
          ),
        )}
      </div>
    );
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Student Preview Modal"
    >
      <div className={styles.modal}>
        {/* Top Header Bar */}
        <div className={styles.topHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.studentBadge}>
              <span className={styles.liveDot} />
              View as Student
            </span>
            <span className={styles.courseTag}>
              {courseTitle} {courseCode ? `(${courseCode})` : ''}
            </span>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.deviceToggle}>
              <button
                type="button"
                className={`${styles.deviceBtn} ${device === 'desktop' ? styles.deviceBtnActive : ''}`}
                onClick={() => setDevice('desktop')}
                title="Desktop View"
              >
                💻 Desktop
              </button>
              <button
                type="button"
                className={`${styles.deviceBtn} ${device === 'mobile' ? styles.deviceBtnActive : ''}`}
                onClick={() => setDevice('mobile')}
                title="Mobile View"
              >
                📱 Mobile
              </button>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close Preview"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Preview Viewport */}
        <div className={styles.previewBody}>
          <div className={device === 'mobile' ? styles.deviceFrameMobile : styles.deviceFrameDesktop}>
            {/* Context / Breadcrumb */}
            <div className={styles.breadcrumbRow}>
              <span className={styles.breadcrumbText}>
                {courseTitle} · {chapter.name}
              </span>
              {isFreeTrial && (
                <span className={styles.freeTrialTag}>
                  ✨ Free Trial
                </span>
              )}
            </div>

            {/* Chapter Title */}
            <h2 className={styles.chapterTitle}>{chapter.title || chapter.name}</h2>

            {/* Formatted Content with KaTeX/Unicode math */}
            {renderMathContent(chapter.content)}

            {/* Document Card if PDF / Scanned PDF attached */}
            {attachedPdf && (
              <div className={styles.attachedCard}>
                <div className={styles.attachedLeft}>
                  <div className={attachedPdf.isScanned ? styles.scannedIconBox : styles.pdfIconBox}>
                    <Icon name={attachedPdf.isScanned ? 'scan' : 'file'} size={22} />
                  </div>
                  <div className={styles.attachedDetails}>
                    <span className={styles.attachedFileName}>{attachedPdf.name}</span>
                    <span className={styles.attachedMeta}>
                      {attachedPdf.isScanned ? 'Scanned Document' : 'Official Course PDF'} · {attachedPdf.sizeKb} KB
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.attachedDownloadBtn}
                  onClick={() => handleSimulatedDownload(attachedPdf.name)}
                >
                  <Icon name="eye" size={14} />
                  Open Document
                </button>
              </div>
            )}

            {downloadNotice && (
              <div
                style={{
                  background: 'var(--color-success-soft)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-success)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ✓ {downloadNotice}
              </div>
            )}

            {/* Chapter Navigator for Student Mode */}
            <div className={styles.navRow}>
              <button
                type="button"
                className={styles.navBtn}
                disabled={!prevChapter}
                onClick={() => prevChapter && onSelectChapter(prevChapter.id)}
              >
                ← Previous Chapter
              </button>

              <select
                className={styles.chapterSelector}
                value={chapter.id}
                onChange={(e) => onSelectChapter(e.target.value)}
              >
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className={styles.navBtn}
                disabled={!nextChapter}
                onClick={() => nextChapter && onSelectChapter(nextChapter.id)}
              >
                Next Chapter →
              </button>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className={styles.modalFooter}>
          <p className={styles.footerHint}>
            This reflects the real-time learning experience for enrolled students on web and mobile.
          </p>
          <button type="button" className={styles.exitBtn} onClick={onClose}>
            Exit Student View
          </button>
        </div>
      </div>
    </div>
  );
}
