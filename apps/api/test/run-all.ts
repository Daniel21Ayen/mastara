import { spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const testDir = __dirname;
const tsconfigPath = path.join(testDir, '..', 'tsconfig.test.json');

const files = fs
  .readdirSync(testDir)
  .filter((f) => f.endsWith('.spec.ts') && !f.startsWith('.'))
  .sort();

console.log(`\n🚀 Found ${files.length} test suites in apps/api/test/\n`);

let passedCount = 0;
let failedCount = 0;
const failedFiles: string[] = [];

for (const file of files) {
  const filePath = path.join(testDir, file);
  console.log(`\n▶ Running ${file}...`);

  const result = spawnSync(
    'npx',
    ['ts-node', '-r', 'tsconfig-paths/register', '-P', tsconfigPath, filePath],
    {
      stdio: 'inherit',
      env: process.env,
    },
  );

  if (result.status === 0) {
    passedCount++;
  } else {
    failedCount++;
    failedFiles.push(file);
  }
}

console.log('\n========================================');
console.log(`Test Execution Summary:`);
console.log(`Total Suites:  ${files.length}`);
console.log(`Passed Suites: ${passedCount}`);
console.log(`Failed Suites: ${failedCount}`);
console.log('========================================\n');

if (failedCount > 0) {
  console.error(`❌ Failed suites:\n${failedFiles.map((f) => `  - ${f}`).join('\n')}\n`);
  process.exit(1);
} else {
  console.log('✅ All test suites passed successfully!\n');
}
