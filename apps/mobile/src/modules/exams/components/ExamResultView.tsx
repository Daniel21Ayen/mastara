// apps/mobile/src/modules/exams/components/ExamResultView.tsx
import { useEffect, useState } from 'react';
import type { ExamScore } from '@mastara/domain';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useOnline } from '@/core/network';
import { outbox, useSync } from '@/core/sync';
import { createStyles, useTheme } from '@/core/theme';
import { AppButton, AppText, Card, Icon, ProgressBar } from '@/shared/ui';

interface ExamResultViewProps {
  score: ExamScore;
  /** Sitting ID for tracking outbox upload reconciliation. */
  sittingId?: string;
  /** When given, a per-course breakdown is shown (COC mixes courses). */
  courseTitles?: Record<string, string>;
  /** Opens the answer review. Not shown when there is nothing to review. */
  onReview?: () => void;
  onBack: () => void;
}

const percentOf = (correct: number, total: number) => (total > 0 ? Math.round((correct / total) * 100) : 0);

export function ExamResultView({ score, sittingId, courseTitles, onReview, onBack }: ExamResultViewProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const online = useOnline();
  const { pending, syncing, syncNow } = useSync();
  const [sittingPending, setSittingPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkPending() {
      if (!sittingId) {
        setSittingPending(!online || pending > 0);
        return;
      }
      const isPending = await outbox.isSittingPending(sittingId);
      if (!cancelled) setSittingPending(isPending);
    }

    void checkPending();
    const unsub = outbox.subscribe(() => void checkPending());
    return () => {
      cancelled = true;
      unsub();
    };
  }, [sittingId, online, pending]);

  const percent = percentOf(score.correct, score.total);
  const lines = Object.entries(score.byCourse);

  // Status banner styling & messages
  let bannerBg = theme.accents.emerald.soft;
  let bannerText = theme.accents.emerald.main;
  let bannerTitle = t('exam.result.title');
  let bannerSub = t('exam.result.syncedNotice');
  let bannerIcon: 'check' | 'wifiOff' | 'sync' = 'check';

  if (syncing) {
    bannerBg = theme.accents.blue.soft;
    bannerText = theme.accents.blue.main;
    bannerTitle = t('sync.syncing');
    bannerSub = t('exam.result.syncingNotice');
    bannerIcon = 'sync';
  } else if (!online) {
    bannerBg = theme.accents.amber.soft;
    bannerText = theme.accents.amber.main;
    bannerTitle = t('exam.result.offlineTitle');
    bannerSub = t('exam.result.offlineNotice');
    bannerIcon = 'wifiOff';
  } else if (sittingPending) {
    bannerBg = theme.accents.amber.soft;
    bannerText = theme.accents.amber.main;
    bannerTitle = t('exam.result.statusPending');
    bannerSub = t('exam.result.offlineNotice');
    bannerIcon = 'sync';
  }

  return (
    <View style={styles.wrap}>
      {/* Offline/Online Queue Status Card */}
      <View style={[styles.statusBanner, { backgroundColor: bannerBg }]}>
        <View style={styles.bannerRow}>
          {syncing ? (
            <ActivityIndicator size="small" color={bannerText} />
          ) : (
            <View style={[styles.iconCircle, { backgroundColor: bannerText }]}>
              <Icon name={bannerIcon} size={16} color={theme.colors.onPrimary} />
            </View>
          )}
          <View style={styles.flex}>
            <AppText bold color={bannerText}>
              {bannerTitle}
            </AppText>
            <AppText variant="caption" color={bannerText} style={styles.noticeText}>
              {bannerSub}
            </AppText>
          </View>
        </View>

        {online && sittingPending && !syncing ? (
          <View style={styles.syncBtnHolder}>
            <AppButton
              label={t('exam.result.syncNow')}
              variant="outline"
              onPress={() => void syncNow()}
            />
          </View>
        ) : null}
      </View>

      {/* Main Score Card */}
      <Card>
        <AppText variant="caption" muted bold>
          {online && !sittingPending ? t('exam.result.statusSynced') : t('exam.result.statusPending')}
        </AppText>
        <AppText variant="title" color={theme.accents.fuchsia.main}>
          {t('result.score', { correct: score.correct, total: score.total })}
        </AppText>
        <ProgressBar value={percent} accent="fuchsia" />
        <AppText muted>{t('result.percent', { n: percent })}</AppText>
      </Card>

      {courseTitles && lines.length > 1 ? (
        <Card>
          <AppText bold>{t('exam.result.byCourse')}</AppText>
          {lines.map(([courseId, line]) => (
            <View key={courseId} style={styles.line}>
              <View style={styles.lineText}>
                <AppText variant="caption">{courseTitles[courseId] ?? courseId}</AppText>
                <AppText variant="caption" bold>
                  {line.correct}/{line.total}
                </AppText>
              </View>
              <ProgressBar value={percentOf(line.correct, line.total)} />
            </View>
          ))}
        </Card>
      ) : null}

      {onReview ? <AppButton label={t('exam.result.review')} onPress={onReview} /> : null}
      <AppButton label={t('exam.result.back')} variant={onReview ? 'outline' : 'primary'} onPress={onBack} />
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.md },
  statusBanner: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  noticeText: {
    marginTop: 2,
    lineHeight: 16,
  },
  syncBtnHolder: {
    marginTop: theme.spacing.xs,
  },
  line: { gap: theme.spacing.xs },
  lineText: { flexDirection: 'row', justifyContent: 'space-between' },
}));
