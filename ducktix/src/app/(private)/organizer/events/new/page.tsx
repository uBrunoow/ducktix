import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { drizzleUsuariosRepository as usuariosRepository } from '@/server/identity/infrastructure/drizzle-usuarios';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { FormularioCriarEvento } from './formulario-criar-evento';

export const dynamic = 'force-dynamic';

export default async function PaginaDeCriarEvento() {
  const sessao = await sessaoAtual();
  const usuario = sessao ? await usuariosRepository.buscarPorId(sessao.usuarioId) : null;

  const categorias = await catalogoPublicoRepository.listarCategorias();

  return (
    <div>
      <Link
        href="/organizer/events"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden="true" />
        Eventos
      </Link>

      <div className="mt-4">
        <h1 className="display m-0 text-2xl">Criar evento</h1>
        <p className="mt-1 max-w-[60ch] text-[15px] text-fg-muted">
          Você escolhe no final se o evento entra como rascunho ou vai direto ao ar.
        </p>
      </div>

      <div className="mt-8">
        <FormularioCriarEvento organizadorPadrao={usuario?.nome ?? ''} categorias={categorias} />
      </div>
    </div>
  );
}
