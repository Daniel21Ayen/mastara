// apps/admin-web/src/modules/reports/screens/ReportsScreen.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader, Icon, Badge } from '@/shared/ui';
import {
  exportCoursePerformanceCsvReport,
  exportRevenueCsvReport,
  exportStudentsCsvReport,
  fetchPlatformReports,
  type PlatformReportsSummary,
} from '../api/reports.api';
import styles from '../components/Reports.module.css';

export function ReportsScreen() {
  const [data, setData] = useState<PlatformReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchPlatformReports()
      .then((res) => {
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleExportStudents = async () => {
    await exportStudentsCsvReport();
    showNotice('Student Directory CSV report downloaded.');
  };

  const handleExportRevenue = async () => {
    await exportRevenueCsvReport();
    showNotice('Revenue & Payments Ledger CSV report downloaded.');
  };

  const handleExportCourses = () => {
    if (data?.coursesPerformance) {
      exportCoursePerformanceCsvReport(data.coursesPerformance);
      showNotice('Course Performance & Completion CSV report downloaded.');
    }
  };

  const showNotice = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  if (loading || !data) {
    return (
      <div className={styles.container}>
        <PageHeader
          title="Platform Reports & Analytics"
          subtitle="Loading academic performance, engagement metrics, and commerce exports..."
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader
        title="Platform Reports & Analytics"
        subtitle="Audited academic completion rates, student performance statistics, and commerce exports."
      />

      {exportNotice && (
        <div className={styles.toast}>
          <Icon name="check" size={16} />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Total Revenue (ETB)</span>
            <span className={styles.kpiIcon}><Icon name="creditCard" size={18} /></span>
          </div>
          <span className={styles.kpiValue}>
            ETB {data.totalRevenueEtb.toLocaleString()}
          </span>
          <span className={styles.kpiSubtext}>
            {data.approvedPaymentsCount} verified student payments
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Enrolled Students</span>
            <span className={styles.kpiIcon}><Icon name="users" size={18} /></span>
          </div>
          <span className={styles.kpiValue}>{data.totalStudents}</span>
          <span className={styles.kpiSubtext}>
            {data.activeStudents} active · {data.suspendedStudents} suspended
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Avg Course Completion</span>
            <span className={styles.kpiIcon}><Icon name="barChart" size={18} /></span>
          </div>
          <span className={styles.kpiValue}>{data.overallCompletionRate}%</span>
          <span className={styles.kpiSubtext}>Chapters & offline reading progress</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Exam Pass Rate</span>
            <span className={styles.kpiIcon}><Icon name="graduationCap" size={18} /></span>
          </div>
          <span className={styles.kpiValue}>{data.overallExamPassRate}%</span>
          <span className={styles.kpiSubtext}>Mid, Final & COC assessments</span>
        </div>
      </div>

      {/* One-Click Export Center Banner */}
      <div className={styles.exportCenterCard}>
        <div className={styles.exportInfo}>
          <h3 className={styles.exportTitle}>Official Data & Audit Export Center</h3>
          <p className={styles.exportSubtitle}>
            Download structured CSV ledgers for accounting audits, student verification, and academic accreditation.
          </p>
        </div>

        <div className={styles.exportButtonGroup}>
          <button type="button" className={styles.exportActionBtn} onClick={handleExportStudents}>
            <Icon name="upload" size={15} />
            <span>Students CSV</span>
          </button>
          <button type="button" className={styles.exportActionBtn} onClick={handleExportRevenue}>
            <Icon name="upload" size={15} />
            <span>Revenue Ledger CSV</span>
          </button>
          <button type="button" className={styles.exportActionBtn} onClick={handleExportCourses}>
            <Icon name="upload" size={15} />
            <span>Course Analytics CSV</span>
          </button>
        </div>
      </div>

      {/* Visual Analytics Breakdowns */}
      <div className={styles.twoColGrid}>
        {/* Revenue by Package */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Revenue by Academic Product Package</h3>
          <div className={styles.breakdownList}>
            {data.revenueByPackage.map((item) => (
              <div key={item.packageName} className={styles.breakdownItem}>
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownName}>{item.packageName}</span>
                  <span className={styles.breakdownVal}>
                    ETB {item.totalEtb.toLocaleString()} ({item.count} orders · {item.percentage}%)
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div className={styles.progressBarFill} style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Payment Method */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Payment Method Distribution</h3>
          <div className={styles.breakdownList}>
            {data.revenueByMethod.map((item) => {
              const methodPct = Math.round((item.totalEtb / (data.totalRevenueEtb || 1)) * 100);
              return (
                <div key={item.methodName} className={styles.breakdownItem}>
                  <div className={styles.breakdownRow}>
                    <span className={styles.breakdownName}>{item.methodName}</span>
                    <span className={styles.breakdownVal}>
                      ETB {item.totalEtb.toLocaleString()} ({item.count} payments · {methodPct}%)
                    </span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{
                        width: `${methodPct}%`,
                        backgroundColor: item.methodName.includes('Telebirr') ? 'var(--color-primary)' : 'var(--color-primary-hover)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Course Engagement Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderRow}>
          <h3 className={styles.tableTitle}>Course Academic Engagement & Completion Rates</h3>
          <Badge tone="neutral">{data.coursesPerformance.length} Courses Tracked</Badge>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Course Name</th>
                <th>Stream</th>
                <th>Enrolled Students</th>
                <th>Completion Rate</th>
                <th>Avg Quiz Score</th>
                <th>Curriculum Modules</th>
              </tr>
            </thead>
            <tbody>
              {data.coursesPerformance.map((course) => (
                <tr key={course.courseId}>
                  <td>
                    <span className={styles.courseCode}>{course.code}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{course.title}</td>
                  <td>
                    <Badge tone={course.stream === 'NATURAL' ? 'primary' : 'neutral'}>
                      {course.stream}
                    </Badge>
                  </td>
                  <td>{course.enrolledStudents} students</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className={styles.progressBarBg} style={{ width: '80px' }}>
                        <div
                          className={styles.progressBarFill}
                          style={{
                            width: `${course.completionRate}%`,
                            backgroundColor: course.completionRate >= 75 ? 'var(--color-success)' : 'var(--color-warning)',
                          }}
                        />
                      </div>
                      <span style={{ fontWeight: 600 }}>{course.completionRate}%</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.scoreBadge} ${
                        course.avgQuizScore >= 75 ? styles.scoreHigh : styles.scoreMid
                      }`}
                    >
                      {course.avgQuizScore}%
                    </span>
                  </td>
                  <td>{course.modulesCount} modules</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
