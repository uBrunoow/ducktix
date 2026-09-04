import { NextResponse, type NextRequest } from 'next/server';
import { NOME_DO_COOKIE, decodificarSessao } from '@/server/identity/infrastructure/sessao-codec';

/**
 * Gate de autenticação das rotas privadas. Roda em Edge, antes de qualquer
 * Server Component ou Server Action da rota — é a defesa de primeira linha;
 * as páginas e ações continuam checando a sessão de novo (`sessaoAtual()`),
 * porque middleware é só o portão da frente, não a única fechadura.
 *
 * `/organizer/**` exige `papel === 'organizador'`; as demais rotas privadas
 * exigem só sessão válida, qualquer papel.
 */
export function middleware(request: NextRequest) {
  const sessao = decodificarSessao(request.cookies.get(NOME_DO_COOKIE)?.value);
  const { pathname, search } = request.nextUrl;

  if (!sessao) {
    const destinoLogin = new URL('/login', request.url);
    destinoLogin.searchParams.set('next', pathname + search);
    return NextResponse.redirect(destinoLogin);
  }

  if (pathname.startsWith('/organizer') && sessao.papel !== 'organizador') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/checkout/:path*', '/my-tickets/:path*', '/organizer/:path*'],
};
