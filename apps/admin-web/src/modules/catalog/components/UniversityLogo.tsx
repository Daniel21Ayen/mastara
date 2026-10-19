// apps/admin-web/src/modules/catalog/components/UniversityLogo.tsx
import { ALL_UNIVERSITIES } from '@mastara/domain';

import { adminText } from '@/core/i18n';

import styles from './UniversityLogo.module.css';

interface UniversityLogoProps {
  /** University ID, or ALL for a course every university can use. */
  id: string;
  shortName: string;
  /** Address of the real logo. Without it the short name is drawn in a coloured badge. */
  logoUrl?: string | undefined;
  size?: number;
}

/** Dark enough for white text (contrast 4.5:1 or more), using canonical admin blue and slate tones. */
const BADGE_COLORS = ['#1a56db', '#1e40af', '#0f172a', '#1e293b', '#334155', '#475569'] as const;

function colorFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return BADGE_COLORS[hash % BADGE_COLORS.length] ?? BADGE_COLORS[0];
}

/** The logo of a university. The name is spoken once by the text next to it, so the picture is decorative. */
export function UniversityLogo({ id, shortName, logoUrl, size = 40 }: UniversityLogoProps) {
  const shared = id === ALL_UNIVERSITIES;
  const label = shared ? adminText('admin.catalog.form.allBadge') : shortName.slice(0, 3).toUpperCase();
  return (
    <span
      className={styles.logo}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * (label.length > 2 ? 0.3 : 0.4)),
        background: shared ? '#334155' : colorFor(id),
      }}
      aria-hidden="true"
    >
      {logoUrl ? <img className={styles.image} src={logoUrl} alt="" /> : label}
    </span>
  );
}
