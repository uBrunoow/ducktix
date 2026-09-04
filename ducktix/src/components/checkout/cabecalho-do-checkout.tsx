import { CapaEvento } from '@/components/capa-evento';
import { PassosDoFluxo } from '@/components/passos-do-fluxo';
import type { Evento } from '@/server/event/domain/evento';
import { localDeExibicao } from '@/server/event/domain/evento';

const PASSOS = ['Participantes', 'Pagamento', 'Confirmação'] as const;

const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' });
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/**
 * Topo comum das duas etapas do checkout: a trilha de progresso e, abaixo, o
 * evento que está sendo comprado. Antes o participante preenchia a etapa
 * inteira sem nunca ver para qual evento — o nome só aparecia miúdo dentro do
 * resumo lateral, que no mobile cai para depois do formulário.
 */
export function CabecalhoDoCheckout({
  passoAtual,
  titulo,
  descricao,
  evento,
}: {
  passoAtual: number;
  titulo: string;
  descricao?: string;
  evento: Evento | null;
}) {
  return (
    <div>
      <PassosDoFluxo passos={PASSOS} atual={passoAtual} />

      {evento ? (
        <div className="mt-8 flex items-center gap-4 rounded-card border border-line bg-surface p-3 shadow-card sm:gap-5">
          <div className="w-20 shrink-0 overflow-hidden rounded-[calc(var(--r-card)-0.4rem)] sm:w-24">
            <CapaEvento evento={evento} compacto comKicker={false} className="aspect-square" />
          </div>
          <div className="min-w-0">
            <h2 className="display m-0 truncate text-base sm:text-lg">{evento.nome}</h2>
            <p className="mt-0.5 truncate text-[13px] text-fg-muted">
              {dataCurta.format(evento.comecaEm)} · {hora.format(evento.comecaEm)} ·{' '}
              {localDeExibicao(evento)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <h1 className="display m-0 text-[clamp(1.5rem,3.2vw,2.15rem)] text-balance">{titulo}</h1>
        {descricao ? (
          <p className="mt-2 max-w-[58ch] text-[15px] leading-[1.6] text-fg-muted">{descricao}</p>
        ) : null}
      </div>
    </div>
  );
}
