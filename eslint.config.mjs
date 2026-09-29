import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import { namingConventionRule } from './eslint-rules/name-convention.js';

export default tseslint.config(
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
    },
  },
  { ...playwright.configs['flat/recommended'], files: ['src/tests/**/*.ts'] }
);
