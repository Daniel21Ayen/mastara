// apps/mobile/src/modules/store/screens/BuilderScreen.tsx
import { quoteOrder } from '@mastara/domain';
import type { StudentStream } from '@mastara/domain';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { createStyles, useTheme } from '@/core/theme';
import { AppButton, AppText, Badge, Screen, SelectableRow, TopBar } from '@/shared/ui';

import { PriceSummary } from '../components/PriceSummary';
import { useBuyableCourses, usePricing } from '../hooks/useStoreData';
import { useOrderDraft } from '../state/OrderDraftContext';

/** Choose the courses for a Semester Bundle (7 to 10, extras beyond) or a Single course. */
export function BuilderScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const router = useRouter();
  const { profile } = useSession();
  const { draft, setDraft } = useOrderDraft();
  const pricing = usePricing();

  const stream: StudentStream = draft?.stream === 'SOCIAL' ? 'SOCIAL' : 'NATURAL';
  const isSingle = draft?.type === 'SINGLE';
  const courses = useBuyableCourses(profile?.semesterId ?? '', stream);
  const [selected, setSelected] = useState<string[]>([]);
  const [seeded, setSeeded] = useState(false);

  const config = pricing.data;
  const bundle = config?.bundle;

  // Start from the student's own course list (only courses that can be bought).
  useEffect(() => {
    if (seeded || !courses.data || isSingle) return;
    const mine = new Set(profile?.courseIds ?? []);
    setSelected(courses.data.filter((item) => item.buyable && mine.has(item.course.id)).map((item) => item.course.id));
    setSeeded(true);
  }, [seeded, courses.data, isSingle, profile?.courseIds]);

  const quote = useMemo(() => {
    if (!config || selected.length === 0) return null;
    return quoteOrder(config, isSingle ? { type: 'SINGLE' } : { type: 'BUNDLE', courseCount: selected.length });
  }, [config, selected.length, isSingle]);

  const valid = quote?.ok === true && (!isSingle || selected.length === 1);

  function toggle(courseId: string) {
    setSelected((current) => {
      if (isSingle) return [courseId];
      return current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId];
    });
  }

  function next() {
    if (!draft || !valid) return;
    setDraft({ ...draft, courseIds: selected });
    router.push('/store/checkout' as Href);
  }

  return (
    <Screen scroll>
      <TopBar title={t(isSingle ? 'store.product.SINGLE' : 'store.product.BUNDLE')} onBack={() => router.back()} />

      {bundle ? (
        <AppText muted>
          {isSingle ? t('builder.help.SINGLE') : t('builder.help.BUNDLE', { min: bundle.minCourses, max: bundle.maxCourses })}
        </AppText>
      ) : null}

      {courses.loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {!courses.loading && (courses.data ?? []).length === 0 ? <AppText muted>{t('builder.empty')}</AppText> : null}

      <View style={styles.list}>
        {(courses.data ?? []).map((item) => {
          const owned = item.access === 'PAID' && item.daysLeft !== undefined;
          return (
            <SelectableRow
              key={item.course.id}
              title={item.course.title}
              description={
                owned
                  ? t(item.buyable ? 'builder.renew' : 'builder.owned', { n: item.daysLeft ?? 0 })
                  : item.course.code
              }
              selected={selected.includes(item.course.id)}
              disabled={!item.buyable}
              onToggle={() => toggle(item.course.id)}
              trailing={owned ? <Badge label={t('access.paid')} /> : undefined}
            />
          );
        })}
      </View>

      <AppText bold>{t('builder.count', { n: selected.length })}</AppText>
      {!isSingle && bundle && selected.length < bundle.minCourses ? (
        <AppText variant="caption" color={theme.colors.danger}>
          {t('builder.need', { min: bundle.minCourses })}
        </AppText>
      ) : null}

      {quote?.ok ? <PriceSummary quote={quote.quote} /> : null}
      <AppButton label={t('builder.continue')} disabled={!valid} onPress={next} />
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  list: { gap: theme.spacing.sm },
}));
