import { CalendarPlusIcon } from 'lucide-react';
import Link from 'next/link';
import type { EventoNoSeletor } from '@/components/organizer/cabecalho-organizador';
import { SeletorDeEventoPainel } from '@/components/organizer/seletor-de-evento-painel';
import { Rotulo } from '@/components/moldura';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';

export const dynamic = 'force-dynamic';

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

/**
 * Porta de entrada do back-office. Cada tela daqui pra frente é escopada
 * por evento — pedidos, participantes, lotes e cupons não fazem sentido
 * sem saber de qual evento — então o primeiro passo é escolher um. Só os
 * eventos do organizador logado, nunca o catálogo inteiro.
 */
export default async function VisaoGeral() {
  const sessao = await sessaoAtual();
  const agora = new Date();
  const eventos: readonly EventoNoSeletor[] = (
    sessao ? await catalogoPublicoRepository.listarDoOrganizador(sessao.usuarioId) : []
  ).map((evento) => ({
    id: evento.id,
    nome: evento.nome,
    quando: dataCurta.format(evento.comecaEm),
    jaAconteceu: agora >= evento.comecaEm,
    rascunho: evento.status === 'rascunho',
  }));

  return (
    <div className="grid min-h-[60vh] min-w-0 place-items-center py-8">
      <div className="w-full max-w-[27rem]">
        <div className="rounded-card border border-line bg-surface p-7 shadow-card md:p-9">
          <Rotulo>Organizador</Rotulo>
          <h1 className="display mt-4 text-[clamp(1.5rem,3vw,2.05rem)] leading-[1.2] text-balance">
            Selecione um evento
          </h1>
          <p className="mt-3 text-[15px] leading-[1.6] text-fg-muted">
            Pedidos, participantes, lotes e cupons são vistos por evento.
          </p>

          <div className="mt-7">
            {eventos.length === 0 ? (
              <p className="text-[13px] text-fg-muted">
                Você ainda não tem nenhum evento no catálogo.
              </p>
            ) : (
              <SeletorDeEventoPainel eventos={eventos} />
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-fg-muted">
          {eventos.length === 0 ? 'Comece criando seu primeiro evento.' : 'Ou'}{' '}
          <Link
            href="/organizer/events/new"
            className="inline-flex items-center gap-1 font-semibold text-brand-ink underline-offset-4 hover:underline"
          >
            <CalendarPlusIcon className="size-3.5" aria-hidden="true" />
            Criar evento
          </Link>
        </p>
      </div>
    </div>
  );
}
