import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations aplicadas com sucesso.');
} catch (err) {
  console.error('Falha ao aplicar migrations:');
  console.error(err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
