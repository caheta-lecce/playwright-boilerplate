import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import checkFile from 'eslint-plugin-check-file';
import { namingConventionRule } from './eslint-rules/name-convention.js';

export default defineConfig(
  {
    ignores: [
      'node_modules/**',
      '.auth/**',
      'test-results/**',
      'playwright-report/**',
      'coverage/**',
      'reports/**',
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
  {
    // File and folder names: identifier naming lives in eslint-rules/name-convention.js.
    files: ['src/**/*.ts', 'lib/**/*.ts'],
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          // Page objects: <Name>Locators | <Name>Actions | <Name>Page, PascalCase.
          'src/pages/**/*.ts': '[A-Z]*([a-zA-Z0-9])@(Locators|Actions|Page)',
          // Test data: kebab-case <domain>.data.ts.
          'src/data/**/*.ts': '+([a-z0-9])*(-+([a-z0-9])).data',
          // Specs and setup files: kebab-case with a .spec / .ui.setup suffix.
          'src/tests/**/*.ts': '+([a-z0-9])*(-+([a-z0-9]))@(.spec|.ui.setup)',
          // Fixtures: kebab-case.
          'lib/fixtures/*.ts': 'KEBAB_CASE',
        },
        { ignoreMiddleExtensions: false },
      ],
      'check-file/folder-naming-convention': [
        'error',
        { 'src/**/': 'KEBAB_CASE', 'lib/**/': 'KEBAB_CASE' },
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
