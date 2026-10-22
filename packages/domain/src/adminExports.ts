// packages/domain/src/adminExports.ts
// Everything the admin portal adds to @mastara/domain. `src/index.ts` needs ONE line: export * from './adminExports';
export * from './access/grantAccess';
export * from './access/studentAccess';
export * from './assessment/questionRules';
export * from './assessment/scanRules';
export * from './catalog/courseCode';
export * from './catalog/status';
export * from './constants/admin';
export * from './constants/adminErrors';
export * from './content/publish';
export * from './identity/identifier';
export * from './assessment/setRules';
export * from './payments/decision';
export * from './assessment/csvParser';
export * from './assessment/bulkQuestionParser';
export * from './assessment/examSetExport';

