// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/.expo/**', '**/dist/**', '**/.turbo/**', '**/*.generated.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Colours change with the light/dark theme, so styles must be built from the active theme (createStyles + useStyles).
    // A module-level StyleSheet.create would freeze the colours of whichever theme was active at start.
    files: ['apps/mobile/src/**/*.{ts,tsx}', 'apps/mobile/app/**/*.{ts,tsx}'],
    ignores: ['apps/mobile/src/core/theme/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='StyleSheet'][callee.property.name='create']",
          message: 'Use createStyles((theme) => ({ ... })) from @/core/theme so styles follow the light/dark theme.',
        },
      ],
    },
  },
);
