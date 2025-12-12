import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Possible errors
      'no-console': 'off', // CLI tool needs console
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Best practices
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-throw-literal': 'error',

      // Style (minimal, let Prettier handle most)
      'no-trailing-spaces': 'error',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
    },
  },
  {
    // Test files can use more relaxed rules
    files: ['**/*.test.js', 'tests/**/*.js'],
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_|^assert$',
        },
      ],
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
  },
];
