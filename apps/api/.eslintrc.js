module.exports = {
  root: true,
  extends: ['../../packages/config/eslint-config/base.js', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2021, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'off',
  },
};
