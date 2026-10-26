// apps/admin-web/src/modules/tests/screens/UnifiedAssessmentsHubScreen.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { assessmentKindTone } from '@mastara/ui-tokens';
import { adminText } from '@/core/i18n';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Icon,
  PageHeader,
  Pagination,
  SelectField,
  TextField,
  type Column,
} from '@/shared/ui';
import { StudentPreviewModal } from '@/shared/preview';
import { StatusBadge } from '../components/StatusBadge';
import {
  AssessmentDrawerWorkflow,
  type AssessmentFormData,
} from '../components/AssessmentDrawerWorkflow';
import styles from './Tests.module.css';

export interface UnifiedAssessmentItem {
  id: string;
  title: string;
  kind: 'QUIZ' | 'MID' | 'FINAL' | 'MOCK' | 'COC';
  courseId: string;
  courseTitle: string;
  courseCode: string;
  chapterNumber?: number;
  questionCount: number;
  totalMarks: number;
  durationMinutes?: number;
  status: 'DRAFT' | 'PUBLISHED';
  instructions: string;
  questions: Array<{
    id?: string;
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'BLANK_SPACE';
    prompt: string;
    options: string[];
    correctOptionIndex: number;
    trueIsCorrect: boolean;
    acceptedAnswers: string[];
    explanation: string;
    points?: number;
  }>;
}

const INITIAL_ASSESSMENTS: UnifiedAssessmentItem[] = [
  {
    id: 'asmt-1',
    title: 'Chapter 1: Units, Vectors & Kinematics',
    kind: 'QUIZ',
    courseId: 'c-1',
    courseTitle: 'General Physics I',
    courseCode: 'PHYS101',
    chapterNumber: 1,
    questionCount: 15,
    totalMarks: 30,
    status: 'PUBLISHED',
    instructions: 'Self-assessment section check for Chapter 1. Untimed and open to all enrolled students.',
    questions: [
      {
        id: 'q-101',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Which of the following describes the magnitude of displacement vector $\\vec{d} = 3\\hat{i} + 4\\hat{j}$?',
        options: ['5 meters', '7 meters', '1 meter', '25 meters'],
        correctOptionIndex: 0,
        trueIsCorrect: true,
        acceptedAnswers: ['5'],
        explanation: 'By the Pythagorean theorem, $|\\vec{d}| = \\sqrt{3^2 + 4^2} = \\sqrt{25} = 5$.',
        points: 2,
      },
      {
        id: 'q-102',
        type: 'TRUE_FALSE',
        prompt: 'Speed is a scalar quantity whereas velocity is a vector quantity.',
        options: ['True', 'False'],
        correctOptionIndex: 0,
        trueIsCorrect: true,
        acceptedAnswers: ['true'],
        explanation: 'Speed only has magnitude; velocity specifies both speed and direction.',
        points: 2,
      },
    ],
  },
  {
    id: 'asmt-2',
    title: 'Physics Freshman Midterm Examination 2025',
    kind: 'MID',
    courseId: 'c-1',
    courseTitle: 'General Physics I',
    courseCode: 'PHYS101',
    chapterNumber: 3,
    questionCount: 30,
    totalMarks: 100,
    durationMinutes: 90,
    status: 'PUBLISHED',
    instructions: 'Midterm exam covering Chapters 1 through 3. Timed exam (90 minutes). Math formulas supported.',
    questions: [
      {
        id: 'q-201',
        type: 'MULTIPLE_CHOICE',
        prompt: 'According to Newton’s second law, what is the net force when acceleration is $a = \\frac{dv}{dt}$ and mass $m = 10\\text{ kg}$ with $a = 4\\text{ m/s}^2$?',
        options: ['40 N', '2.5 N', '14 N', '0.4 N'],
        correctOptionIndex: 0,
        trueIsCorrect: true,
        acceptedAnswers: ['40'],
        explanation: '$F = m \\cdot a = 10 \\times 4 = 40\\text{ N}$.',
        points: 4,
      },
    ],
  },
  {
    id: 'asmt-3',
    title: 'Calculus I: Limits & Continuous Functions',
    kind: 'QUIZ',
    courseId: 'c-2',
    courseTitle: 'Calculus & Linear Algebra',
    courseCode: 'MATH101',
    chapterNumber: 2,
    questionCount: 10,
    totalMarks: 20,
    status: 'DRAFT',
    instructions: 'Practice questions on limits using L’Hôpital’s rule and standard limit evaluations.',
    questions: [
      {
        id: 'q-301',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Evaluate the limit $\\lim_{x \\to 0} \\frac{\\sin(x)}{x}$.',
        options: ['1', '0', '$\\infty$', 'Does not exist'],
        correctOptionIndex: 0,
        trueIsCorrect: true,
        acceptedAnswers: ['1'],
        explanation: 'Standard trigonometric limit $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$.',
        points: 2,
      },
    ],
  },
  {
    id: 'asmt-4',
    title: 'Linear Algebra Final Comprehensive Exam',
    kind: 'FINAL',
    courseId: 'c-2',
    courseTitle: 'Calculus & Linear Algebra',
    courseCode: 'MATH101',
    questionCount: 40,
    totalMarks: 100,
    durationMinutes: 120,
    status: 'PUBLISHED',
    instructions: 'Comprehensive final examination covering eigenvalues, vector spaces, and linear transformations.',
    questions: [
      {
        id: 'q-401',
        type: 'SHORT_ANSWER',
        prompt: 'What is the trace of a $2 \\times 2$ identity matrix $I_2$?',
        options: [],
        correctOptionIndex: 0,
        trueIsCorrect: true,
        acceptedAnswers: ['2', 'two'],
        explanation: 'The trace is the sum of diagonal entries: $1 + 1 = 2$.',
        points: 5,
      },
    ],
  },
  {
    id: 'asmt-5',
    title: 'National COC Engineering Qualifying Mock Exam',
    kind: 'COC',
    courseId: 'c-3',
    courseTitle: 'Introduction to Computing',
    courseCode: 'CS101',
    questionCount: 50,
    totalMarks: 100,
    durationMinutes: 150,
    status: 'DRAFT',
    instructions: 'Official simulated COC assessment aligned with MoSHE standards.',
    questions: [],
  },
];

export function UnifiedAssessmentsHubScreen() {
  const [assessments, setAssessments] = useState<UnifiedAssessmentItem[]>(INITIAL_ASSESSMENTS);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedKind, setSelectedKind] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Drawer Workflow State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<AssessmentFormData | null>(null);

  // Student Preview Modal State
  const [previewItem, setPreviewItem] = useState<UnifiedAssessmentItem | null>(null);

  const handleOpenNew = () => {
    setEditingAssessment(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (item: UnifiedAssessmentItem) => {
    setEditingAssessment({
      id: item.id,
      title: item.title,
      instructions: item.instructions,
      kind: item.kind,
      courseId: item.courseId,
      chapterNumber: item.chapterNumber,
      durationMinutes: item.durationMinutes,
      status: item.status,
      questions: item.questions,
    });
    setIsDrawerOpen(true);
  };

  const handleSaveAssessment = (data: AssessmentFormData) => {
    if (data.id) {
      setAssessments((prev) =>
        prev.map((item) =>
          item.id === data.id
            ? {
                ...item,
                title: data.title,
                instructions: data.instructions,
                kind: data.kind,
                courseId: data.courseId,
                chapterNumber: data.chapterNumber,
                durationMinutes: data.durationMinutes,
                status: data.status,
                questions: data.questions,
                questionCount: data.questions.length,
                totalMarks: data.questions.reduce((sum, q) => sum + (q.points || 2), 0) || 100,
              }
            : item,
        ),
      );
    } else {
      const newItem: UnifiedAssessmentItem = {
        id: `asmt-${Date.now()}`,
        title: data.title,
        instructions: data.instructions,
        kind: data.kind,
        courseId: data.courseId,
        courseTitle: data.courseId === 'c-1' ? 'General Physics I' : 'Calculus & Linear Algebra',
        courseCode: data.courseId === 'c-1' ? 'PHYS101' : 'MATH101',
        chapterNumber: data.chapterNumber,
        durationMinutes: data.durationMinutes,
        status: data.status,
        questionCount: data.questions.length,
        totalMarks: data.questions.reduce((sum, q) => sum + (q.points || 2), 0) || 100,
        questions: data.questions,
      };
      setAssessments((prev) => [newItem, ...prev]);
    }
  };

  const filteredAssessments = useMemo(() => {
    return assessments.filter((item) => {
      if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !item.courseCode.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (selectedCourse !== 'ALL' && item.courseId !== selectedCourse) {
        return false;
      }
      if (selectedKind !== 'ALL' && item.kind !== selectedKind) {
        return false;
      }
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [assessments, search, selectedCourse, selectedKind, selectedStatus]);

  const pageCount = Math.ceil(filteredAssessments.length / pageSize) || 1;
  const paginatedAssessments = filteredAssessments.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const columns: Column<UnifiedAssessmentItem>[] = [
    {
      key: 'title',
      header: 'Title & Assessment Type',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{row.title}</span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Badge tone={assessmentKindTone(row.kind)} style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>
              {row.kind}
            </Badge>
            {row.durationMinutes ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                ⏱ {row.durationMinutes} min (Timed)
              </span>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 500 }}>
                ✓ Entitlement Untimed
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Parent Module / Course',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)' }}>
            {row.courseCode} · {row.courseTitle}
          </div>
          {row.chapterNumber && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Chapter {row.chapterNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'questionCount',
      header: 'Questions',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
          {row.questionCount} {row.questionCount === 1 ? 'item' : 'items'}
        </span>
      ),
    },
    {
      key: 'totalMarks',
      header: 'Total Marks',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
          {row.totalMarks} pts
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setPreviewItem(row)}
            title="Preview as Student"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 9px',
              borderRadius: '6px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Icon name="eye" size={14} />
            Preview
          </button>
          <button
            type="button"
            onClick={() => handleEdit(row)}
            title="Edit Assessment"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 9px',
              borderRadius: '6px',
              background: 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
              color: 'var(--color-on-primary)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Icon name="edit" size={14} />
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Unified Assessments Hub"
        subtitle="Consolidated management dashboard for Quizzes, Section Checks, and Exams"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Button
              variant="outline"
              onClick={() => {
                if (assessments.length > 0) setPreviewItem(assessments[0] ?? null);
              }}
            >
              <Icon name="eye" size={18} />
              Preview as Student
            </Button>
            <Button onClick={handleOpenNew}>
              <Icon name="plus" size={18} />
              New Assessment
            </Button>
          </div>
        }
      />

      {/* Metric Cards Top Overview */}
      <div className={styles.cards} style={{ marginBottom: '1.25rem' }}>
        <div className={styles.kind}>
          <span className={styles.kindIcon}>
            <Icon name="quiz" size={24} />
          </span>
          <h2 className={styles.kindName}>Total Assessments</h2>
          <p className={styles.kindCount}>{assessments.length} configured</p>
        </div>
        <div className={styles.kind}>
          <span className={styles.kindIcon} style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
            <Icon name="check" size={24} />
          </span>
          <h2 className={styles.kindName}>Published Live</h2>
          <p className={styles.kindCount}>
            {assessments.filter((a) => a.status === 'PUBLISHED').length} available to students
          </p>
        </div>
        <div className={styles.kind}>
          <span className={styles.kindIcon} style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--color-text-muted)' }}>
            <Icon name="fileText" size={24} />
          </span>
          <h2 className={styles.kindName}>Draft Sets</h2>
          <p className={styles.kindCount}>
            {assessments.filter((a) => a.status === 'DRAFT').length} in preparation
          </p>
        </div>
      </div>

      <Card>
        {/* Standardized Filters Toolbar */}
        <div className={styles.toolbar}>
          <TextField
            label="Search Assessment"
            placeholder="Search by title or code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <SelectField
            label="Parent Course"
            placeholder="All Courses"
            options={[
              { value: 'ALL', label: 'All Courses' },
              { value: 'c-1', label: 'PHYS101 · General Physics I' },
              { value: 'c-2', label: 'MATH101 · Calculus & Linear Algebra' },
              { value: 'c-3', label: 'CS101 · Intro to Computing' },
            ]}
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setPage(1);
            }}
          />
          <SelectField
            label="Assessment Type"
            placeholder="All Types"
            options={[
              { value: 'ALL', label: 'All Types' },
              { value: 'QUIZ', label: 'Quizzes (Untimed)' },
              { value: 'MID', label: 'Midterm Exams' },
              { value: 'FINAL', label: 'Final Exams' },
              { value: 'MOCK', label: 'Mock Exams' },
              { value: 'COC', label: 'COC Exams' },
            ]}
            value={selectedKind}
            onChange={(e) => {
              setSelectedKind(e.target.value);
              setPage(1);
            }}
          />
          <SelectField
            label="Publication Status"
            placeholder="All Statuses"
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'PUBLISHED', label: 'Published' },
              { value: 'DRAFT', label: 'Draft' },
            ]}
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Standardized Data Table */}
        <DataTable
          caption="Consolidated Assessments and Exam Sets"
          columns={columns}
          rows={paginatedAssessments}
          rowKey={(row) => row.id}
          empty="No assessments found matching the selected filters."
        />

        {filteredAssessments.length > pageSize && (
          <Pagination
            page={page}
            pageCount={pageCount}
            shown={paginatedAssessments.length}
            total={filteredAssessments.length}
            onPage={setPage}
          />
        )}
      </Card>

      {/* Standardized 2-step Setup Drawer */}
      <AssessmentDrawerWorkflow
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialData={editingAssessment ?? undefined}
        onSave={handleSaveAssessment}
      />

      {/* Student Preview Modal */}
      {previewItem && (
        <StudentPreviewModal
          isOpen={true}
          onClose={() => setPreviewItem(null)}
          title={previewItem.title}
          subtitle={
            previewItem.durationMinutes
              ? `${previewItem.kind} • ${previewItem.durationMinutes} min`
              : `${previewItem.kind} • Self-Assessment`
          }
          category={`${previewItem.courseCode} · ${previewItem.courseTitle}`}
          mode="assessment"
          content={previewItem.instructions}
          questions={previewItem.questions.map((q, idx) => ({
            id: q.id || `q-${idx}`,
            prompt: q.prompt,
            type: q.type,
            options: q.options,
          }))}
        />
      )}
    </>
  );
}
