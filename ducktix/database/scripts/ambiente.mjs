import { config } from 'dotenv';

/** Lê `.env.local` (mesmo arquivo do Next) e devolve a conexão do MongoDB. */
export function carregarAmbiente() {
  config({ path: '.env.local', quiet: true });
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI não definida — copie .env.example para .env.local.');
  }
  return { uri, nomeDoBanco: process.env.MONGODB_DB || 'ducktix' };
}
