// apps/admin-web/src/modules/students/screens/StudentProfileScreen.tsx
'use client';

import type { GrantAccessInput, StudentCourse, StudentDetail } from '@mastara/contracts';
import { ADMIN_ERROR_CODES } from '@mastara/domain';
import Link from 'next/link';
import { useState } from 'react';

import { agoText, formatDate } from '@/core/format';
import { adminText } from '@/core/i18n';
import { isApiError } from '@/core/network';
import {
  Button,
  Card,
  CardTitle,
  DataTable,
  DescriptionList,
  PageHeader,
  StateMessage,
} from '@/shared/ui';
import type { Column } from '@/shared/ui';

import { studentsApi } from '../api/students.api';
import { ActionDialog } from '../components/ActionDialog';
import { GrantAccessForm } from '../components/GrantAccessForm';
import { AccessBadge, DeviceBadge, StudentStatusBadge } from '../components/StatusBadges';
import { useStudent } from '../hooks/useStudents';

import styles from './StudentProfileScreen.module.css';

type Dialog = 'suspend' | 'reactivate' | 'revoke' | null;

export function StudentProfileScreen({ id }: { id: string }) {
  const { data, error, reload } = useStudent(id);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The newest copy returned by an action, so the page changes at once without waiting for a reload.
  const [updated, setUpdated] = useState<StudentDetail | null>(null);

  const back = (
    <Link href="/students" className={styles.back}>
      ← {adminText('admin.student.back')}
    </Link>
  );

  if (error) {
    const missing = isApiError(error, ADMIN_ERROR_CODES.NOT_FOUND);
    return (
      <>
        {back}
        <StateMessage tone="alert">
          <span>{adminText(missing ? 'admin.student.notFound' : 'admin.student.error')}</span>
          {missing ? null : (
            <Button variant="outline" onClick={reload}>
              {adminText('admin.common.retry')}
            </Button>
          )}
        </StateMessage>
      </>
    );
  }

  const current = updated ?? data;
  if (!current) return <StateMessage>{adminText('admin.common.loading')}</StateMessage>;

  // Typed on purpose: the functions below are hoisted, so TypeScript would not keep the check above.
  const student: StudentDetail = current;
  const suspended = student.status === 'SUSPENDED';

  /** Runs an action, shows the updated student and says what happened. */
  async function run(action: () => Promise<StudentDetail>, message: string) {
    setUpdated(await action());
    setNotice(message);
  }

  async function grant(input: GrantAccessInput) {
    const result = await studentsApi.grantAccess(student.id, input);
    const course = result.courses.find((item) => item.courseId === input.courseId);
    setUpdated(result);
    setNotice(
      adminText('admin.student.done.granted', {
        name: student.name,
        course: course?.title ?? '',
        date: course?.expiresAt ? formatDate(course.expiresAt) : '',
      }),
    );
  }

  const courseColumns: Column<StudentCourse>[] = [
    {
      key: 'course',
      header: adminText('admin.student.courses.course'),
      render: (row) => row.title,
    },
    {
      key: 'stream',
      header: adminText('admin.student.courses.stream'),
      render: (row) => adminText(`admin.stream.${row.stream}`),
    },
    {
      key: 'access',
      header: adminText('admin.student.courses.access'),
      render: (row) => <AccessBadge access={row.access} />,
    },
    {
      key: 'expires',
      header: adminText('admin.student.courses.expires'),
      render: (row) => (row.expiresAt ? formatDate(row.expiresAt) : adminText('admin.common.none')),
    },
  ];

  return (
    <>
      {back}
      <PageHeader
        title={`${student.name} · ${student.id}`}
        badge={<StudentStatusBadge status={student.status} />}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setDialog(suspended ? 'reactivate' : 'suspend')}
            >
              {adminText(suspended ? 'admin.student.reactivate' : 'admin.student.suspend')}
            </Button>
            <Button
              variant="danger"
              disabled={student.device !== 'BOUND'}
              onClick={() => setDialog('revoke')}
            >
              {adminText('admin.student.revokeDevice')}
            </Button>
          </>
        }
      />

      {notice ? <StateMessage>{notice}</StateMessage> : null}

      <div className={styles.page}>
        <div className={styles.columns}>
          <Card aria-labelledby="profile-title">
            <CardTitle id="profile-title">{adminText('admin.student.profile.title')}</CardTitle>
            <DescriptionList
              rows={[
                {
                  label: adminText('admin.students.col.id') || 'Student ID',
                  value:
                    student.studentCode ? (
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: 'var(--color-primary, #2563eb)',
                          background: '#eff6ff',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {student.studentCode}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted, #94a3b8)', fontStyle: 'italic' }}>
                        —
                      </span>
                    ),
                },
                {
                  label: adminText('admin.student.profile.university'),
                  value: student.universityShortName,
                },
                { label: adminText('admin.student.profile.program'), value: student.programName },
                {
                  label: adminText('admin.student.profile.semesterStream'),
                  value: `${student.semesterNumber} · ${adminText(`admin.stream.${student.stream}`)}`,
                },
                { label: adminText('admin.student.profile.identifier'), value: student.identifier },
              ]}
            />
          </Card>
          <Card aria-labelledby="device-title">
            <CardTitle id="device-title">{adminText('admin.student.device.title')}</CardTitle>
            <DescriptionList
              rows={[
                {
                  label: adminText('admin.student.device.status'),
                  value: <DeviceBadge device={student.device} />,
                },
                {
                  label: adminText('admin.student.device.boundOn'),
                  value: student.boundAt
                    ? formatDate(student.boundAt)
                    : adminText('admin.common.none'),
                },
                {
                  label: adminText('admin.student.device.lastSeen'),
                  value: student.lastSeenAt
                    ? agoText(student.lastSeenAt)
                    : adminText('admin.common.none'),
                },
              ]}
            />
          </Card>
        </div>

        <Card aria-labelledby="courses-title">
          <CardTitle id="courses-title">{adminText('admin.student.courses.title')}</CardTitle>
          <DataTable
            caption={adminText('admin.student.courses.caption')}
            columns={courseColumns}
            rows={student.courses}
            rowKey={(row) => row.courseId}
            empty={adminText('admin.student.courses.empty')}
          />
        </Card>

        <GrantAccessForm student={student} onGrant={grant} />
      </div>

      {dialog === 'suspend' ? (
        <ActionDialog
          withReason
          tone="danger"
          title={adminText('admin.student.suspend.title', { name: student.name })}
          body={adminText('admin.student.suspend.body')}
          confirmLabel={adminText('admin.student.suspend')}
          onConfirm={(reason) =>
            run(
              () => studentsApi.suspend(student.id, { reason }),
              adminText('admin.student.done.suspended', { name: student.name }),
            )
          }
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog === 'reactivate' ? (
        <ActionDialog
          withReason
          title={adminText('admin.student.reactivate.title', { name: student.name })}
          body={adminText('admin.student.reactivate.body')}
          confirmLabel={adminText('admin.student.reactivate')}
          onConfirm={(reason) =>
            run(
              () => studentsApi.reactivate(student.id, { reason }),
              adminText('admin.student.done.reactivated', { name: student.name }),
            )
          }
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog === 'revoke' ? (
        <ActionDialog
          withReason
          tone="danger"
          title={adminText('admin.student.revoke.title', { name: student.name })}
          body={adminText('admin.student.revoke.body')}
          confirmLabel={adminText('admin.student.revokeDevice')}
          onConfirm={(reason) =>
            run(
              () => studentsApi.revokeDevice(student.id, { reason }),
              adminText('admin.student.done.revoked', { name: student.name }),
            )
          }
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}
