// apps/mobile/src/modules/reader/screens/ReaderScreen.tsx
import { CONTENT_LANGS } from '@mastara/domain';
import type { ContentLang } from '@mastara/domain';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppButton, AppText, Card, RichText, Screen, SegmentedControl, TopBar } from '@/shared/ui';
import type { SegmentOption } from '@/shared/ui';

import { useReader } from '../hooks/useReader';

function asLang(value: string | undefined): ContentLang {
  return CONTENT_LANGS.find((lang) => lang === value) ?? 'en';
}

export function ReaderScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ topicId: string; lang?: string }>();
  const [lang, setLang] = useState<ContentLang>(asLang(params.lang));
  const { data, loading, error, reload } = useReader(params.topicId ?? '');

  const languages: SegmentOption<ContentLang>[] = [
    { value: 'en', label: t('common.english') },
    { value: 'am', label: t('common.amharic') },
  ];

  const goTo = (topicId: string) => router.replace(`/reader/${topicId}?lang=${lang}` as Href);

  const rawTitle = data?.topic.title;
  const topicTitle = typeof rawTitle === 'string' ? rawTitle : (rawTitle?.[lang] ?? (rawTitle as any)?.en ?? '');
  const rawBody = data?.topic.body;
  const topicBody = typeof rawBody === 'string' ? rawBody : (rawBody?.[lang] ?? (rawBody as any)?.en ?? '');

  return (
    <Screen scroll>
      <TopBar title={topicTitle} onBack={() => router.back()} />

      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}
      {!loading && !error && !data ? <AppText muted>{t('reader.notFound')}</AppText> : null}

      {data && !data.canOpen ? (
        <Card>
          <AppText muted>{t('reader.locked')}</AppText>
        </Card>
      ) : null}

      {data?.canOpen ? (
        <>
          {/* One bilingual record: switching language keeps the same topic and place. */}
          <SegmentedControl options={languages} value={lang} onChange={setLang} />

          <Card>
            <RichText text={topicBody} lang={lang} />
          </Card>

          <AppText variant="caption" muted style={styles.position}>
            {t('reader.position', { current: data.index + 1, total: data.total })}
          </AppText>
          <View style={styles.nav}>
            <View style={styles.flex}>
              <AppButton
                label={t('reader.previous')}
                variant="outline"
                disabled={!data.previousId}
                onPress={() => data.previousId && goTo(data.previousId)}
              />
            </View>
            <View style={styles.flex}>
              <AppButton
                label={t('reader.next')}
                disabled={!data.nextId}
                onPress={() => data.nextId && goTo(data.nextId)}
              />
            </View>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  position: { textAlign: 'center' },
  nav: { flexDirection: 'row', gap: theme.spacing.sm },
  flex: { flex: 1 },
});
