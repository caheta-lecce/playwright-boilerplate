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
              message: 'Use a tsconfig path alias (@lib, @fixtures, @pages, @config, @shared).',
            },
          ],
        },
      ],
    },
  },
  { ...playwright.configs['flat/recommended'], files: ['src/tests/**/*.ts'] }
);
