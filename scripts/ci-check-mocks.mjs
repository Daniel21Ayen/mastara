import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PRODUCTION_DIRS = [
  path.join(rootDir, 'apps/mobile/src'),
  path.join(rootDir, 'apps/admin-web/src'),
];

// Folders or files dedicated to dev/test mocks outside of app production runtime
const EXCLUDED_FOLDERS = [
  '__tests__',
  'test',
  'tests',
  'node_modules',
];

const EXCLUDED_EXTENSIONS = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];

const violations = [];

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Fail if production source tree contains any mocks/ or mock/ path
    if (entry.name === 'mock' || entry.name === 'mocks') {
      violations.push({
        file: path.relative(rootDir, fullPath),
        line: 1,
        content: entry.name,
        reason: 'Production source tree contains a mock/ or mocks/ directory',
      });
      continue;
    }

    if (EXCLUDED_FOLDERS.some((ex) => entry.name === ex)) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      if (EXCLUDED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
        continue;
      }
      if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        checkFile(fullPath);
      } else if (entry.name.endsWith('.css')) {
        checkCssFile(fullPath);
      }
    }
  }
}

function checkCssFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    const matches = line.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (matches && matches.length > 0) {
      violations.push({
        file: path.relative(rootDir, filePath),
        line: index + 1,
        content: line.trim(),
        reason: `Raw hex color ${matches.join(', ')} detected outside packages/ui-tokens; use var(--color-*)`,
      });
    }
  });
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check for mock imports in production files
    const isImportOrRequire = /^\s*(import\s|const\s+.*=\s+require\(|export\s+.*from)/.test(line);
    if (isImportOrRequire && (line.includes('/mock') || line.includes('/mocks') || line.includes('core/mock'))) {
      violations.push({
        file: path.relative(rootDir, filePath),
        line: index + 1,
        content: line.trim(),
        reason: 'Production mock import detected',
      });
    }

    // Check for useMocks branch usage (except in env declaration itself)
    if (!filePath.endsWith('env.ts')) {
      if (line.includes('useMocks') && !line.trim().startsWith('//')) {
        violations.push({
          file: path.relative(rootDir, filePath),
          line: index + 1,
          content: line.trim(),
          reason: 'Production useMocks branch detected',
        });
      }
    }

    // Check for raw hex colors in mobile app files (enforcing the 4-color design tokens)
    if (filePath.includes('apps/mobile') && !filePath.endsWith('pushNotifications.ts')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
        const matches = line.match(/#[0-9a-fA-F]{3,8}\b/g);
        if (matches && matches.length > 0) {
          violations.push({
            file: path.relative(rootDir, filePath),
            line: index + 1,
            content: line.trim(),
            reason: `Raw hex color ${matches.join(', ')} detected in mobile app; use theme.colors.*`,
          });
        }
      }
    }
  });
}

console.log('🔍 CI Gate: Scanning production code for mock imports and enforcing color token consistency...');
for (const dir of PRODUCTION_DIRS) {
  scanDirectory(dir);
}

if (violations.length > 0) {
  console.error(`\n❌ CI Mock Gate FAILED: Found ${violations.length} mock violations in production code:\n`);
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line} (${v.reason})`);
    console.error(`    ${v.content}\n`);
  }
  process.exit(1);
} else {
  console.log('✅ CI Mock Gate PASSED: Zero mock imports or useMocks branches in production code!\n');
  process.exit(0);
}
