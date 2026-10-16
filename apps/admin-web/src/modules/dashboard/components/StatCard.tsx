// apps/admin-web/src/modules/dashboard/components/StatCard.tsx
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: number;
}

/** One headline number. The label comes first so screen readers announce what the number is. */
export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className={styles.card}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value.toLocaleString('en-US')}</p>
    </div>
  );
}
