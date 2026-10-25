// apps/admin-web/src/core/mock/data/catalog.ts
import type { Course, Program, Semester, University } from '@mastara/contracts';

/**
 * Mock academic catalog. It mirrors the student app's mock catalog (same IDs), so what an admin sees
 * matches what a student picks. The lists are mutable: `catalogAdmin.ts` adds and edits entries (F11c). The API serves the real tree later.
 */

export const universities: University[] = [
  { id: 'aastu', name: 'Addis Ababa Science and Technology University', shortName: 'AASTU' },
  { id: 'bdu', name: 'Bahir Dar University', shortName: 'BDU' },
  { id: 'ju', name: 'Jimma University', shortName: 'Jimma' },
  { id: 'mu', name: 'Mekelle University', shortName: 'Mekelle' },
];

export const programs: Program[] = [
  { id: 'aastu-se', universityId: 'aastu', name: 'Software Engineering' },
  { id: 'aastu-ce', universityId: 'aastu', name: 'Civil Engineering' },
  { id: 'bdu-acc', universityId: 'bdu', name: 'Accounting' },
  { id: 'bdu-cs', universityId: 'bdu', name: 'Computer Science' },
  { id: 'ju-med', universityId: 'ju', name: 'Medicine' },
  { id: 'ju-eco', universityId: 'ju', name: 'Economics' },
  { id: 'mu-law', universityId: 'mu', name: 'Law' },
  { id: 'mu-bio', universityId: 'mu', name: 'Biology' },
];

/** Every program has two freshman semesters. */
export const semesters: Semester[] = programs.flatMap((program) => [
  { id: `${program.id}-s1`, programId: program.id, number: 1 as const },
  { id: `${program.id}-s2`, programId: program.id, number: 2 as const },
]);

type CourseTemplate = Pick<Course, 'code' | 'title' | 'stream'>;

const semesterOne: readonly CourseTemplate[] = [
  { code: 'ENG101', title: 'Communicative English', stream: 'COMMON' },
  { code: 'LOG101', title: 'Logic and Critical Thinking', stream: 'COMMON' },
  { code: 'CIV101', title: 'Civics and Ethical Education', stream: 'COMMON' },
  { code: 'MAT101', title: 'Calculus I', stream: 'NATURAL' },
  { code: 'PHY101', title: 'General Physics', stream: 'NATURAL' },
  { code: 'CHE101', title: 'General Chemistry', stream: 'NATURAL' },
  { code: 'GEO101', title: 'Geography of Ethiopia and the Horn', stream: 'SOCIAL' },
  { code: 'HIS101', title: 'History of Ethiopia and the Horn', stream: 'SOCIAL' },
  { code: 'ECO101', title: 'Introduction to Economics', stream: 'SOCIAL' },
];

const semesterTwo: readonly CourseTemplate[] = [
  { code: 'ENG102', title: 'Basic Writing Skills', stream: 'COMMON' },
  { code: 'ANT102', title: 'Social Anthropology', stream: 'COMMON' },
  { code: 'FIT102', title: 'Physical Fitness', stream: 'COMMON' },
  { code: 'MAT102', title: 'Calculus II', stream: 'NATURAL' },
  { code: 'BIO102', title: 'General Biology', stream: 'NATURAL' },
  { code: 'PHY102', title: 'Mechanics and Heat', stream: 'NATURAL' },
  { code: 'MAT112', title: 'Mathematics for Social Sciences', stream: 'SOCIAL' },
  { code: 'PSY102', title: 'Introduction to Psychology', stream: 'SOCIAL' },
  { code: 'GEO102', title: 'Introduction to Human Geography', stream: 'SOCIAL' },
];

export const courses: Course[] = semesters.flatMap((semester) =>
  (semester.number === 1 ? semesterOne : semesterTwo).map((template) => ({
    ...template,
    id: `${semester.id}-${template.code.toLowerCase()}`,
    semesterId: semester.id,
  })),
);

export const universityById = (id: string): University | undefined =>
  universities.find((university) => university.id === id);
export const programById = (id: string): Program | undefined =>
  programs.find((program) => program.id === id);
export const semesterById = (id: string): Semester | undefined =>
  semesters.find((semester) => semester.id === id);
export const courseById = (id: string): Course | undefined =>
  courses.find((course) => course.id === id);

/** Courses a student of `stream` can have in a semester: the common ones plus the stream's own. */
export function coursesForScope(semesterId: string, stream: 'NATURAL' | 'SOCIAL'): Course[] {
  return courses.filter(
    (course) =>
      course.semesterId === semesterId && (course.stream === 'COMMON' || course.stream === stream),
  );
}
