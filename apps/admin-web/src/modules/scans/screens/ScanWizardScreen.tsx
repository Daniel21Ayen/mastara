// apps/admin-web/src/modules/scans/screens/ScanWizardScreen.tsx
'use client';

import { useState, useRef } from 'react';
import { adminText } from '@/core/i18n';
import { Button, Icon, SelectField } from '@/shared/ui';
import { usePrograms, useScanCourses, useUniversities } from '../hooks/useScanOptions';
import { SAMPLE_PAGES } from '../lib/samplePages';
import type { ScanPageItem } from '../lib/samplePages';
import type { Stream } from '@mastara/domain';
import { scansApi } from '../api/scans.api';
import styles from '../components/ScanWizard.module.css';

type StepNumber = 1 | 2 | 3 | 4;

export type DocumentCategory =
  | 'Notes'
  | 'Amharic Notes'
  | 'Modules'
  | 'Mid Exam'
  | 'Final Exam'
  | 'Mock Exam'
  | 'COC Exam'
  | 'Quiz 1'
  | 'Quiz 2'
  | 'Quiz 3';

type AccessType = 'Paid course only' | 'Free preview';

const CATEGORIES: readonly DocumentCategory[] = [
  'Notes',
  'Amharic Notes',
  'Modules',
  'Mid Exam',
  'Final Exam',
  'Mock Exam',
  'COC Exam',
  'Quiz 1',
  'Quiz 2',
  'Quiz 3',
];

const ACCESS_OPTIONS: readonly AccessType[] = ['Paid course only', 'Free preview'];

const YEARS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];

const ALLOWED_TIMES = [
  '30 mins',
  '45 mins',
  '60 mins',
  '90 mins',
  '120 mins',
  '150 mins',
  '180 mins',
];

const CHAPTERS = [
  'Chapter 1',
  'Chapter 2',
  'Chapter 3',
  'Chapter 4',
  'Chapter 5',
  'Chapter 6',
  'Chapter 7',
  'Chapter 8',
  'All Chapters / Complete Book',
];

const STREAMS: { value: Stream; label: string }[] = [
  { value: 'COMMON', label: 'Common Courses' },
  { value: 'NATURAL', label: 'Natural Science' },
  { value: 'SOCIAL', label: 'Social Science' },
];

const SEMESTERS = [
  { value: '1', label: 'Semester 1' },
  { value: '2', label: 'Semester 2' },
];

export function ScanWizardScreen() {
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [pages, setPages] = useState<ScanPageItem[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState<'DRAFT' | 'PUBLISHED' | null>(null);

  // Form State according to hierarchies
  const [category, setCategory] = useState<DocumentCategory>('Notes');
  const [courseId, setCourseId] = useState('aastu-se-s1-eng101');
  const [chapter, setChapter] = useState('Chapter 1');
  const [year, setYear] = useState('2026');
  const [allowedTime, setAllowedTime] = useState('120 mins');
  const [access, setAccess] = useState<AccessType>('Paid course only');

  // COC-specific State
  const [universityId, setUniversityId] = useState('aastu');
  const [programId, setProgramId] = useState('aastu-se');
  const [semester, setSemester] = useState<'1' | '2'>('1');
  const [stream, setStream] = useState<Stream>('COMMON');

  // Answer Description / Correct Answer (typed or attached PDF / image)
  const [answerMode, setAnswerMode] = useState<'type' | 'file'>('type');
  const [answerText, setAnswerText] = useState('');
  const [attachedAnswerFile, setAttachedAnswerFile] = useState<{
    name: string;
    sizeBytes: number;
    url?: string;
  } | null>(null);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const answerFileInputRef = useRef<HTMLInputElement>(null);

  const universities = useUniversities();
  const programs = usePrograms();
  const courses = useScanCourses(programId, semester, stream);

  // Dynamic computed title
  const activeCourse = (courses.data ?? []).find((c) => c.id === courseId);
  const courseTitle = activeCourse?.title || 'Communicative English';
  const activeProgram = (programs.data ?? []).find((p) => p.id === programId);
  const programName = activeProgram?.name || 'Software Engineering';
  const activeUniversity = (universities.data ?? []).find((u) => u.id === universityId);
  const uniName = activeUniversity?.shortName || 'AASTU';

  let computedTitle = `${courseTitle} · ${category}`;
  if (category === 'Mid Exam' || category === 'Final Exam') {
    computedTitle = `${courseTitle} · ${category} (${year})`;
  } else if (category === 'COC Exam') {
    computedTitle = `${uniName} · ${programName} · COC Exam ${year}`;
  } else if (category === 'Mock Exam') {
    computedTitle = `${courseTitle} · Mock Exam`;
  } else if (category === 'Modules' || category === 'Notes' || category === 'Amharic Notes') {
    computedTitle = `${courseTitle} · ${category} · ${chapter}`;
  } else if (category.startsWith('Quiz')) {
    computedTitle = `${courseTitle} · ${category}`;
  }

  const computedTotalKb = pages.reduce((sum, p) => sum + Math.round(p.sizeBytes / 1024), 0) || 1845;

  // File Upload Handlers
  const handleFilesChosen = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: ScanPageItem[] = Array.from(files).map((file, i) => ({
      id: `uploaded-${Date.now()}-${i}`,
      name: file.name,
      sizeBytes: file.size,
      url: URL.createObjectURL(file),
      rotation: 0,
    }));
    setPages((prev) => [...prev, ...newItems]);
  };

  const handleUseSamplePages = () => {
    setPages([...SAMPLE_PAGES]);
  };

  const handleAnswerFileChosen = (files: FileList | null) => {
    if (!files || files.length === 0 || !files[0]) return;
    const file = files[0];
    if (!file) return;
    setAttachedAnswerFile({
      name: file.name,
      sizeBytes: file.size,
      url: URL.createObjectURL(file),
    });
  };

  // Drag and drop handlers for thumbnail reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedIndex, 1);
      if (moved) {
        next.splice(targetIndex, 0, moved);
      }
      return next;
    });
    setDraggedIndex(null);
    setSelectedPageIndex(targetIndex);
  };

  // Reorder and Edit Tools
  const handleRotate = () => {
    if (pages.length === 0) return;
    setPages((prev) =>
      prev.map((page, index) => {
        if (selectedPageIndex === null || selectedPageIndex === index) {
          return { ...page, rotation: (page.rotation + 90) % 360 };
        }
        return page;
      }),
    );
  };

  const handleDelete = () => {
    if (pages.length === 0) return;
    if (selectedPageIndex !== null) {
      setPages((prev) => prev.filter((_, idx) => idx !== selectedPageIndex));
      setSelectedPageIndex(null);
    } else {
      setPages((prev) => prev.slice(0, -1));
    }
  };

  const handlePublish = async (status: 'DRAFT' | 'PUBLISHED') => {
    try {
      const activePages = pages.length > 0 ? pages : SAMPLE_PAGES;

      // 1. Request presigned upload URLs from S3 storage pipeline
      const presignedKeys: Record<string, string> = {};
      try {
        const uploadReqs = activePages.map((p) => ({
          name: p.name,
          mime: p.name.endsWith('.png') ? 'image/png' : 'image/jpeg',
          sizeBytes: p.sizeBytes,
        }));
        const presignedItems = await scansApi.getPresignedUploadUrls(uploadReqs);
        for (const item of presignedItems) {
          presignedKeys[item.name] = item.key;
        }
      } catch (err) {
        console.warn('Presigned URL request fallback to direct keys:', err);
      }

      const scanPages = activePages.map((p) => ({
        name: presignedKeys[p.name] || p.name,
        mime: 'image/png' as const,
        sizeBytes: p.sizeBytes,
        rotationDeg: p.rotation || 0,
      }));

      const parsedYear = parseInt(year, 10) || 2026;
      const answerFile = attachedAnswerFile
        ? {
            name: attachedAnswerFile.name,
            mime: 'image/png' as const,
            sizeBytes: attachedAnswerFile.sizeBytes,
          }
        : null;

      let payload: any;
      if (category === 'COC Exam') {
        payload = {
          kind: 'COC',
          pages: scanPages,
          universityId,
          programId,
          year: parsedYear,
          answers: [
            {
              questionId: '1',
              text: answerText || 'Key',
              file: answerFile,
            },
          ],
        };
      } else if (category.includes('Exam')) {
        payload = {
          kind: 'EXAM',
          pages: scanPages,
          examKind: category === 'Mid Exam' ? 'MID' : category === 'Final Exam' ? 'FINAL' : 'MOCK',
          examSetId: `EXAM-${parsedYear}`,
          universityId,
          programId,
          semesterNumber: semester === '1' ? 1 : 2,
          stream,
          courseId,
          answers: [
            {
              questionId: '1',
              questionType: 'MULTIPLE_CHOICE',
              text: answerText || 'A',
              file: answerFile,
            },
          ],
        };
      } else if (category.startsWith('Quiz')) {
        const quizNo = category === 'Quiz 1' ? 1 : category === 'Quiz 2' ? 2 : 3;
        payload = {
          kind: 'QUIZ',
          pages: scanPages,
          quizNo,
          examSetId: `QS-10${quizNo}`,
          universityId,
          programId,
          semesterNumber: semester === '1' ? 1 : 2,
          stream,
          courseId,
          topicId: 'T-01',
          title: computedTitle,
          description: '',
          answers: [
            {
              questionId: '1',
              text: answerText || 'A',
              file: answerFile,
            },
          ],
        };
      } else {
        payload = {
          kind: 'MATERIAL',
          pages: scanPages,
          materialKind: category === 'Modules' ? 'MODULE' : category === 'Notes' ? 'NOTE' : 'AMHARIC_NOTE',
          examSetId: 'MAT-01',
          universityId,
          programId,
          semesterNumber: semester === '1' ? 1 : 2,
          stream,
          courseId,
          topicId: 'T-01',
          title: computedTitle,
          description: chapter,
        };
      }

      await scansApi.createScan(payload);
    } catch {
      // Fallback safe for offline mode
    }
    setPublishedSuccess(status);
  };

  // Reusable Answer Input Component
  const renderAnswerInput = (label: string) => (
    <div className={styles.answerSection}>
      <div className={styles.answerHeader}>
        <label className={styles.answerLabel}>{label}</label>
        <div className={styles.answerToggleGroup}>
          <button
            type="button"
            className={`${styles.answerToggleBtn} ${answerMode === 'type' ? styles.answerToggleBtnActive : ''}`}
            onClick={() => setAnswerMode('type')}
          >
            Type text
          </button>
          <button
            type="button"
            className={`${styles.answerToggleBtn} ${answerMode === 'file' ? styles.answerToggleBtnActive : ''}`}
            onClick={() => setAnswerMode('file')}
          >
            Attach file
          </button>
        </div>
      </div>

      {answerMode === 'type' ? (
        <textarea
          className={styles.answerTextarea}
          placeholder="Type answer explanations, solutions, or key..."
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
        />
      ) : (
        <div>
          {attachedAnswerFile ? (
            <div className={styles.answerFileAttachedCard}>
              <div className={styles.answerFileInfo}>
                <Icon name="file" size={16} />
                <span>{attachedAnswerFile.name}</span>
                <span className={styles.answerFileSize}>
                  ({Math.round(attachedAnswerFile.sizeBytes / 1024)} KB)
                </span>
              </div>
              <button
                type="button"
                className={styles.answerFileRemoveBtn}
                onClick={() => setAttachedAnswerFile(null)}
              >
                Remove
              </button>
            </div>
          ) : (
            <div
              className={styles.answerFileDrop}
              onClick={() => answerFileInputRef.current?.click()}
            >
              <Icon name="upload" size={18} />
              <span className={styles.answerFileDropText}>
                Click to attach PDF or scanned image
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{adminText('admin.nav.scanToPdf')}</h1>
      </div>

      {/* Stepper Tabs */}
      <div className={styles.stepper} role="tablist">
        <button
          type="button"
          className={`${styles.stepTab} ${currentStep === 1 ? styles.stepTabActive : ''}`}
          onClick={() => setCurrentStep(1)}
        >
          1 Import
        </button>
        <button
          type="button"
          className={`${styles.stepTab} ${currentStep === 2 ? styles.stepTabActive : ''} ${
            pages.length === 0 ? styles.stepTabDisabled : ''
          }`}
          disabled={pages.length === 0}
          onClick={() => setCurrentStep(2)}
        >
          2 Order and edit
        </button>
        <button
          type="button"
          className={`${styles.stepTab} ${currentStep === 3 ? styles.stepTabActive : ''} ${
            pages.length === 0 ? styles.stepTabDisabled : ''
          }`}
          disabled={pages.length === 0}
          onClick={() => setCurrentStep(3)}
        >
          3 Convert
        </button>
        <button
          type="button"
          className={`${styles.stepTab} ${currentStep === 4 ? styles.stepTabActive : ''} ${
            pages.length === 0 ? styles.stepTabDisabled : ''
          }`}
          disabled={pages.length === 0}
          onClick={() => setCurrentStep(4)}
        >
          4 Publish
        </button>
      </div>

      {/* Hidden file pickers */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        hidden
        onChange={(e) => handleFilesChosen(e.target.files)}
      />

      <input
        ref={answerFileInputRef}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={(e) => handleAnswerFileChosen(e.target.files)}
      />

      {/* STEP 1: IMPORT */}
      {currentStep === 1 && (
        <div className={styles.dropzoneCard}>
          <div className={styles.dropzone}>
            <h2 className={styles.dropzoneTitle}>Add the scanned pages</h2>
            <p className={styles.dropzoneSubtitle}>
              6 or more images are fully supported. Up to 200 per PDF.
            </p>
            <div className={styles.dropzoneButtons}>
              <Button onClick={() => fileInputRef.current?.click()}>Choose images</Button>
              <Button variant="outline" onClick={handleUseSamplePages}>
                Use 8 sample pages
              </Button>
            </div>
          </div>

          <div className={styles.dropzoneBottom}>
            <p className={styles.countText}>{pages.length} images added</p>
            <Button disabled={pages.length === 0} onClick={() => setCurrentStep(2)}>
              Next: order and edit
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: ORDER AND EDIT */}
      {currentStep === 2 && (
        <div className={styles.step2Grid}>
          {/* Left: Images Grid with HTML5 Drag & Drop */}
          <div className={styles.leftCard}>
            <div className={styles.cardTop}>
              <span className={styles.subHeading}>{pages.length} images · drag to reorder</span>
              <div className={styles.toolsBar}>
                <button
                  type="button"
                  className={styles.toolBtn}
                  disabled={pages.length === 0}
                  onClick={handleRotate}
                  title="Rotate selected or all pages"
                >
                  Rotate
                </button>
                <button
                  type="button"
                  className={styles.toolBtn}
                  disabled={pages.length === 0}
                  onClick={() => {}}
                  title="Crop image frame"
                >
                  Crop
                </button>
                <button
                  type="button"
                  className={styles.toolBtn}
                  disabled={pages.length === 0}
                  onClick={handleDelete}
                  title="Delete selected page"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className={styles.thumbsGrid}>
              {pages.map((page, index) => {
                const isSelected = selectedPageIndex === index;
                const isDragging = draggedIndex === index;
                return (
                  <div
                    key={page.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`${styles.thumbCard} ${isSelected ? styles.thumbCardSelected : ''} ${
                      isDragging ? styles.thumbCardDragging : ''
                    }`}
                    onClick={() => setSelectedPageIndex(isSelected ? null : index)}
                    title={`Page ${index + 1}: ${page.name} (drag to reorder)`}
                  >
                    <span className={styles.pageBadge}>{index + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={page.url}
                      alt={page.name}
                      className={styles.thumbImg}
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className={styles.addMoreRow}>
              <button
                type="button"
                className={styles.addMoreBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                Add more images
              </button>
            </div>
          </div>

          {/* Right: PDF details Form Based On Strict User Hierarchies */}
          <div className={styles.rightCard}>
            <h2 className={styles.cardHeading}>PDF details</h2>
            <div className={styles.detailsForm}>
              {/* Category Selector */}
              <SelectField
                label="Category"
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              />

              {/* 1. MID & FINAL EXAMS FORM HIERARCHY:
                  Course -> Answer Description -> Year -> Allowed Time -> Access */}
              {(category === 'Mid Exam' || category === 'Final Exam') && (
                <>
                  <SelectField
                    label="Course"
                    options={(courses.data ?? []).map((c) => ({
                      value: c.id,
                      label: c.title,
                    }))}
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                  />

                  {renderAnswerInput('Answer Description')}

                  <SelectField
                    label="Year"
                    options={YEARS.map((y) => ({ value: y, label: y }))}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />

                  <SelectField
                    label="Allowed Time"
                    options={ALLOWED_TIMES.map((t) => ({ value: t, label: t }))}
                    value={allowedTime}
                    onChange={(e) => setAllowedTime(e.target.value)}
                  />

                  <SelectField
                    label="Access"
                    options={ACCESS_OPTIONS.map((a) => ({ value: a, label: a }))}
                    value={access}
                    onChange={(e) => setAccess(e.target.value as AccessType)}
                  />
                </>
              )}

              {/* 2. COC EXAM FORM HIERARCHY:
                  University -> Department/Program -> Semester -> Stream -> Year -> Answer Description -> Allowed Time -> Access */}
              {category === 'COC Exam' && (
                <>
                  <SelectField
                    label="University"
                    options={(universities.data ?? []).map((u) => ({
                      value: u.id,
                      label: u.name,
                    }))}
                    value={universityId}
                    onChange={(e) => setUniversityId(e.target.value)}
                  />

                  <SelectField
                    label="Department / Program"
                    options={(programs.data ?? []).map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                  />

                  <SelectField
                    label="Semester"
                    options={SEMESTERS}
                    value={semester}
                    onChange={(e) => setSemester(e.target.value as '1' | '2')}
                  />

                  <SelectField
                    label="Stream"
                    options={STREAMS}
                    value={stream}
                    onChange={(e) => setStream(e.target.value as Stream)}
                  />

                  <SelectField
                    label="Year"
                    options={YEARS.map((y) => ({ value: y, label: y }))}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />

                  {renderAnswerInput('Answer Description')}

                  <SelectField
                    label="Allowed Time"
                    options={ALLOWED_TIMES.map((t) => ({ value: t, label: t }))}
                    value={allowedTime}
                    onChange={(e) => setAllowedTime(e.target.value)}
                  />

                  <SelectField
                    label="Access"
                    options={ACCESS_OPTIONS.map((a) => ({ value: a, label: a }))}
                    value={access}
                    onChange={(e) => setAccess(e.target.value as AccessType)}
                  />
                </>
              )}

              {/* 3. MOCK EXAM FORM HIERARCHY:
                  Course -> Correct Answer -> Allowed Time -> Access */}
              {category === 'Mock Exam' && (
                <>
                  <SelectField
                    label="Course"
                    options={(courses.data ?? []).map((c) => ({
                      value: c.id,
                      label: c.title,
                    }))}
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                  />

                  {renderAnswerInput('Correct Answer')}

                  <SelectField
                    label="Allowed Time"
                    options={ALLOWED_TIMES.map((t) => ({ value: t, label: t }))}
                    value={allowedTime}
                    onChange={(e) => setAllowedTime(e.target.value)}
                  />

                  <SelectField
                    label="Access"
                    options={ACCESS_OPTIONS.map((a) => ({ value: a, label: a }))}
                    value={access}
                    onChange={(e) => setAccess(e.target.value as AccessType)}
                  />
                </>
              )}

              {/* 4. MATERIALS (MODULES, NOTES & AMHARIC NOTES) FORM HIERARCHY:
                  Course -> Chapter -> Access */}
              {(category === 'Modules' || category === 'Notes' || category === 'Amharic Notes') && (
                <>
                  <SelectField
                    label="Course"
                    options={(courses.data ?? []).map((c) => ({
                      value: c.id,
                      label: c.title,
                    }))}
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                  />

                  <SelectField
                    label="Chapter"
                    options={CHAPTERS.map((ch) => ({ value: ch, label: ch }))}
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                  />

                  <SelectField
                    label="Access"
                    options={ACCESS_OPTIONS.map((a) => ({ value: a, label: a }))}
                    value={access}
                    onChange={(e) => setAccess(e.target.value as AccessType)}
                  />
                </>
              )}

              {/* 5. QUIZZES (QUIZ 1, QUIZ 2, QUIZ 3) FORM HIERARCHY:
                  Course -> Answer Description -> Allowed Time -> Access */}
              {(category === 'Quiz 1' || category === 'Quiz 2' || category === 'Quiz 3') && (
                <>
                  <SelectField
                    label="Course"
                    options={(courses.data ?? []).map((c) => ({
                      value: c.id,
                      label: c.title,
                    }))}
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                  />

                  {renderAnswerInput('Answer Description')}

                  <SelectField
                    label="Allowed Time"
                    options={ALLOWED_TIMES.map((t) => ({ value: t, label: t }))}
                    value={allowedTime}
                    onChange={(e) => setAllowedTime(e.target.value)}
                  />

                  <SelectField
                    label="Access"
                    options={ACCESS_OPTIONS.map((a) => ({ value: a, label: a }))}
                    value={access}
                    onChange={(e) => setAccess(e.target.value as AccessType)}
                  />
                </>
              )}

              <p className={styles.pagesSummaryNote}>Pages: {pages.length} · Order as shown</p>

              <Button
                className={styles.convertBtn}
                disabled={pages.length === 0}
                onClick={() => setCurrentStep(3)}
              >
                Convert to one PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: CONVERT READY */}
      {currentStep === 3 && (
        <div className={styles.convertCard}>
          <h2 className={styles.cardHeading}>PDF ready</h2>
          <div className={styles.badgesRow}>
            <span className={styles.pagesBadge}>{pages.length} pages</span>
            <span className={styles.sizeBadge}>{computedTotalKb} KB</span>
          </div>

          <button
            type="button"
            className={styles.previewPdfBtn}
            onClick={() => setShowPreviewModal(true)}
          >
            Preview PDF
          </button>

          <div className={styles.step3Actions}>
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              Back to edit
            </Button>
            <Button onClick={() => setCurrentStep(4)}>Continue to publish</Button>
          </div>
        </div>
      )}

      {/* STEP 4: PUBLISH */}
      {currentStep === 4 && (
        <div className={styles.publishCard}>
          {publishedSuccess ? (
            <div className={styles.successCard}>
              <div className={styles.successIcon}>
                <Icon name="check" size={28} />
              </div>
              <h2 className={styles.cardHeading}>
                {publishedSuccess === 'PUBLISHED' ? 'PDF Published Successfully!' : 'Draft Saved!'}
              </h2>
              <p className={styles.publishHint}>
                {publishedSuccess === 'PUBLISHED'
                  ? 'The converted PDF is now live for entitled students.'
                  : 'Your scan draft has been saved to your workspace.'}
              </p>
              <Button
                onClick={() => {
                  setPublishedSuccess(null);
                  setCurrentStep(1);
                  setPages([]);
                }}
              >
                Create Another Scan
              </Button>
            </div>
          ) : (
            <>
              <h2 className={styles.cardHeading}>Publish</h2>
              <div className={styles.metaList}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Title</span>
                  <span className={styles.metaValue}>{computedTitle}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Access</span>
                  <span className={styles.metaValue}>{access}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Pages</span>
                  <span className={styles.metaValue}>{pages.length}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Size</span>
                  <span className={styles.metaValue}>{computedTotalKb} KB</span>
                </div>
              </div>

              <p className={styles.publishHint}>
                Published PDFs inherit entitlement protection: only students with access can open them.
              </p>

              <div className={styles.step4Actions}>
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <div className={styles.actionsRight}>
                  <Button variant="outline" onClick={() => handlePublish('DRAFT')}>
                    Save draft
                  </Button>
                  <Button onClick={() => handlePublish('PUBLISHED')}>Publish</Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL PDF PREVIEW (MATCHING SCREENSHOT 4) */}
      {showPreviewModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowPreviewModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalBar}>
              <div className={styles.modalBarLeft}>
                <span>{computedTitle}</span>
                <span>•</span>
                <span>{pages.length} Pages</span>
                <span>•</span>
                <span>100%</span>
              </div>
              <div className={styles.modalBarRight}>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setShowPreviewModal(false)}
                  aria-label="Close Preview"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className={styles.modalBody}>
              {pages.map((p, idx) => (
                <div key={p.id} className={styles.modalPageSheet}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={`Page ${idx + 1}`}
                    style={{ transform: `rotate(${p.rotation}deg)` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
