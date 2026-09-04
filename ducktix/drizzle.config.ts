import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env.local' });

/**
 * Usado apenas por `drizzle-kit studio` (inspecionar o banco de dev pelo
 * navegador). Este projeto não usa `drizzle-kit generate`/`migrate`:
 * `db/schema.sql` é a fonte da verdade e é aplicado diretamente
 * (ver README) — gerar migrations do schema.ts arriscaria divergir do SQL
 * que o documento de entrega descreve.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
