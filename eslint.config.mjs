// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/.next/**',
      '**/next-env.d.ts',
      '**/node_modules/**',
      '**/.expo/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/*.generated.ts',
      'infra/**',
      'integration/**',
      'scripts/**',
      'tests/load/**',
      'packages/database/src/seed.ts',
      'apps/admin-web/dev-mocks/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': {
        rules: {
          'exhaustive-deps': { create() { return {}; } },
        },
      },
      '@next/next': {
        rules: {
          'no-img-element': { create() { return {}; } },
        },
      },
    },
    rules: {
      'no-undef': 'off',
      'no-useless-escape': 'warn',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'prefer-const': 'warn',
      'no-empty': 'warn',
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
