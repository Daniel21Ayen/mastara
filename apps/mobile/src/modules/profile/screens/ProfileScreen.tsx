// apps/mobile/src/modules/profile/screens/ProfileScreen.tsx
import { formatBytes } from '@mastara/domain';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { getDeviceName } from '@/core/device';
import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { createStyles, useTheme } from '@/core/theme';
import { ReleaseDeviceSheet } from '@/modules/device-lock';
import { useDownloadList } from '@/modules/downloads';
import { useUnreadCount } from '@/modules/notifications';
import { AppButton, AppText, Badge, Card, IconTile, ListRow, Screen, SegmentedControl, ThemeSwitch } from '@/shared/ui';
import type { SegmentOption } from '@/shared/ui';

import { SyncStatusCard } from '../components/SyncStatusCard';
import { useAcademicLabels } from '../hooks/useAcademicLabels';

const LANGUAGE_OPTIONS: SegmentOption<'en' | 'am'>[] = [
  { value: 'en', label: 'English' },
  { value: 'am', label: 'አማርኛ' },
];

/** Profile tab: account, academic details, course list, store, notifications, support, language, device and log out. */
export function ProfileScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t, language, setLanguage } = useI18n();
  const router = useRouter();
  const { user, profile, signOut } = useSession();
  const labels = useAcademicLabels(profile);
  const downloads = useDownloadList();
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
        <ListRow
          icon="download"
          title={t('profile.downloads')}
          subtitle={t('downloads.summary', { count: downloads.units.length, size: formatBytes(downloads.totalBytes) })}
          onPress={go('/settings/downloads')}
        />
        <ListRow icon="support" title={t('profile.support')} subtitle={t('profile.support.sub')} onPress={go('/support')} />
      </View>

      <SyncStatusCard />

      <Card>
        <View style={styles.cardTitle}>
          <IconTile icon="language" size={36} />
          <AppText bold>{t('profile.language')}</AppText>
        </View>
        <SegmentedControl options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
      </Card>

      <Card>
        <View style={styles.cardTitle}>
          <IconTile icon="palette" size={36} />
          <AppText bold>{t('profile.appearance')}</AppText>
        </View>
        <ThemeSwitch />
      </Card>

      <Card>
        <View style={styles.cardTitle}>
          <IconTile icon="shield" size={36} />
          <AppText bold>{t('profile.security')}</AppText>
        </View>
        <AppText>{getDeviceName()}</AppText>
        <AppText variant="caption" muted>
          {t('profile.device.sub')}
        </AppText>
        <AppButton label={t('profile.release')} variant="outline" onPress={() => setReleaseOpen(true)} />
      </Card>

      <AppButton label={t('common.logout')} variant="danger" onPress={signOut} />

      <ReleaseDeviceSheet visible={releaseOpen} onClose={() => setReleaseOpen(false)} />
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
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
}));
