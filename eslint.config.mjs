import tseslint from 'typescript-eslint'
export default tseslint.config(
  { ignores: ['**/node_modules/**', '.next/**', 'backend/dist/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'backend/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './backend/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
)
