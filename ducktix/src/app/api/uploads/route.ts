import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';

export async function POST(request: Request) {
  const sessao = await sessaoAtual();
  if (!sessao || sessao.papel !== 'organizador') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('event-covers/') && !pathname.startsWith('profile-photos/')) {
          throw new Error('Caminho de upload inválido.');
        }

        return {
          allowedContentTypes: ['image/*'],
          maximumSizeInBytes: 5 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: sessao.usuarioId,
        };
      },
    });

    return NextResponse.json(response);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Falha ao preparar o upload.';
    return NextResponse.json({ error: mensagem }, { status: 400 });
  }
}
