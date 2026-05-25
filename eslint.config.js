import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        console: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
];