// apps/mobile/src/modules/support/components/NewTicketSheet.tsx
import { createTicketSchema } from '@mastara/contracts';
import { useState } from 'react';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { useTheme } from '@/core/theme';
import { FormTextField } from '@/shared/forms';
import { useForm } from '@/shared/hooks';
import { AppButton, AppText, BottomSheet } from '@/shared/ui';

import { supportApi } from '../api/support.api';

interface NewTicketSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewTicketSheet({ visible, onClose, onCreated }: NewTicketSheetProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { user } = useSession();
  const form = useForm(createTicketSchema, { subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send() {
    const data = form.validate();
    if (!data || !user) return;
    setSending(true);
    setFailed(false);
    try {
      await supportApi.createTicket(user.id, data);
      form.setValues({ subject: '', message: '' });
      onCreated();
      onClose();
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <BottomSheet visible={visible} title={t('support.new')} onClose={onClose} scroll>
      <FormTextField form={form} name="subject" label={t('support.subject')} autoCapitalize="sentences" />
      <FormTextField form={form} name="message" label={t('support.message')} autoCapitalize="sentences" />
      {failed ? <AppText color={theme.colors.danger}>{t('error.generic')}</AppText> : null}
      <AppButton label={t('support.send')} onPress={() => void send()} loading={sending} />
    </BottomSheet>
  );
}
