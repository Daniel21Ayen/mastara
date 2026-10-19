// apps/admin-web/src/modules/reports/api/reports.api.ts
import {
  listCatalogCourses,
  listPayments,
  listStudents,
  recordAudit,
  studentBirrRevenueStats,
  studentStats,
} from '@/core/mock/data';

export interface CoursePerformanceItem {
  courseId: string;
  code: string;
  title: string;
  stream: string;
  enrolledStudents: number;
  completionRate: number; // percentage
  avgQuizScore: number; // percentage
  modulesCount: number;
}

export interface PlatformReportsSummary {
  totalStudents: number;
  activeStudents: number;
  suspendedStudents: number;
  totalRevenueEtb: number;
  approvedPaymentsCount: number;
  pendingPaymentsCount: number;
  pendingRevenueEtb: number;
  overallCompletionRate: number;
  overallExamPassRate: number;
  coursesPerformance: CoursePerformanceItem[];
  revenueByPackage: {
    packageName: string;
    count: number;
    totalEtb: number;
    percentage: number;
  }[];
  revenueByMethod: {
    methodName: string;
    count: number;
    totalEtb: number;
  }[];
}

export async function fetchPlatformReports(): Promise<PlatformReportsSummary> {
  const sStats = studentStats();
  const revStats = studentBirrRevenueStats();
  const studentsList = listStudents({ page: 1 });
  const coursesList = listCatalogCourses({ page: 1 });

  const totalStudents = studentsList.total;
  const suspendedStudents = studentsList.items.filter((s) => s.status === 'SUSPENDED').length;

  // Build course performance data
  const coursesPerformance: CoursePerformanceItem[] = coursesList.items.map((course, idx) => {
    // Deterministic mock performance based on course code
    const seed = course.code.charCodeAt(0) + idx * 7;
    const enrolled = Math.max(18, Math.min(totalStudents, 45 + (seed % 60)));
    const completionRate = Math.min(94, Math.max(52, 60 + (seed % 35)));
    const avgQuizScore = Math.min(92, Math.max(68, 70 + (seed % 23)));

    return {
      courseId: course.id,
      code: course.code,
      title: course.title,
      stream: course.stream,
      enrolledStudents: enrolled,
      completionRate,
      avgQuizScore,
      modulesCount: 5 + (seed % 4),
    };
  });

  const totalRev = revStats.totalBirrPaid || 38400;

  const revenueByPackage = [
    {
      packageName: 'Freshman Semester Bundle',
      count: revStats.productBreakdown.bundle.count || 124,
      totalEtb: revStats.productBreakdown.bundle.totalBirr || 24800,
      percentage: totalRev > 0 ? Math.round(((revStats.productBreakdown.bundle.totalBirr || 24800) / totalRev) * 100) : 65,
    },
    {
      packageName: 'Full Academic Year Stream',
      count: revStats.productBreakdown.fullStream.count || 22,
      totalEtb: revStats.productBreakdown.fullStream.totalBirr || 8800,
      percentage: totalRev > 0 ? Math.round(((revStats.productBreakdown.fullStream.totalBirr || 8800) / totalRev) * 100) : 23,
    },
    {
      packageName: 'Single Course Packs',
      count: revStats.productBreakdown.single.count || 80,
      totalEtb: revStats.productBreakdown.single.totalBirr || 4800,
      percentage: totalRev > 0 ? Math.round(((revStats.productBreakdown.single.totalBirr || 4800) / totalRev) * 100) : 12,
    },
  ];

  const revenueByMethod = [
    {
      methodName: 'Telebirr SuperApp',
      count: revStats.methodBreakdown.telebirr.count || 142,
      totalEtb: revStats.methodBreakdown.telebirr.totalBirr || 28400,
    },
    {
      methodName: 'CBE Mobile Banking (1000...)',
      count: revStats.methodBreakdown.cbeMobile.count || 48,
      totalEtb: revStats.methodBreakdown.cbeMobile.totalBirr || 9600,
    },
    {
      methodName: 'CBE Birr Wallet',
      count: revStats.methodBreakdown.cbeBirr.count || 2,
      totalEtb: revStats.methodBreakdown.cbeBirr.totalBirr || 400,
    },
  ];

  return {
    totalStudents,
    activeStudents: sStats.activeStudents,
    suspendedStudents,
    totalRevenueEtb: totalRev,
    approvedPaymentsCount: revStats.approvedCount || 192,
    pendingPaymentsCount: revStats.pendingCount || 18,
    pendingRevenueEtb: revStats.pendingBirr || 3600,
    overallCompletionRate: 74.2,
    overallExamPassRate: 81.6,
    coursesPerformance,
    revenueByPackage,
    revenueByMethod,
  };
}

export function exportStudentsCsvReport(): void {
  const result = listStudents({ page: 1 });
  const headers = ['Student ID', 'Full Name', 'Identifier (Phone/Email)', 'University', 'Stream', 'Status'];
  const rows: (string | number)[][] = result.items.map((s) => [
    s.id,
    `"${s.name.replace(/"/g, '""')}"`,
    `"${s.identifier.replace(/"/g, '""')}"`,
    `"${(s.universityShortName ?? '').replace(/"/g, '""')}"`,
    s.stream,
    s.status,
  ]);

  downloadCsv(
    [headers.join(','), ...rows.map((r) => r.join(','))].join('\n'),
    `mastara-students-report-${new Date().toISOString().slice(0, 10)}.csv`,
  );

  recordAudit({
    actor: 'ADMIN',
    action: 'REPORT_EXPORTED' as any,
    target: 'Student Directory & Enrollment Report (CSV)',
    reason: `Exported ${result.total} student records`,
  });
}

export function exportRevenueCsvReport(): void {
  const approvedResult = listPayments({ page: 1, status: 'APPROVED' });
  const pendingResult = listPayments({ page: 1, status: 'PENDING' });
  const payments = [...approvedResult.items, ...pendingResult.items];

  const headers = ['Payment ID', 'Reference', 'Student ID', 'Student Name', 'Amount (ETB)', 'Method', 'Status', 'Submitted At'];
  const rows: (string | number)[][] = payments.map((p) => [
    p.id,
    p.reference,
    p.studentId,
    `"${p.studentName.replace(/"/g, '""')}"`,
    p.amount,
    p.method,
    p.status,
    p.createdAt,
  ]);

  downloadCsv(
    [headers.join(','), ...rows.map((r) => r.join(','))].join('\n'),
    `mastara-revenue-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
  );

  recordAudit({
    actor: 'ADMIN',
    action: 'REPORT_EXPORTED' as any,
    target: 'Revenue & Payments Ledger Report (CSV)',
    reason: `Exported ${payments.length} payment transactions`,
  });
}

export function exportCoursePerformanceCsvReport(courses: CoursePerformanceItem[]): void {
  const headers = ['Course Code', 'Course Title', 'Stream', 'Enrolled Students', 'Completion Rate (%)', 'Avg Quiz Score (%)'];
  const rows: (string | number)[][] = courses.map((c) => [
    c.code,
    `"${c.title.replace(/"/g, '""')}"`,
    c.stream,
    c.enrolledStudents,
    `${c.completionRate}%`,
    `${c.avgQuizScore}%`,
  ]);

  downloadCsv(
    [headers.join(','), ...rows.map((r) => r.join(','))].join('\n'),
    `mastara-course-performance-${new Date().toISOString().slice(0, 10)}.csv`,
  );

  recordAudit({
    actor: 'ADMIN',
    action: 'REPORT_EXPORTED' as any,
    target: 'Course Completion & Performance Report (CSV)',
    reason: `Exported analytics for ${courses.length} courses`,
  });
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
