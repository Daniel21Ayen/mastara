// apps/admin-web/src/modules/catalog/components/UniversityLogo.tsx
import { palette } from '@mastara/ui-tokens';
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

/**
 * Dark enough for white text (contrast 4.5:1 or more).
 * Uses tints of the four canonical palette colours — no new hex values allowed.
 */
const BADGE_COLORS = [
  palette.primary,
  palette.ink,
  // tints derived from the same two palette values
  'rgba(26,86,219,0.75)',
  'rgba(15,23,42,0.80)',
  'rgba(15,23,42,0.65)',
  'rgba(15,23,42,0.50)',
] as const;

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
        background: shared ? palette.ink : colorFor(id),
      }}
      aria-hidden="true"
    >
      {logoUrl ? <img className={styles.image} src={logoUrl} alt="" /> : label}
    </span>
  );
}
