/** @type {import('@typescript-eslint/eslint-plugin').RuleEntry} */
export const namingConventionRule = [
  'error',
  // Variables with double leading underscores (e.g., __internalCache): allow any format
  {
    selector: 'variable',
    format: null,
    filter: {
      regex: '^__',
      match: true,
    },
  },
  // Variables: camelCase or PascalCase (allows const objects like PageActions)
  {
    selector: 'variable',
    format: ['camelCase', 'PascalCase'],
    leadingUnderscore: 'allow',
  },
  // Constants (global or local): UPPER_CASE (includes UPPER_SNAKE_CASE like API_BASE_URL
  // or MAX_RETRIES), PascalCase (for const objects), or camelCase (for flexibility)
  {
    selector: 'variable',
    modifiers: ['const'],
    format: ['UPPER_CASE', 'PascalCase', 'camelCase'],
  },
  // Local constants: also allow UPPER_CASE for module-style const declarations
  {
    selector: 'variable',
    modifiers: ['const'],
    format: ['UPPER_CASE', 'PascalCase', 'camelCase'],
  },
  // Classes, Interfaces, Types, Enums: PascalCase or camelCase
  {
    selector: ['class', 'interface', 'typeAlias', 'enum'],
    format: ['PascalCase', 'camelCase'],
  },
  // Enum members: UPPER_CASE or camelCase
  {
    selector: 'enumMember',
    format: ['UPPER_CASE', 'camelCase'],
  },
  // Prohibit "I" prefix for interfaces
  {
    selector: 'interface',
    format: ['PascalCase'],
    custom: { regex: '^I[A-Z]', match: false },
  },
];
