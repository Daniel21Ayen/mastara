// apps/admin-web/src/modules/content/state/contentManagementData.ts

export interface QuestionBankItem {
  id: string;
  questionId: string;
  question: string;
  questionType: string;
  quizNo: 1 | 2 | 3;
  chapterNumber: number;
  chapterTitle: string;
  chapterSubtitle: string;
  courseTitle: string;
  courseCode: string;
  semester: string;
  stream: string;
  program: string;
  status: 'Active' | 'Inactive';
  verified: boolean;
  timeAllowed?: string;
  access?: string;
  testSetId?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  questionCount?: number;
}

// Backwards compatibility alias
export type TestSetItem = QuestionBankItem;

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

export const INITIAL_TEST_SETS: QuestionBankItem[] = [
  {
    id: 'q-1',
    questionId: 'Q-101',
    question: 'What is the primary focus of human geography in analyzing spatial organization and regional development?',
    questionType: 'Multiple Choice',
    quizNo: 1,
    chapterNumber: 1,
    chapterTitle: 'Chapter 1',
    chapterSubtitle: 'Introduction',
    courseTitle: 'Introduction to Human Geography',
    courseCode: 'GEO102',
    semester: 'Sem 2',
    stream: 'Social',
    program: 'BSc Geography',
    testSetId: 'TS-GEO-QUIZ1-01',
    timeAllowed: '45 minutes',
    access: 'Enrolled Only',
    status: 'Inactive',
    verified: false,
    options: [
      'A. Physical erosion and geological plate tectonic shifts',
      'B. Human-environment interaction, spatial distribution, and cultural landscapes',
      'C. Chemical composition of upper atmospheric layers',
      'D. Purely quantitative oceanic depth surveying',
    ],
    correctAnswer: 'B. Human-environment interaction, spatial distribution, and cultural landscapes',
    explanation: 'Human geography focuses on the patterns and processes that shape human society, understanding how people interact with their physical environment and create cultural spaces.',
  },
  {
    id: 'q-2',
    questionId: 'Q-102',
    question: 'Calculate the net torque required to accelerate a uniform cylindrical rotor from rest to 120 rad/s in 4.0 seconds.',
    questionType: 'Multiple Choice',
    quizNo: 1,
    chapterNumber: 3,
    chapterTitle: 'Chapter 3',
    chapterSubtitle: 'Advanced Topics',
    courseTitle: 'General Physics',
    courseCode: 'PHY101',
    semester: 'Sem 1',
    stream: 'Natural',
    program: 'BSc Physics',
    testSetId: 'TS-PHY-QUIZ1-01',
    timeAllowed: '60 minutes',
    access: 'Public',
    status: 'Active',
    verified: true,
    options: [
      'A. τ = I · (30 rad/s²)',
      'B. τ = I · (120 rad/s²)',
      'C. τ = 0.5 · I · ω²',
      'D. τ = 2 · I / Δt',
    ],
    correctAnswer: 'A. τ = I · (30 rad/s²)',
    explanation: 'Angular acceleration α = Δω / Δt = (120 - 0) / 4 = 30 rad/s². Torque τ = I · α = 30 · I.',
  },
  {
    id: 'q-3',
    questionId: 'Q-103',
    question: 'Which sentence correctly demonstrates the subjunctive mood for hypothetical academic recommendations?',
    questionType: 'Multiple Choice',
    quizNo: 1,
    chapterNumber: 2,
    chapterTitle: 'Chapter 2',
    chapterSubtitle: 'Vocabulary and Syntax',
    courseTitle: 'Communicative English',
    courseCode: 'ENG101',
    semester: 'Sem 1',
    stream: 'Common',
    program: 'Software Engineering',
    testSetId: 'TS-ENG-QUIZ1-01',
    timeAllowed: '30 minutes',
    access: 'Public',
    status: 'Active',
    verified: true,
    options: [
      'A. It is recommended that each student submits their thesis today.',
      'B. It is recommended that each student submit their thesis today.',
      'C. It was recommended that each student has submitted on time.',
      'D. The recommendation is each student to submit immediately.',
    ],
    correctAnswer: 'B. It is recommended that each student submit their thesis today.',
    explanation: 'Subjunctive clauses following verbs of recommendation or urgency use the base form of the verb without third-person -s.',
  },
  {
    id: 'q-4',
    questionId: 'Q-201',
    question: 'Which projection technique preserves relative geometric area while causing significant high-latitude shape distortion?',
    questionType: 'Multiple Choice',
    quizNo: 2,
    chapterNumber: 2,
    chapterTitle: 'Chapter 2',
    chapterSubtitle: 'Spatial Analysis & Mapping',
    courseTitle: 'Introduction to Human Geography',
    courseCode: 'GEO102',
    semester: 'Sem 2',
    stream: 'Social',
    program: 'BSc Geography',
    testSetId: 'TS-GEO-QUIZ2-01',
    timeAllowed: '45 minutes',
    access: 'Enrolled Only',
    status: 'Active',
    verified: true,
    options: [
      'A. Mercator projection',
      'B. Gall-Peters equal-area projection',
      'C. Robinson compromise projection',
      'D. Azimuthal equidistant projection',
    ],
    correctAnswer: 'B. Gall-Peters equal-area projection',
    explanation: 'The Gall-Peters projection is an equal-area cylindrical projection that accurately represents relative surface areas across all latitudes.',
  },
  {
    id: 'q-5',
    questionId: 'Q-202',
    question: 'State how the Clausius statement of the Second Law of Thermodynamics governs spontaneous heat flow between thermal reservoirs.',
    questionType: 'Short Answer',
    quizNo: 2,
    chapterNumber: 4,
    chapterTitle: 'Chapter 4',
    chapterSubtitle: 'Mechanics & Heat Transfer',
    courseTitle: 'General Physics',
    courseCode: 'PHY101',
    semester: 'Sem 1',
    stream: 'Natural',
    program: 'BSc Physics',
    testSetId: 'TS-PHY-QUIZ2-01',
    timeAllowed: '60 minutes',
    access: 'Restricted',
    status: 'Inactive',
    verified: false,
    options: [
      'A. Heat cannot spontaneously pass from a cooler to a hotter body without external work.',
      'B. Entropy of an isolated system always remains perfectly constant.',
      'C. Total internal energy of any closed thermodynamic cycle equals zero.',
      'D. Work is completely convertible to thermal energy with 100% Carnot efficiency.',
    ],
    correctAnswer: 'A. Heat cannot spontaneously pass from a cooler to a hotter body without external work.',
    explanation: 'Clausius stated that it is impossible to construct a device operating on a cycle that produces no effect other than the transfer of heat from a cooler body to a hotter body.',
  },
  {
    id: 'q-6',
    questionId: 'Q-301',
    question: 'How does Burgess concentric zone model characterize urban residential segregation outward from the central business district?',
    questionType: 'Multiple Choice',
    quizNo: 3,
    chapterNumber: 4,
    chapterTitle: 'Chapter 4',
    chapterSubtitle: 'Urbanization & Demographics',
    courseTitle: 'Introduction to Human Geography',
    courseCode: 'GEO102',
    semester: 'Sem 2',
    stream: 'Social',
    program: 'BSc Geography',
    testSetId: 'TS-GEO-QUIZ3-01',
    timeAllowed: '50 minutes',
    access: 'Enrolled Only',
    status: 'Active',
    verified: true,
    options: [
      'A. Random clustering determined entirely by topography and water bodies',
      'B. Concentric rings expanding outward from transition zones to commuter zones',
      'C. Linear corridors strictly following major railway lines and highways',
      'D. Multiple polynucleated industrial nodes with no central core',
    ],
    correctAnswer: 'B. Concentric rings expanding outward from transition zones to commuter zones',
    explanation: 'The concentric zone model describes urban spatial organization as concentric rings: CBD, Zone of Transition, Working Class Homes, Better Residences, and Commuter Zone.',
  },
  {
    id: 'q-7',
    questionId: 'Q-302',
    question: 'What is the de Broglie wavelength of an electron accelerated through a potential difference of 100 Volts?',
    questionType: 'Multiple Choice',
    quizNo: 3,
    chapterNumber: 5,
    chapterTitle: 'Chapter 5',
    chapterSubtitle: 'Modern Physics & Quantum',
    courseTitle: 'General Physics',
    courseCode: 'PHY101',
    semester: 'Sem 1',
    stream: 'Natural',
    program: 'BSc Physics',
    testSetId: 'TS-PHY-QUIZ3-01',
    timeAllowed: '60 minutes',
    access: 'Public',
    status: 'Active',
    verified: true,
    options: [
      'A. λ ≈ 0.123 nm (1.23 Å)',
      'B. λ ≈ 1.23 nm (12.3 Å)',
      'C. λ ≈ 12.3 nm (123 Å)',
      'D. λ ≈ 0.012 nm (0.12 Å)',
    ],
    correctAnswer: 'A. λ ≈ 0.123 nm (1.23 Å)',
    explanation: 'Using λ = h / p = 1.226 / √V nm, for V = 100 V, λ = 1.226 / 10 ≈ 0.123 nm.',
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
