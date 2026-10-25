// apps/mobile/src/modules/access/components/LockedSheet.tsx
import { LockedContentSheet } from '@/shared/ui/LockedContentSheet';
import type { LockedContentSheetProps } from '@/shared/ui/LockedContentSheet';

export { LockedContentSheet };
export type { LockedContentSheetProps };

export function LockedSheet(props: LockedContentSheetProps) {
  return <LockedContentSheet {...props} />;
}
