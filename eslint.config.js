import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

/**
 * Layer boundaries (see plan §Architecture):
 *   domain   -> may not import react / zustand / firebase / services / store / features
 *   services -> may not import react / store / features
 *   store    -> may not import features
 */
const boundary = (patterns) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: patterns.map((p) => ({
        group: p.group,
        message: p.message,
      })),
    },
  ],
})

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Context providers deliberately co-export their hooks (useToast, useConfirm,
    // useSession, ...) — a full-module HMR reload there is fine.
    files: [
      'src/hooks/**/*.tsx',
      'src/components/ui/Toast.tsx',
      'src/components/ui/ConfirmProvider.tsx',
      'src/features/app/Providers.tsx',
      'src/features/courses/CourseDialogProvider.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: boundary([
      { group: ['react', 'react-dom', 'react/*'], message: 'domain must stay React-free' },
      { group: ['zustand', 'zustand/*'], message: 'domain must not depend on the store library' },
      { group: ['firebase', 'firebase/*'], message: 'domain must not depend on firebase' },
      { group: ['@/services/*', '**/services/*'], message: 'domain must not import services' },
      { group: ['@/store/*', '**/store/*'], message: 'domain must not import the store' },
      { group: ['@/features/*', '**/features/*'], message: 'domain must not import features' },
    ]),
  },
  {
    files: ['src/services/**/*.ts'],
    rules: boundary([
      { group: ['react', 'react-dom', 'react/*'], message: 'services must stay React-free' },
      { group: ['@/store/*', '**/store/*'], message: 'services must not import the store' },
      { group: ['@/features/*', '**/features/*'], message: 'services must not import features' },
    ]),
  },
  {
    files: ['src/store/**/*.ts'],
    rules: boundary([
      { group: ['@/features/*', '**/features/*'], message: 'store must not import features' },
    ]),
  },
  prettier,
)
