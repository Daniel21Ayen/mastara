// apps/mobile/src/modules/store/hooks/useReceipt.ts
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { compressReceipt } from '../lib/compressReceipt';
import type { Receipt } from '../lib/compressReceipt';

/** Pick a payment screenshot from the gallery and shrink it to under 300 KB. */
export function useReceipt() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const pick = useCallback(async () => {
    setFailed(false);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;

    setBusy(true);
    try {
      setReceipt(await compressReceipt(asset.uri, asset.width));
    } catch {
      setReceipt(null);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, []);

  return { receipt, busy, failed, pick };
}
