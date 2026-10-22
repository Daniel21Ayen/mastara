// apps/mobile/src/core/mock/data/programs.ts
import type { Program } from '@mastara/contracts';

export const programs: readonly Program[] = [
  { id: 'aastu-se', universityId: 'aastu', name: 'Software Engineering' },
  { id: 'aastu-ce', universityId: 'aastu', name: 'Civil Engineering' },
  { id: 'aau-pre', universityId: 'aau', name: 'Pre-Engineering & Natural Science' },
  { id: 'aau-soc', universityId: 'aau', name: 'Social Science & Humanities' },
  { id: 'bdu-acc', universityId: 'bdu', name: 'Accounting & Finance' },
  { id: 'bdu-cs', universityId: 'bdu', name: 'Computer Science' },
  { id: 'ju-med', universityId: 'ju', name: 'Medicine & Health Sciences' },
  { id: 'ju-eco', universityId: 'ju', name: 'Economics & Management' },
  { id: 'mu-law', universityId: 'mu', name: 'Law & Governance' },
  { id: 'mu-bio', universityId: 'mu', name: 'Biology' },
  { id: 'inu-rem', universityId: 'inu', name: 'Freshman Remedial Program' },
];
