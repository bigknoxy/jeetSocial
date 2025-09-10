const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['eslint.config.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
      },
      sourceType: 'module',
      ecmaVersion: 2021,
    },
  },
  {
    files: ['app/static/**/*.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
        clearInterval: 'readonly',
        setInterval: 'readonly',
        console: 'readonly',
      },
      sourceType: 'script',
      ecmaVersion: 2021,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-undef': 'off',
    },
  },
  {
    files: ['e2e/**/*.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
      sourceType: 'module',
      ecmaVersion: 2021,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-undef': 'off',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
      },
      sourceType: 'module',
      ecmaVersion: 2021,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-undef': 'off',
    },
  },
  {
    ignores: ['venv/**', 'coverage/**', 'node_modules/**'],
  },
];
