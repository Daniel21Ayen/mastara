// apps/admin-web/src/modules/content/components/BuildTestSetDialog.tsx
'use client';

import { useState } from 'react';
import { Icon } from '@/shared/ui';
import type { TestSetItem } from '../state/contentManagementData';
import styles from './BuildTestSetDialog.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultQuizNo?: 1 | 2 | 3;
  onBuild: (newTestSet: TestSetItem) => void;
}

const PROGRAM_OPTIONS = [
  'BSc Geography',
  'BSc Physics',
  'Software Engineering',
  'Computer Science',
  'Civil Engineering',
  'Medicine',
  'Economics',
  'Accounting',
  'General Education',
];

const SEMESTER_OPTIONS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];

const STREAM_OPTIONS = ['Social', 'Natural', 'Common', 'Engineering', 'Health Sciences'];

const COURSE_OPTIONS: Record<string, string[]> = {
  Social: [
    'Introduction to Human Geography',
    'Geography of Ethiopia and the Horn',
    'Introduction to Economics',
    'History of Ethiopia and the Horn',
    'Introduction to Psychology',
    'Social Anthropology',
  ],
  Natural: [
    'General Physics',
    'Calculus I',
    'General Chemistry',
    'General Biology',
    'Mechanics and Heat',
    'Calculus II',
  ],
  Common: [
    'Communicative English',
    'Basic Writing Skills',
    'Logic and Critical Thinking',
    'Civics and Ethical Education',
    'Physical Fitness',
  ],
  Engineering: [
    'Applied Mathematics I',
    'Engineering Mechanics',
    'Fundamentals of Programming',
    'Circuit Analysis',
  ],
  'Health Sciences': [
    'Human Anatomy',
    'Medical Biochemistry',
    'General Physiology',
    'Public Health Overview',
  ],
};

const CHAPTER_OPTIONS = [
  'Chapter 1',
  'Chapter 2',
  'Chapter 3',
  'Chapter 4',
  'Chapter 5',
  'Chapter 6',
  'Chapter 7',
  'Chapter 8',
  'Chapter 9',
  'Chapter 10',
  'Chapter 11',
  'Chapter 12',
];

const ACCESS_CHOICES = [
  { id: 'Enrolled Only', title: 'Enrolled / Premium Only', desc: 'Active subscription or course enrollment' },
  { id: 'Public', title: 'Public (All Students)', desc: 'Open to registered and guest students' },
  { id: 'Restricted', title: 'Restricted / Evaluation', desc: 'Requires special permission code' },
  { id: 'Free Trial', title: 'Free Trial Access', desc: 'Accessible during trial period' },
];

export function BuildTestSetDialog({
  isOpen,
  onClose,
  defaultQuizNo = 1,
  onBuild,
}: Props) {
  const [program, setProgram] = useState(PROGRAM_OPTIONS[0] || 'BSc Geography');
  const [semester, setSemester] = useState(SEMESTER_OPTIONS[1] || 'Sem 2');
  const [stream, setStream] = useState(STREAM_OPTIONS[0] || 'Social');
  const [course, setCourse] = useState(
    COURSE_OPTIONS['Social']?.[0] || 'Introduction to Human Geography',
  );
  const [testSetId, setTestSetId] = useState(
    `TS-${Date.now().toString().slice(-6)}-Q${defaultQuizNo}`,
  );
  const [timeAllowed, setTimeAllowed] = useState('45 minutes');
  const [access, setAccess] = useState('Enrolled Only');
  const [quizNo, setQuizNo] = useState<1 | 2 | 3>(defaultQuizNo);
  const [chapter, setChapter] = useState(CHAPTER_OPTIONS[0] || 'Chapter 1');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStreamChange = (newStream: string) => {
    setStream(newStream);
    const available = COURSE_OPTIONS[newStream] || [];
    if (available.length > 0 && available[0]) {
      setCourse(available[0]);
    }
  };

  const handleGenerateId = () => {
    const streamCode = stream.slice(0, 3).toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    setTestSetId(`TS-${streamCode}-Q${quizNo}-${rand}`);
  };

  const handlePresetTime = (time: string) => {
    setTimeAllowed(time);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testSetId.trim()) {
      setError('Test Set ID is required.');
      return;
    }
    if (!timeAllowed.trim()) {
      setError('Time allowed is required.');
      return;
    }

    const newTestSet: TestSetItem = {
      id: `q-${Date.now()}`,
      questionId: `Q-${Date.now().toString().slice(-4)}`,
      question: `Assessment question for ${course} (${chapter}): Analyze the foundational principles of this topic.`,
      questionType: 'Multiple Choice',
      testSetId: testSetId.trim(),
      quizNo,
      chapterNumber: Number(chapter.replace(/[^0-9]/g, '')) || 1,
      chapterTitle: chapter,
      chapterSubtitle: '',
      courseTitle: course,
      courseCode: course.split(' ')[0] || 'COURSE',
      semester,
      stream,
      program,
      timeAllowed: timeAllowed.trim(),
      access,
      status,
      verified: true,
      questionCount: 1,
    };

    onBuild(newTestSet);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleWrapper}>
            <div className={styles.iconCircle}>
              <Icon name="grid" size={20} />
            </div>
            <div>
              <h2 className={styles.modalTitle}>Build Test Set</h2>
              <p className={styles.modalSubtitle}>
                Configure parameters and access permissions to assemble a new assessment set.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

          <div className={styles.formGrid}>
            {/* 1. Program */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="build-program">
                Program <span className={styles.requiredAsterisk}>*</span>
              </label>
              <select
                id="build-program"
                className={styles.select}
                value={program}
                onChange={(e) => setProgram(e.target.value)}
              >
                {PROGRAM_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Semester */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="build-semester">
                Semester <span className={styles.requiredAsterisk}>*</span>
              </label>
              <select
                id="build-semester"
                className={styles.select}
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              >
                {SEMESTER_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Stream */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="build-stream">
                Stream <span className={styles.requiredAsterisk}>*</span>
              </label>
              <select
                id="build-stream"
                className={styles.select}
                value={stream}
                onChange={(e) => handleStreamChange(e.target.value)}
              >
                {STREAM_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Course */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="build-course">
                Course <span className={styles.requiredAsterisk}>*</span>
              </label>
              <select
                id="build-course"
                className={styles.select}
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              >
                {(COURSE_OPTIONS[stream] || COURSE_OPTIONS['Social'] || []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Quiz Target & Chapter */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="build-quiz">
                Quiz Target <span className={styles.requiredAsterisk}>*</span>
              </label>
              <select
                id="build-quiz"
                className={styles.select}
                value={quizNo}
                onChange={(e) => setQuizNo(Number(e.target.value) as 1 | 2 | 3)}
              >
                <option value={1}>Quiz 1</option>
                <option value={2}>Quiz 2</option>
                <option value={3}>Quiz 3</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="build-chapter">
                Chapter <span className={styles.requiredAsterisk}>*</span>
              </label>
              <select
                id="build-chapter"
                className={styles.select}
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
              >
                {CHAPTER_OPTIONS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="build-status">
                Initial Status
              </label>
              <select
                id="build-status"
                className={styles.select}
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* 5. Test Set ID */}
            <div className={`${styles.fieldGroup} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel} htmlFor="build-test-set-id">
                Test Set ID <span className={styles.requiredAsterisk}>*</span>
              </label>
              <div className={styles.idInputWrapper}>
                <input
                  id="build-test-set-id"
                  type="text"
                  className={styles.input}
                  value={testSetId}
                  onChange={(e) => setTestSetId(e.target.value)}
                  placeholder="TS-QUIZ1-001"
                  required
                />
                <button
                  type="button"
                  className={styles.generateBtn}
                  onClick={handleGenerateId}
                  title="Generate a unique ID based on current selections"
                >
                  ⚡ Generate ID
                </button>
              </div>
            </div>

            {/* 6. Time Allowed */}
            <div className={`${styles.fieldGroup} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel} htmlFor="build-time-allowed">
                Time Allowed <span className={styles.requiredAsterisk}>*</span>
              </label>
              <input
                id="build-time-allowed"
                type="text"
                className={styles.input}
                value={timeAllowed}
                onChange={(e) => setTimeAllowed(e.target.value)}
                placeholder="e.g. 45 minutes"
                required
              />
              <div className={styles.timePresets}>
                {['15 minutes', '30 minutes', '45 minutes', '60 minutes', '90 minutes'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.presetBtn} ${
                      timeAllowed === t ? styles.presetBtnActive : ''
                    }`}
                    onClick={() => handlePresetTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 7. Access / Permission */}
            <div className={`${styles.fieldGroup} ${styles.formGridFull}`}>
              <label className={styles.fieldLabel}>
                Access / Permission <span className={styles.requiredAsterisk}>*</span>
              </label>
              <div className={styles.accessOptions}>
                {ACCESS_CHOICES.map((choice) => {
                  const isChecked = access === choice.id;
                  return (
                    <label
                      key={choice.id}
                      className={`${styles.accessCard} ${
                        isChecked ? styles.accessCardActive : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="access-permission"
                        value={choice.id}
                        checked={isChecked}
                        onChange={() => setAccess(choice.id)}
                        className={styles.accessRadio}
                      />
                      <div className={styles.accessInfo}>
                        <span className={styles.accessTitle}>{choice.title}</span>
                        <span className={styles.accessDesc}>{choice.desc}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              <Icon name="grid" size={16} />
              Build Test Set
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
