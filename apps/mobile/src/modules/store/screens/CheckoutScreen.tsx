// apps/mobile/src/modules/store/screens/CheckoutScreen.tsx
import { referenceSchemaFor } from '@mastara/contracts';
import { ERROR_CODES, PAYMENT_METHODS, quoteOrder } from '@mastara/domain';
import type { PaymentMethod } from '@mastara/domain';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { useI18n } from '@/core/i18n';
import { isApiError } from '@/core/network';
import { useSession } from '@/core/session';
import { useTheme } from '@/core/theme';
import { AppButton, AppText, Screen, SegmentedControl, TextField, TopBar } from '@/shared/ui';
import type { SegmentOption } from '@/shared/ui';

import { storeApi } from '../api/store.api';
import { AccountCard } from '../components/AccountCard';
import { PriceSummary } from '../components/PriceSummary';
import { ReceiptPicker } from '../components/ReceiptPicker';
import { useAccounts, useFullCoverage, usePricing } from '../hooks/useStoreData';
import { useReceipt } from '../hooks/useReceipt';
import { useOrderDraft } from '../state/OrderDraftContext';

/** Payment instructions, receipt screenshot, reference number and submit. */
export function CheckoutScreen() {
  const theme = useTheme();
  const { t, te } = useI18n();
  const router = useRouter();
  const { user, profile } = useSession();
  const { draft, setDraft } = useOrderDraft();
  const pricing = usePricing();
  const accounts = useAccounts();
  const receipt = useReceipt();

  const [method, setMethod] = useState<PaymentMethod>('CBE_MOBILE');
  const [reference, setReference] = useState('');
  const [referenceError, setReferenceError] = useState<string>();
  const [receiptError, setReceiptError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const isFull = draft?.type === 'FULL_STREAM' || draft?.type === 'FULL_BOTH';
  const coverage = useFullCoverage(profile?.programId ?? '', draft?.stream ?? 'NATURAL', Boolean(isFull));

  const quote = useMemo(() => {
    if (!pricing.data || !draft) return null;
    const result = quoteOrder(
      pricing.data,
      draft.type === 'BUNDLE' ? { type: 'BUNDLE', courseCount: draft.courseIds.length } : { type: draft.type },
    );
    return result.ok ? result.quote : null;
  }, [pricing.data, draft]);

  const methods: SegmentOption<PaymentMethod>[] = PAYMENT_METHODS.map((value) => ({
    value,
    label: t(`checkout.method.${value}`),
  }));

  async function submit() {
    if (!draft || !user || !quote) return;

    const check = referenceSchemaFor(method).safeParse(reference);
    setReferenceError(check.success ? undefined : check.error.issues[0]?.message);
    setReceiptError(receipt.receipt ? undefined : 'validation.receipt');
    if (!check.success || !receipt.receipt) return;

    setSubmitting(true);
    setSubmitError(undefined);
    try {
      await storeApi.createOrder(
        user.id,
        {
          type: draft.type,
          stream: draft.stream,
          courseIds: draft.courseIds,
          programId: profile?.programId,
          method,
          reference,
        },
        receipt.receipt.bytes,
      );
      setDraft(null);
      router.replace('/store/orders' as Href);
    } catch (error) {
      if (isApiError(error, ERROR_CODES.TRANSACTION_REFERENCE_DUPLICATE)) setSubmitError('checkout.duplicate');
      else if (isApiError(error, ERROR_CODES.RECEIPT_TOO_LARGE)) setSubmitError('checkout.tooLarge');
      else if (isApiError(error, ERROR_CODES.NETWORK_OFFLINE)) setSubmitError('error.offline');
      else setSubmitError('error.generic');
    } finally {
      setSubmitting(false);
    }
  }

  if (!draft) {
    return (
      <Screen>
        <TopBar title={t('checkout.title')} onBack={() => router.back()} />
        <AppButton label={t('common.back')} variant="outline" onPress={() => router.replace('/store' as Href)} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <TopBar title={t('checkout.title')} onBack={() => router.back()} />

      {!quote ? <ActivityIndicator color={theme.colors.primary} /> : <PriceSummary quote={quote} />}
      {isFull && coverage.data ? <AppText muted>{t('builder.covers', { count: coverage.data.length })}</AppText> : null}

      <SegmentedControl options={methods} value={method} onChange={setMethod} />
      {quote && accounts.data ? <AccountCard account={accounts.data[method]} amount={quote.total} /> : null}

      <ReceiptPicker
        receipt={receipt.receipt}
        busy={receipt.busy}
        failed={receipt.failed}
        error={te(receiptError)}
        onPick={() => void receipt.pick()}
      />

      <TextField
        label={t('checkout.reference')}
        value={reference}
        onChangeText={(value) => {
          setReference(value);
          setReferenceError(undefined);
        }}
        placeholder={t(method === 'CBE_MOBILE' ? 'checkout.hint.CBE_MOBILE' : 'checkout.hint.other')}
        autoCapitalize="characters"
        error={te(referenceError)}
      />

      {submitError ? <AppText color={theme.colors.danger}>{te(submitError)}</AppText> : null}
      <AppButton label={t('checkout.submit')} onPress={() => void submit()} loading={submitting} />
    </Screen>
  );
}

