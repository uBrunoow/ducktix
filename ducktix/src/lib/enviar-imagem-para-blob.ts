'use client';

import { upload } from '@vercel/blob/client';

export async function enviarImagemParaBlob(arquivo: File): Promise<string> {
  const extensao = arquivo.name.includes('.') ? arquivo.name.slice(arquivo.name.lastIndexOf('.')) : '';
  const blob = await upload(
    `event-covers/${crypto.randomUUID()}${extensao}`,
    arquivo,
    {
      access: 'public',
      contentType: arquivo.type,
      handleUploadUrl: '/api/uploads',
    },
  );
  return blob.url;
}
