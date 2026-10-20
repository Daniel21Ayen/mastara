// apps/admin-web/src/modules/content/state/contentManagementData.ts

export interface TestSetItem {
  id: string;
  testSetId: string;
  quizNo: 1 | 2 | 3;
  chapterNumber: number;
  chapterTitle: string;
  chapterSubtitle: string;
  courseTitle: string;
  courseCode: string;
  semester: string;
  stream: string;
  program: string;
  timeAllowed: string;
  access: string;
  status: 'Active' | 'Inactive';
  verified: boolean;
  questionCount?: number;
}

export type MaterialSubTab = 'modules' | 'notes' | 'amharic-notes';

export interface MaterialItem {
  id: string;
  type: MaterialSubTab;
  chapterNumber: number;
  chapterTitle: string;
  chapterSubtitle: string;
  title: string;
  subtitle: string;
  courseTitle: string;
  courseCode: string;
  semester: string;
  program: string;
  status: 'Active' | 'Inactive';
  content?: string;
}

export const INITIAL_TEST_SETS: TestSetItem[] = [
  {
    id: 'ts-1',
    testSetId: 'TS-GEO-QUIZ1-01',
    quizNo: 1,
    chapterNumber: 1,
    chapterTitle: 'Chapter 1',
    chapterSubtitle: 'Introduction',
    courseTitle: 'Introduction to Human Geography',
    courseCode: 'GEO102',
    semester: 'Sem 2',
    stream: 'Social',
    program: 'BSc Geography',
    timeAllowed: '45 minutes',
    access: 'Enrolled Only',
    status: 'Inactive',
    verified: false,
    questionCount: 15,
  },
  {
    id: 'ts-2',
    testSetId: 'TS-PHY-QUIZ1-01',
    quizNo: 1,
    chapterNumber: 3,
    chapterTitle: 'Chapter 3',
    chapterSubtitle: 'Advanced Topics',
    courseTitle: 'General Physics',
    courseCode: 'PHY101',
    semester: 'Sem 1',
    stream: 'Natural',
    program: 'BSc Physics',
    timeAllowed: '60 minutes',
    access: 'Public',
    status: 'Active',
    verified: true,
    questionCount: 20,
  },
  {
    id: 'ts-3',
    testSetId: 'TS-ENG-QUIZ1-01',
    quizNo: 1,
    chapterNumber: 2,
    chapterTitle: 'Chapter 2',
    chapterSubtitle: 'Vocabulary and Syntax',
    courseTitle: 'Communicative English',
    courseCode: 'ENG101',
    semester: 'Sem 1',
    stream: 'Common',
    program: 'Software Engineering',
    timeAllowed: '30 minutes',
    access: 'Public',
    status: 'Active',
    verified: true,
    questionCount: 12,
  },
  {
    id: 'ts-4',
    testSetId: 'TS-GEO-QUIZ2-01',
    quizNo: 2,
    chapterNumber: 2,
    chapterTitle: 'Chapter 2',
    chapterSubtitle: 'Spatial Analysis & Mapping',
    courseTitle: 'Introduction to Human Geography',
    courseCode: 'GEO102',
    semester: 'Sem 2',
    stream: 'Social',
    program: 'BSc Geography',
    timeAllowed: '45 minutes',
    access: 'Enrolled Only',
    status: 'Active',
    verified: true,
    questionCount: 18,
  },
  {
    id: 'ts-5',
    testSetId: 'TS-PHY-QUIZ2-01',
    quizNo: 2,
    chapterNumber: 4,
    chapterTitle: 'Chapter 4',
    chapterSubtitle: 'Mechanics & Heat Transfer',
    courseTitle: 'General Physics',
    courseCode: 'PHY101',
    semester: 'Sem 1',
    stream: 'Natural',
    program: 'BSc Physics',
    timeAllowed: '60 minutes',
    access: 'Restricted',
    status: 'Inactive',
    verified: false,
    questionCount: 16,
  },
  {
    id: 'ts-6',
    testSetId: 'TS-GEO-QUIZ3-01',
    quizNo: 3,
    chapterNumber: 4,
    chapterTitle: 'Chapter 4',
    chapterSubtitle: 'Urbanization & Demographics',
    courseTitle: 'Introduction to Human Geography',
    courseCode: 'GEO102',
    semester: 'Sem 2',
    stream: 'Social',
    program: 'BSc Geography',
    timeAllowed: '50 minutes',
    access: 'Enrolled Only',
    status: 'Active',
    verified: true,
    questionCount: 25,
  },
  {
    id: 'ts-7',
    testSetId: 'TS-PHY-QUIZ3-01',
    quizNo: 3,
    chapterNumber: 5,
    chapterTitle: 'Chapter 5',
    chapterSubtitle: 'Modern Physics & Quantum',
    courseTitle: 'General Physics',
    courseCode: 'PHY101',
    semester: 'Sem 1',
    stream: 'Natural',
    program: 'BSc Physics',
    timeAllowed: '60 minutes',
    access: 'Public',
    status: 'Active',
    verified: true,
    questionCount: 22,
  },
];

export const INITIAL_MATERIALS: MaterialItem[] = [
  // Modules
  {
    id: 'mod-1',
    type: 'modules',
    chapterNumber: 1,
    chapterTitle: 'Chapter 1',
    chapterSubtitle: 'Introduction',
    title: 'Module 1',
    subtitle: 'Basics of Geography',
    courseTitle: 'Introduction to Human Geography',
    courseCode: 'GEO102',
    semester: 'Sem 2',
    program: 'Social',
    status: 'Active',
    content: 'Introduction to spatial distribution, human interaction with environment, and foundational cultural geography principles.',
  },
  {
    id: 'mod-2',
    type: 'modules',
    chapterNumber: 3,
    chapterTitle: 'Chapter 3',
    chapterSubtitle: 'Advanced Topics',
    title: 'Module 3',
    subtitle: 'Climate and Environment',
    courseTitle: 'General Physics',
    courseCode: 'PHY101',
    semester: 'Sem 1',
    program: 'Natural',
    status: 'Inactive',
    content: 'Thermodynamics of atmospheric circulation, solar radiation balance, and mathematical modeling of energy transfer.',
  },
  {
    id: 'mod-3',
    type: 'modules',
    chapterNumber: 2,
    chapterTitle: 'Chapter 2',
    chapterSubtitle: 'Core Foundations',
    title: 'Module 2',
    subtitle: 'Newtonian Mechanics',
    courseTitle: 'General Physics',
    courseCode: 'PHY101',
    semester: 'Sem 1',
    program: 'Natural',
    status: 'Active',
    content: 'Laws of motion, friction, circular dynamics, and work-energy theorem with calculus-based derivations.',
  },
  {
    id: 'mod-4',
    type: 'modules',
    chapterNumber: 1,
    chapterTitle: 'Chapter 1',
    chapterSubtitle: 'Foundations',
    title: 'Module 1',
    subtitle: 'Communicative Grammar',
    courseTitle: 'Communicative English',
    courseCode: 'ENG101',
    semester: 'Sem 1',
    program: 'Common',
    status: 'Active',
    content: 'Comprehensive review of verb tenses, conditional structures, and academic discourse markers.',
  },

  // Notes
  {
    id: 'note-1',
    type: 'notes',
    chapterNumber: 1,
    chapterTitle: 'Chapter 1',
    chapterSubtitle: 'Introduction',
    title: 'Note 1',
    subtitle: 'Basics of Geography Summary',
    courseTitle: 'Introduction to Human Geography',
    courseCode: 'GEO102',
    semester: 'Sem 2',
    program: 'Social',
    status: 'Active',
    content: 'Key terms: Toponym, Site, Situation, Meridian, Parallel. Summary of regional analysis frameworks and human geography paradigms.',
  },
  {
    id: 'note-2',
    type: 'notes',
    chapterNumber: 3,
    chapterTitle: 'Chapter 3',
    chapterSubtitle: 'Advanced Topics',
    title: 'Note 3',
    subtitle: 'Climate and Environment Formula Sheet',
    courseTitle: 'General Physics',
    courseCode: 'PHY101',
    semester: 'Sem 1',
    program: 'Natural',
    status: 'Inactive',
    content: 'Equations of state, Stefan-Boltzmann constant, radiation heat flux derivations, and adiabatic lapse rate calculations.',
  },
  {
    id: 'note-3',
    type: 'notes',
    chapterNumber: 2,
    chapterTitle: 'Chapter 2',
    chapterSubtitle: 'Core Foundations',
    title: 'Note 2',
    subtitle: 'Kinematics & Dynamics Problem Sets',
    courseTitle: 'General Physics',
    courseCode: 'PHY101',
    semester: 'Sem 1',
    program: 'Natural',
    status: 'Active',
    content: 'Step-by-step solutions to multi-body equilibrium problems, inclined planes, and momentum conservation.',
  },

  // Amharic Notes
  {
    id: 'amh-1',
    type: 'amharic-notes',
    chapterNumber: 1,
    chapterTitle: 'Chapter 1',
    chapterSubtitle: 'መግቢያ',
    title: 'አማርኛ ማስታወሻ 1',
    subtitle: 'የስነ-ምድር መሰረታዊ ፅንሰ ሀሳቦች',
    courseTitle: 'Introduction to Human Geography',
    courseCode: 'GEO102',
    semester: 'Sem 2',
    program: 'Social',
    status: 'Active',
    content: 'የሰው ልጅ ከሚኖርበት የተፈጥሮ አካባቢ ጋር ያለው መስተጋብር እና የጂኦግራፊ መሰረታዊ መርሆዎች አጠቃላይ ማብራሪያ።',
  },
  {
    id: 'amh-2',
    type: 'amharic-notes',
    chapterNumber: 3,
    chapterTitle: 'Chapter 3',
    chapterSubtitle: 'የላቁ ርዕሶች',
    title: 'አማርኛ ማስታወሻ 3',
    subtitle: 'የአየር ንብረት እና አካባቢ ፊዚክስ',
    courseTitle: 'General Physics',
    courseCode: 'PHY101',
    semester: 'Sem 1',
    program: 'Natural',
    status: 'Inactive',
    content: 'የከባቢ አየር ሙቀት ልውውጥ፣ የስበት ኃይል ተፅዕኖ እና የኢነርጂ ፍሰት ህጎች በአማርኛ የተብራሩበት ሰነድ።',
  },
];
