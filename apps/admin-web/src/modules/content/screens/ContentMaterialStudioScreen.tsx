// apps/admin-web/src/modules/content/screens/ContentMaterialStudioScreen.tsx
'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/shared/ui';
import { useContentCourse } from '../state/ContentCourseContext';
import {
  StudentPreviewModal,
  type StudentPreviewChapter,
  type AttachedDocumentInfo,
} from '../components/StudentPreviewModal';
import { SavedScanPickerModal } from '../components/SavedScanPickerModal';
import styles from '../components/ContentStudio.module.css';

export type MaterialTab = 'modules' | 'notes' | 'amharic-notes';

interface Props {
  initialTab?: MaterialTab;
}

interface ChapterData extends StudentPreviewChapter {
  attachedPdf?: AttachedDocumentInfo | null;
}

const DEFAULT_CHAPTERS: ChapterData[] = [
  {
    id: 'ch-1',
    name: 'Chapter 1',
    title: 'Chapter 1 - English Basics',
    content: 'Learn common words and phrases for everyday use.',
    attachedPdf: null,
  },
  {
    id: 'ch-2',
    name: 'Chapter 2',
    title: 'Chapter 2 - Grammar & Syntax',
    content: 'Master sentence structure, tenses, and grammatical rules.',
    attachedPdf: null,
  },
  {
    id: 'ch-3',
    name: 'Chapter 3',
    title: 'Chapter 3 - Vocabulary Building',
    content: 'Expand academic and workplace vocabulary with contextual examples.',
    attachedPdf: null,
  },
  {
    id: 'ch-4',
    name: 'Chapter 4',
    title: 'Chapter 4 - Reading Comprehension',
    content: 'Strategies for skimming, scanning, and analyzing technical texts.',
    attachedPdf: null,
  },
  {
    id: 'ch-5',
    name: 'Chapter 5',
    title: 'Chapter 5 - Writing & Composition',
    content: 'Drafting professional essays, reports, and academic summaries.',
    attachedPdf: null,
  },
];

export function ContentMaterialStudioScreen({ initialTab = 'modules' }: Props) {
  const router = useRouter();
  const { courses, course, setCourseId } = useContentCourse();
  const [activeTab, setActiveTab] = useState<MaterialTab>(initialTab);
  const [chapters, setChapters] = useState<ChapterData[]>(DEFAULT_CHAPTERS);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('ch-1');
  const [isFreeTrial, setIsFreeTrial] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Modals state
  const [isStudentPreviewOpen, setIsStudentPreviewOpen] = useState(false);
  const [isScanPickerOpen, setIsScanPickerOpen] = useState(false);

  // File Inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannedFileInputRef = useRef<HTMLInputElement>(null);

  const selectedChapter =
    chapters.find((ch) => ch.id === selectedChapterId) ?? chapters[0] ?? DEFAULT_CHAPTERS[0]!;

  const handleTitleChange = (newTitle: string) => {
    setChapters((prev) =>
      prev.map((ch) => (ch.id === selectedChapter.id ? { ...ch, title: newTitle } : ch)),
    );
  };

  const handleContentChange = (newContent: string) => {
    setChapters((prev) =>
      prev.map((ch) => (ch.id === selectedChapter.id ? { ...ch, content: newContent } : ch)),
    );
  };

  const handleAddChapter = () => {
    const nextNum = chapters.length + 1;
    const newCh: ChapterData = {
      id: `ch-${Date.now()}`,
      name: `Chapter ${nextNum}`,
      title: `Chapter ${nextNum} - New Topic`,
      content: '',
      attachedPdf: null,
    };
    setChapters((prev) => [...prev, newCh]);
    setSelectedChapterId(newCh.id);
  };

  // Attach PDF or Scanned PDF directly to Chapter content field
  const handleAttachPdf = (fileName: string, sizeKb: number, isScanned: boolean) => {
    const tag = isScanned
      ? `[Attached Scanned PDF: ${fileName} (${sizeKb} KB)]`
      : `[Attached PDF: ${fileName} (${sizeKb} KB)]`;

    const docInfo: AttachedDocumentInfo = {
      name: fileName,
      sizeKb,
      isScanned,
    };

    setChapters((prev) =>
      prev.map((ch) => {
        if (ch.id !== selectedChapter.id) return ch;
        const current = ch.content || '';
        // If content already exists, append with newline, else set directly
        const updatedContent = current.trim() ? `${current}\n\n${tag}` : tag;
        return {
          ...ch,
          content: updatedContent,
          attachedPdf: docInfo,
        };
      }),
    );

    setSaveStatus(
      `${isScanned ? 'Scanned PDF' : 'PDF'} "${fileName}" attached to Chapter content field!`,
    );
    setTimeout(() => setSaveStatus(null), 3500);
  };

  const handlePdfUpload = (files: FileList | null, isScanned = false) => {
    if (!files || files.length === 0 || !files[0]) return;
    const file = files[0];
    if (!file) return;
    const sizeKb = Math.round(file.size / 1024);
    handleAttachPdf(file.name, sizeKb, isScanned);
  };

  const handleRemoveAttachment = () => {
    const attached = selectedChapter.attachedPdf;
    setChapters((prev) =>
      prev.map((ch) => {
        if (ch.id !== selectedChapter.id) return ch;
        let updatedContent = ch.content || '';
        if (attached) {
          const tagPrefix = attached.isScanned ? '[Attached Scanned PDF:' : '[Attached PDF:';
          const lines = updatedContent.split('\n');
          const filtered = lines.filter((l) => !l.includes(tagPrefix) || !l.includes(attached.name));
          updatedContent = filtered.join('\n').trim();
        }
        return {
          ...ch,
          content: updatedContent,
          attachedPdf: null,
        };
      }),
    );
    setSaveStatus('Attachment removed.');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const handleTabClick = (tab: MaterialTab, href: string) => {
    setActiveTab(tab);
    router.push(href);
  };

  const handleSave = (kind: 'DRAFT' | 'PUBLISH') => {
    setSaveStatus(kind === 'PUBLISH' ? 'Material published successfully!' : 'Draft saved!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className={styles.container}>
      {/* Top Header Row */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Courses</h1>
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
            onClick={() => setIsStudentPreviewOpen(true)}
            id="btn-preview-as-student"
            title="Preview as student"
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

      {/* 2-Column Body Layout */}
      <div className={styles.workspace}>
        {/* Left Card: Course & Chapters */}
        <aside className={styles.sidebarCard}>
          <label className={styles.sidebarLabel} htmlFor="material-course-select">
            Course
          </label>
          <div className={styles.courseSelectWrapper}>
            <span className={styles.courseSelectIcon}>
              <Icon name="book" size={18} />
            </span>
            <select
              id="material-course-select"
              className={styles.courseSelect}
              value={course?.id || ''}
              onChange={(e) => setCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
              {courses.length === 0 && <option value="eng101">Communicative English</option>}
            </select>
          </div>

          <span className={styles.chaptersLabel}>Courses</span>
          <ul className={styles.chapterList}>
            {chapters.map((ch) => {
              const isSelected = ch.id === selectedChapter.id;
              return (
                <li
                  key={ch.id}
                  className={`${styles.chapterItem} ${
                    isSelected ? styles.chapterItemActiveLight : ''
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

        {/* Right Card: Editor with Related Tabs */}
        <main className={styles.editorCard}>
          <div className={styles.tabsBar}>
            <nav className={styles.tabsList} aria-label="Material types">
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'notes' ? styles.tabBtnActive : ''}`}
                onClick={() => handleTabClick('notes', '/content/notes')}
              >
                Notes
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'modules' ? styles.tabBtnActive : ''}`}
                onClick={() => handleTabClick('modules', '/content/modules')}
              >
                Modules
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${
                  activeTab === 'amharic-notes' ? styles.tabBtnActive : ''
                }`}
                onClick={() => handleTabClick('amharic-notes', '/content/amharic-notes')}
              >
                Amharic Notes
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

          {/* Form */}
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="chapter-title-input">
              Chapter title
            </label>
            <input
              id="chapter-title-input"
              type="text"
              className={styles.textInput}
              value={selectedChapter.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Chapter 1 - English Basics"
            />
          </div>

          {/* Chapter Content Field with Attachment */}
          <div className={styles.formGroup}>
            <div className={styles.fieldHeaderRow}>
              <label className={styles.fieldLabel} htmlFor="chapter-content-input">
                Chapter content
              </label>
              {selectedChapter.attachedPdf && (
                <span className={styles.attachedBadgeTop}>
                  <Icon name={selectedChapter.attachedPdf.isScanned ? 'scan' : 'file'} size={13} />
                  {selectedChapter.attachedPdf.isScanned ? 'Scanned PDF' : 'PDF'} Attached
                </span>
              )}
            </div>

            <textarea
              id="chapter-content-input"
              className={styles.textareaInput}
              value={selectedChapter.content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Learn common words and phrases for everyday use."
              rows={6}
            />

            <p className={styles.materialNote}>
              English and Amharic are fields of one note. Formulas use $...$ and preview offline. Attached PDFs/scans are linked above.
            </p>

            {selectedChapter.attachedPdf && (
              <div className={styles.attachedPill}>
                <div className={styles.attachedPillLeft}>
                  <div
                    className={
                      selectedChapter.attachedPdf.isScanned
                        ? styles.attachedIconWrapScanned
                        : styles.attachedIconWrap
                    }
                  >
                    <Icon name={selectedChapter.attachedPdf.isScanned ? 'scan' : 'file'} size={16} />
                  </div>
                  <div className={styles.attachedInfo}>
                    <span className={styles.attachedFileName}>
                      {selectedChapter.attachedPdf.name}
                    </span>
                    <span className={styles.attachedFileSize}>
                      {selectedChapter.attachedPdf.isScanned ? 'Scanned PDF' : 'Attached PDF'} ·{' '}
                      {selectedChapter.attachedPdf.sizeKb} KB
                    </span>
                  </div>
                </div>

                <div className={styles.attachedPillActions}>
                  <button
                    type="button"
                    className={styles.attachedPreviewBtn}
                    onClick={() => setIsStudentPreviewOpen(true)}
                    title="View as student"
                  >
                    <Icon name="eye" size={14} />
                    View as student
                  </button>
                  <button
                    type="button"
                    className={styles.removeAttachedBtn}
                    onClick={handleRemoveAttachment}
                    title="Remove attached PDF"
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hidden file pickers */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => {
              handlePdfUpload(e.target.files, false);
              e.target.value = '';
            }}
          />

          <input
            ref={scannedFileInputRef}
            type="file"
            accept="application/pdf,image/*"
            hidden
            onChange={(e) => {
              handlePdfUpload(e.target.files, true);
              e.target.value = '';
            }}
          />

          {/* Action buttons */}
          <div className={styles.materialActions}>
            <button
              type="button"
              className={styles.actionBtnOutlineSecondary}
              onClick={() => fileInputRef.current?.click()}
              id="btn-attach-pdf"
            >
              <Icon name="file" size={16} />
              Attach PDF
            </button>
            <button
              type="button"
              className={styles.actionBtnOutlineSecondary}
              onClick={() => scannedFileInputRef.current?.click()}
              id="btn-attach-scanned-pdf"
            >
              <Icon name="scan" size={16} />
              Attach Scanned PDF
            </button>
            <button
              type="button"
              className={styles.actionBtnOutlineSecondary}
              onClick={() => setIsScanPickerOpen(true)}
              id="btn-browse-scans"
            >
              <Icon name="fileText" size={16} />
              Saved Scans
            </button>
            <Link href="/scan-to-pdf" className={styles.actionBtnOutlineSecondary}>
              <Icon name="scan" size={16} />
              Open scan to PDF
            </Link>
          </div>
        </main>
      </div>

      {/* Student Reading Preview Modal */}
      <StudentPreviewModal
        isOpen={isStudentPreviewOpen}
        onClose={() => setIsStudentPreviewOpen(false)}
        courseTitle={course?.title || 'Communicative English'}
        courseCode={course?.code || 'ENG101'}
        chapter={selectedChapter}
        chapters={chapters}
        onSelectChapter={setSelectedChapterId}
        isFreeTrial={isFreeTrial}
        attachedPdf={selectedChapter.attachedPdf}
      />

      {/* Saved Scan Picker Modal */}
      <SavedScanPickerModal
        isOpen={isScanPickerOpen}
        onClose={() => setIsScanPickerOpen(false)}
        onSelectScan={(name, sizeKb) => handleAttachPdf(name, sizeKb, true)}
      />
    </div>
  );
}
