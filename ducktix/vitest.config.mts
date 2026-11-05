import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Testes de integração contra um MongoDB real (o do docker-compose). Rodam
 * no database `ducktix_test`, nunca no `ducktix` de desenvolvimento, e em
 * série: todos os arquivos compartilham o mesmo banco.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/preparar-banco.ts'],
    fileParallelism: false,
    env: {
      MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://localhost:27017',
      MONGODB_DB: 'ducktix_test',
    },
  },
});
