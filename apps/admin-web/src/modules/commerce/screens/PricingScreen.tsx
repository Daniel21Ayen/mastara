// apps/admin-web/src/modules/commerce/screens/PricingScreen.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { pricingApi } from '../api/pricing.api';
import type {
  PricingSettings,
  StudentBirrStats,
  StudentPaymentSummaryItem,
} from '../api/pricing.api';
import { Icon } from '@/shared/ui';
import styles from '../components/Pricing.module.css';

const DEFAULT_FORM: PricingSettings = {
  bundlePrice: 200,
  coursesMin: 7,
  coursesMax: 10,
  bundleDurationDays: 150,
  firstExtraPrice: 100,
  laterExtrasPrice: 50,
  singleCoursePrice: 60,
  fullStreamPrice: 350,
  fullBothPrice: 700,
  fullStreamDurationDays: 365,
  freeTrial: {
    firstChapterModuleFree: true,
    firstChapterQuizFree: true,
    cocSampleSetFree: true,
  },
  updatedAt: new Date().toISOString(),
};

const INITIAL_STATS: StudentBirrStats = {
  totalBirrPaid: 14850,
  approvedCount: 12,
  pendingBirr: 7420,
  pendingCount: 18,
  rejectedCount: 5,
  totalOrdersCount: 35,
  averageBirrPerStudent: 1238,
  methodBreakdown: {
    telebirr: { count: 7, totalBirr: 8450 },
    cbeMobile: { count: 4, totalBirr: 5200 },
    cbeBirr: { count: 1, totalBirr: 1200 },
  },
  productBreakdown: {
    bundle: { count: 6, totalBirr: 7200 },
    single: { count: 3, totalBirr: 450 },
    fullStream: { count: 2, totalBirr: 700 },
    fullBoth: { count: 1, totalBirr: 700 },
  },
  paidStudentsList: [],
};

export function PricingScreen() {
  const [form, setForm] = useState<PricingSettings>(DEFAULT_FORM);
  const [coursesMinMax, setCoursesMinMax] = useState('7 / 10');
  const [stats, setStats] = useState<StudentBirrStats>(INITIAL_STATS);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [settings, revenueStats] = await Promise.all([
          pricingApi.getSettings(),
          pricingApi.getBirrRevenueStats(),
        ]);
        setForm(settings);
        setCoursesMinMax(`${settings.coursesMin} / ${settings.coursesMax}`);
        setStats(revenueStats);
      } catch (err) {
        console.error('Failed to load pricing data:', err);
      }
    }
    loadData();
  }, []);

  const handleMinMaxChange = (value: string) => {
    setCoursesMinMax(value);
    const parts = value.split('/').map((s) => parseInt(s.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]!) && !isNaN(parts[1]!)) {
      setForm((prev) => ({
        ...prev,
        coursesMin: parts[0]!,
        coursesMax: parts[1]!,
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await pricingApi.saveSettings(form);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    } catch (err) {
      console.error('Failed to save pricing changes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatBirr = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Products &amp; Pricing</h1>
        <button
          type="button"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            'Saving...'
          ) : (
            <>
              <Icon name="check" size={16} />
              Save changes
            </>
          )}
        </button>
      </div>

      {/* Student Birr Revenue & Collection Counter Banner */}
      <div className={styles.revenueBanner}>
        <div className={styles.revenueTopRow}>
          <div className={styles.revenueMain}>
            <div className={styles.revenueTag}>
              <Icon name="creditCard" size={14} />
              <span>Student Revenue Counter</span>
            </div>
            <div className={styles.revenueAmountRow}>
              <span className={styles.revenueCurrency}>ETB</span>
              <span className={styles.revenueValue}>
                {stats ? formatBirr(stats.totalBirrPaid) : '...'}
              </span>
            </div>
            <p className={styles.revenueLabel}>
              Total Birr paid by students across all verified and approved enrollments
            </p>
          </div>

          <div className={styles.revenueActions}>
            <button
              type="button"
              className={styles.viewAuditBtn}
              onClick={() => setShowAuditModal(true)}
            >
              <Icon name="users" size={16} />
              View Paid Students ({stats?.approvedCount ?? 0})
            </button>
            <Link
              href="/commerce/payments"
              className={styles.viewAuditBtn}
              style={{ textDecoration: 'none' }}
            >
              <Icon name="creditCard" size={16} />
              Payments Queue ({stats?.pendingCount ?? 0})
            </Link>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className={styles.revenueStatsGrid}>
          <div className={styles.statItem}>
            <div className={styles.statHeaderRow}>
              <span className={styles.statLabel}>Approved Payments</span>
              <Icon name="users" size={14} />
            </div>
            <span className={styles.statValue}>
              {stats?.approvedCount ?? 0} Students
            </span>
            <span className={styles.statSubtext}>Access verified &amp; unlocked</span>
          </div>

          <div className={styles.statItem}>
            <div className={styles.statHeaderRow}>
              <span className={styles.statLabel}>Pending in Queue</span>
              <Icon name="clock" size={14} />
            </div>
            <span className={styles.statValue}>
              ETB {stats ? formatBirr(stats.pendingBirr) : '0'}
            </span>
            <span className={styles.statSubtext}>
              {stats?.pendingCount ?? 0} orders awaiting approval
            </span>
          </div>

          <div className={styles.statItem}>
            <div className={styles.statHeaderRow}>
              <span className={styles.statLabel}>Avg. Order Value</span>
              <Icon name="barChart" size={14} />
            </div>
            <span className={styles.statValue}>
              ETB {stats ? formatBirr(stats.averageBirrPerStudent) : '0'}
            </span>
            <span className={styles.statSubtext}>Per paying student</span>
          </div>

          <div className={styles.statItem}>
            <div className={styles.statHeaderRow}>
              <span className={styles.statLabel}>Telebirr Collected</span>
              <Icon name="creditCard" size={14} />
            </div>
            <span className={styles.statValue}>
              ETB {stats ? formatBirr(stats.methodBreakdown.telebirr.totalBirr) : '0'}
            </span>
            <span className={styles.statSubtext}>
              {stats?.methodBreakdown.telebirr.count ?? 0} transactions verified
            </span>
          </div>

          <div className={styles.statItem}>
            <div className={styles.statHeaderRow}>
              <span className={styles.statLabel}>CBE Mobile Collected</span>
              <Icon name="creditCard" size={14} />
            </div>
            <span className={styles.statValue}>
              ETB {stats ? formatBirr(stats.methodBreakdown.cbeMobile.totalBirr) : '0'}
            </span>
            <span className={styles.statSubtext}>
              {stats?.methodBreakdown.cbeMobile.count ?? 0} transactions verified
            </span>
          </div>
        </div>
      </div>

      {/* 3-Column Pricing Parameters Grid */}
      <div className={styles.pricingGrid}>
        {/* Card 1: Semester Bundle */}
        <div className={styles.pricingCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Semester Bundle</h2>
            <span className={styles.cardBadge}>Core Bundle</span>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="bundlePrice">
                Price (ETB)
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="bundlePrice"
                  type="number"
                  className={styles.textInput}
                  value={form.bundlePrice || ''}
                  onChange={(e) =>
                    setForm({ ...form, bundlePrice: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="200"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="coursesMinMax">
                Courses min / max
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="coursesMinMax"
                  type="text"
                  className={styles.textInput}
                  value={coursesMinMax}
                  onChange={(e) => handleMinMaxChange(e.target.value)}
                  placeholder="7 / 10"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="bundleDuration">
                Duration (days)
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="bundleDuration"
                  type="number"
                  className={styles.textInput}
                  value={form.bundleDurationDays || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bundleDurationDays: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  placeholder="[set]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Extra courses */}
        <div className={styles.pricingCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Extra courses</h2>
            <span className={styles.cardBadge}>Add-ons</span>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="firstExtraPrice">
                First extra (ETB)
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="firstExtraPrice"
                  type="number"
                  className={styles.textInput}
                  value={form.firstExtraPrice || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      firstExtraPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="100"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="laterExtrasPrice">
                Later extras (ETB)
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="laterExtrasPrice"
                  type="number"
                  className={styles.textInput}
                  value={form.laterExtrasPrice || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      laterExtrasPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="50"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="singleCoursePrice">
                Single course (ETB)
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="singleCoursePrice"
                  type="number"
                  className={styles.textInput}
                  value={form.singleCoursePrice || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      singleCoursePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="[set]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Full Freshman Package */}
        <div className={styles.pricingCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Full Freshman Package</h2>
            <span className={styles.cardBadge}>All-Inclusive</span>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="fullStreamPrice">
                Per stream (ETB)
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="fullStreamPrice"
                  type="number"
                  className={styles.textInput}
                  value={form.fullStreamPrice || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fullStreamPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="350"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="fullBothPrice">
                Both streams (ETB)
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="fullBothPrice"
                  type="number"
                  className={styles.textInput}
                  value={form.fullBothPrice || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fullBothPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="[set]"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="fullStreamDuration">
                Duration (days)
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="fullStreamDuration"
                  type="number"
                  className={styles.textInput}
                  value={form.fullStreamDurationDays || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fullStreamDurationDays: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  placeholder="[set]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Card: Free trial default */}
      <div className={styles.trialCard}>
        <div className={styles.trialTitleRow}>
          <h2 className={styles.trialTitle}>Free trial default</h2>
          <span className={styles.trialBadge}>Global Default</span>
        </div>

        <div className={styles.checkboxRow}>
          <label
            className={`${styles.checkboxCard} ${
              form.freeTrial.firstChapterModuleFree ? styles.checkboxCardActive : ''
            }`}
          >
            <input
              type="checkbox"
              className={styles.customCheckbox}
              checked={form.freeTrial.firstChapterModuleFree}
              onChange={(e) =>
                setForm({
                  ...form,
                  freeTrial: {
                    ...form.freeTrial,
                    firstChapterModuleFree: e.target.checked,
                  },
                })
              }
            />
            <span className={styles.checkboxText}>First chapter of each module free</span>
          </label>

          <label
            className={`${styles.checkboxCard} ${
              form.freeTrial.firstChapterQuizFree ? styles.checkboxCardActive : ''
            }`}
          >
            <input
              type="checkbox"
              className={styles.customCheckbox}
              checked={form.freeTrial.firstChapterQuizFree}
              onChange={(e) =>
                setForm({
                  ...form,
                  freeTrial: {
                    ...form.freeTrial,
                    firstChapterQuizFree: e.target.checked,
                  },
                })
              }
            />
            <span className={styles.checkboxText}>First chapter of each quiz free</span>
          </label>

          <label
            className={`${styles.checkboxCard} ${
              form.freeTrial.cocSampleSetFree ? styles.checkboxCardActive : ''
            }`}
          >
            <input
              type="checkbox"
              className={styles.customCheckbox}
              checked={form.freeTrial.cocSampleSetFree}
              onChange={(e) =>
                setForm({
                  ...form,
                  freeTrial: {
                    ...form.freeTrial,
                    cocSampleSetFree: e.target.checked,
                  },
                })
              }
            />
            <span className={styles.checkboxText}>COC sample set</span>
          </label>
        </div>
      </div>

      {/* Subtext notice */}
      <p className={styles.footerNotice}>
        Changes apply to new orders only. Pending orders keep their quoted price. Every change is logged.
      </p>

      {/* Toast Notification */}
      {showToast && (
        <div className={`${styles.toast} ${styles.toastSuccess}`}>
          <Icon name="check" size={18} />
          <span>Pricing changes saved successfully and recorded in audit log.</span>
        </div>
      )}

      {/* Modal: Student Payment Audit */}
      {showAuditModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAuditModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Student Payments Audit ({stats?.paidStudentsList.length ?? 0} Verified Students)
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowAuditModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-muted)' }}>
                All student payments counted towards the total ETB revenue. Courses have been unlocked for these students.
              </p>

              <table className={styles.auditTable}>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>University</th>
                    <th>Package / Type</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.paidStudentsList.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.studentName}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          ID: {item.studentId}
                        </div>
                      </td>
                      <td>{item.universityShortName}</td>
                      <td>{item.type.replace('_', ' ')}</td>
                      <td>{item.method.replace('_', ' ')}</td>
                      <td>
                        <code style={{ fontSize: '12px' }}>{item.reference}</code>
                      </td>
                      <td className={styles.amountHighlight}>
                        ETB {formatBirr(item.amount)}
                      </td>
                      <td>
                        <span className={styles.badgePaid}>APPROVED</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
