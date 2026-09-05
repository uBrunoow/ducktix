'use client';

import { upload } from '@vercel/blob/client';

export async function enviarImagemParaBlob(
  arquivo: File,
  pasta: 'event-covers' | 'profile-photos' = 'event-covers',
): Promise<string> {
  const extensao = arquivo.name.includes('.') ? arquivo.name.slice(arquivo.name.lastIndexOf('.')) : '';
  const blob = await upload(
    `${pasta}/${crypto.randomUUID()}${extensao}`,
    arquivo,
    {
      access: 'public',
      contentType: arquivo.type,
      handleUploadUrl: '/api/uploads',
    },
  );
  return blob.url;
}
