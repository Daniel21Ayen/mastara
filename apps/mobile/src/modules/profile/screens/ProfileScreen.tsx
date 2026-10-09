// apps/mobile/src/modules/profile/screens/ProfileScreen.tsx
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getDeviceName } from '@/core/device';
import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { theme } from '@/core/theme';
import { ReleaseDeviceSheet } from '@/modules/device-lock';
import { useUnreadCount } from '@/modules/notifications';
import { AppButton, AppText, Badge, Card, ListRow, Screen, SegmentedControl } from '@/shared/ui';
import type { SegmentOption } from '@/shared/ui';

import { SyncStatusCard } from '../components/SyncStatusCard';
import { useAcademicLabels } from '../hooks/useAcademicLabels';

const LANGUAGE_OPTIONS: SegmentOption<'en' | 'am'>[] = [
  { value: 'en', label: 'English' },
  { value: 'am', label: 'አማርኛ' },
];

/** Profile tab: account, academic details, course list, store, notifications, support, language, device and log out. */
export function ProfileScreen() {
  const { t, language, setLanguage } = useI18n();
  const router = useRouter();
  const { user, profile, signOut } = useSession();
  const labels = useAcademicLabels(profile);
  const unread = useUnreadCount();
  const [releaseOpen, setReleaseOpen] = useState(false);

  const go = (path: string) => () => router.push(path as Href);
  const streamLabel = t(profile?.stream === 'SOCIAL' ? 'courses.filter.social' : 'courses.filter.natural');
  const academicLine = labels
    ? [labels.university, labels.program, labels.semester ? t('profile.semesterLine', { n: labels.semester }) : '', streamLabel]
        .filter(Boolean)
        .join(' · ')
    : streamLabel;

  return (
    <Screen scroll inTabs>
      <Card>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <AppText variant="heading" color={theme.colors.onPrimary}>
              {(user?.name ?? '?').charAt(0).toUpperCase()}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="heading">{user?.name}</AppText>
            <AppText variant="caption" muted>
              {user?.identifier}
            </AppText>
          </View>
          <AppButton label={t('profile.edit')} variant="outline" onPress={go('/settings/account')} />
        </View>
      </Card>

      <View style={styles.list}>
        <ListRow icon="course" title={t('profile.academic')} subtitle={academicLine} onPress={go('/settings/academic')} />
        <ListRow
          icon="module"
          title={t('profile.myCourses')}
          subtitle={t('profile.myCourses.sub', { n: profile?.courseIds.length ?? 0 })}
          onPress={go('/course')}
        />
        <ListRow icon="store" title={t('profile.store')} onPress={go('/store')} />
        <ListRow
          icon="bell"
          title={t('profile.notifications')}
          trailing={unread > 0 ? <Badge label={String(unread)} tone="danger" /> : undefined}
          onPress={go('/notifications')}
        />
        <ListRow icon="note" title={t('profile.support')} subtitle={t('profile.support.sub')} onPress={go('/support')} />
      </View>

      <SyncStatusCard />

      <Card>
        <AppText bold>{t('profile.language')}</AppText>
        <SegmentedControl options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
      </Card>

      <Card>
        <AppText bold>{t('profile.security')}</AppText>
        <AppText>{getDeviceName()}</AppText>
        <AppText variant="caption" muted>
          {t('profile.device.sub')}
        </AppText>
        <AppButton label={t('profile.release')} variant="outline" onPress={() => setReleaseOpen(true)} />
      </Card>

      <AppButton label={t('common.logout')} onPress={signOut} />

      <ReleaseDeviceSheet visible={releaseOpen} onClose={() => setReleaseOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  flex: { flex: 1 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: theme.spacing.sm },
});
