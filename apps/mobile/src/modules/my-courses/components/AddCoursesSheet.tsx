// apps/mobile/src/modules/my-courses/components/AddCoursesSheet.tsx
import type { StudentProfile } from '@mastara/contracts';
import { useEffect, useState } from 'react';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { useTheme } from '@/core/theme';
import { CoursePicker } from '@/modules/course-list';
import { useSaveProfile } from '@/modules/profile';
import { AppButton, AppText, BottomSheet } from '@/shared/ui';

interface AddCoursesSheetProps {
  visible: boolean;
  profile: StudentProfile;
  onClose: () => void;
}

/** Add or remove courses without leaving My Courses. Saves to the profile, which refreshes the list. */
export function AddCoursesSheet({ visible, profile, onClose }: AddCoursesSheetProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { user } = useSession();
  const saveProfile = useSaveProfile();
  const [ids, setIds] = useState<string[]>(profile.courseIds);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (visible) {
      setIds(profile.courseIds);
      setFailed(false);
    }
  }, [visible, profile.courseIds]);

  async function save() {
    if (!user) return;
    setSaving(true);
    setFailed(false);
    try {
      const next: StudentProfile = { ...profile, courseIds: ids };
      await saveProfile(next);
      onClose();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} title={t('mycourses.addSheet.title')} onClose={onClose} scroll>
      <CoursePicker semesterId={profile.semesterId} stream={profile.stream} selectedIds={ids} onChange={setIds} />
      {failed ? <AppText color={theme.colors.danger}>{t('error.generic')}</AppText> : null}
      <AppButton label={t('common.save')} onPress={save} loading={saving} />
    </BottomSheet>
  );
}
