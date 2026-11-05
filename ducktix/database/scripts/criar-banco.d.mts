import type { Db } from 'mongodb';

export function criarBanco(db: Db, print?: (mensagem: string) => void): Promise<void>;
