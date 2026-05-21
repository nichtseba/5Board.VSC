import parent from '../eslint.config.mjs';
import { defineConfig } from 'eslint/config';
import react from 'eslint-plugin-react';

export default defineConfig(
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  parent,
);
