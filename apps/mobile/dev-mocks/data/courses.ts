// apps/mobile/src/core/mock/data/courses.ts
import type { Course } from '@mastara/contracts';

import { semesters } from './semesters';

type CourseTemplate = Pick<Course, 'code' | 'title' | 'stream'>;

const semesterOne: readonly CourseTemplate[] = [
  { code: 'ENG101', title: 'Communicative English Language Skills', stream: 'COMMON' },
  { code: 'LOG101', title: 'Logic and Critical Thinking', stream: 'COMMON' },
  { code: 'CIV101', title: 'Civics and Ethical Education', stream: 'COMMON' },
  { code: 'MAT101', title: 'Calculus I (Applied Mathematics I)', stream: 'NATURAL' },
  { code: 'PHY101', title: 'General Physics', stream: 'NATURAL' },
  { code: 'CHE101', title: 'General Chemistry', stream: 'NATURAL' },
  { code: 'GEO101', title: 'Geography of Ethiopia and the Horn', stream: 'SOCIAL' },
  { code: 'HIS101', title: 'History of Ethiopia and the Horn', stream: 'SOCIAL' },
  { code: 'ECO101', title: 'Introduction to Economics', stream: 'SOCIAL' },
];

const semesterTwo: readonly CourseTemplate[] = [
  { code: 'ENG102', title: 'Basic Writing Skills', stream: 'COMMON' },
  { code: 'ANT102', title: 'Social Anthropology', stream: 'COMMON' },
  { code: 'FIT102', title: 'Physical Fitness and Health', stream: 'COMMON' },
  { code: 'MAT102', title: 'Calculus II (Applied Mathematics II)', stream: 'NATURAL' },
  { code: 'BIO102', title: 'General Biology', stream: 'NATURAL' },
  { code: 'PHY102', title: 'Mechanics and Heat', stream: 'NATURAL' },
  { code: 'MAT112', title: 'Mathematics for Social Sciences', stream: 'SOCIAL' },
  { code: 'PSY102', title: 'Introduction to Psychology', stream: 'SOCIAL' },
  { code: 'GEO102', title: 'Introduction to Human Geography', stream: 'SOCIAL' },
];

export const courses: readonly Course[] = semesters.flatMap((semester) =>
  (semester.number === 1 ? semesterOne : semesterTwo).map((template) => ({
    ...template,
    id: `${semester.id}-${template.code.toLowerCase()}`,
    semesterId: semester.id,
  })),
);
