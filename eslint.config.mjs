import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import { namingConventionRule } from './eslint-rules/name-convention.js';

export default defineConfig(
  {
    ignores: [
      'node_modules/**',
      '.auth/**',
      'test-results/**',
      'playwright-report/**',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  { languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommended,
  // Typed linting for TypeScript only: the type-checked preset needs the TS project service.
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({ ...config, files: ['**/*.ts'] })),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/naming-convention': namingConventionRule,
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: String.raw`^\.\./|^\./(src|lib)/`,
              message:
                'Use a tsconfig path alias (@lib, @fixtures, @pages, @config, @shared, @data).',
            },
          ],
        },
      ],
    },
  },
  {
    // Expressions and typed function expressions (fixtures, test callbacks) stay un-annotated.
    files: ['src/**/*.ts', 'lib/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
    },
  },
  { ...playwright.configs['flat/recommended'], files: ['src/tests/**/*.ts'] },
  {
    files: ['src/tests/**/*.ts'],
    rules: {
      'playwright/missing-playwright-await': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/no-force-option': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/valid-expect': 'error',
      'playwright/no-skipped-test': 'error',
      'playwright/no-useless-await': 'error',
      'playwright/prefer-to-have-length': 'error',
    },
  }
);
