// apps/admin-web/src/modules/students/components/StatusBadges.tsx
import type { DeviceStatus, StudentAccessState, StudentStatus } from '@mastara/domain';

import { adminText } from '@/core/i18n';
import { Badge } from '@/shared/ui';
import type { BadgeTone } from '@/shared/ui';

const DEVICE_TONE: Record<DeviceStatus, BadgeTone> = { BOUND: 'primary', RELEASED: 'neutral' };
const ACCESS_TONE: Record<StudentAccessState, BadgeTone> = {
  PAID: 'primary',
  PENDING: 'neutral',
  FREE_TRIAL: 'neutral',
  EXPIRED: 'danger',
};
const STATUS_TONE: Record<StudentStatus, BadgeTone> = { ACTIVE: 'primary', SUSPENDED: 'danger' };

/** The word is always shown; colour only adds emphasis. */
export function DeviceBadge({ device }: { device: DeviceStatus }) {
  return <Badge tone={DEVICE_TONE[device]}>{adminText(`admin.device.${device}`)}</Badge>;
}

export function AccessBadge({ access }: { access: StudentAccessState }) {
  return <Badge tone={ACCESS_TONE[access]}>{adminText(`admin.access.${access}`)}</Badge>;
}

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{adminText(`admin.studentStatus.${status}`)}</Badge>;
}
