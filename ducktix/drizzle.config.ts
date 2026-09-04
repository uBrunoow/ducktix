import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env.local' });

/**
 * `schema.ts` é a fonte da verdade. `db/schema.sql` e `db/seed.sql` continuam
 * documentando o esquema para o documento de entrega, mas quem cria e
 * atualiza as tabelas de verdade agora são as migrations em `./drizzle`
 * (`pnpm db:generate` para gerar, `pnpm db:migrate` para aplicar — este
 * segundo comando roda automaticamente no build da Vercel via `vercel-build`
 * no package.json).
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
