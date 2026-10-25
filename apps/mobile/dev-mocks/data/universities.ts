// apps/mobile/src/core/mock/data/universities.ts
import type { University } from '@mastara/contracts';

export const universities: readonly University[] = [
  { id: 'aastu', name: 'Addis Ababa Science and Technology University', shortName: 'AASTU' },
  { id: 'aau', name: 'Addis Ababa University', shortName: 'AAU' },
  { id: 'bdu', name: 'Bahir Dar University', shortName: 'BDU' },
  { id: 'ju', name: 'Jimma University', shortName: 'JU' },
  { id: 'mu', name: 'Mekelle University', shortName: 'MU' },
  { id: 'inu', name: 'Injibara University', shortName: 'INU' },
];

export function universityOf(id: string): University | undefined {
  return universities.find((u) => u.id === id);
}

