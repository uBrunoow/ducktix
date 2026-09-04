import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BarrasVerticais,
  BarraDeProporcao,
  BlocoDoPainel,
  TiraDeMetricas,
  formatarMoeda,
  formatarNumero,
} from '@/components/organizer/metricas';
import { Selo } from '@/components/organizer/selo';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { montarDetalheDoEvento } from '@/server/event/application/detalhe-do-evento';
import { statusDoLote } from '@/server/event/domain/evento';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { listarPedidosDoEvento } from '@/server/participation/application/participantes';
import { drizzleInscricoesRepository as inscricoesRepository } from '@/server/participation/infrastructure/drizzle-inscricoes';
import { drizzleCupomRepository as cupomRepository } from '@/server/ticketing/infrastructure/drizzle-cupons';

export const dynamic = 'force-dynamic';

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
});

export default async function VisaoGeralDoEvento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agora = new Date();

  const detalhe = await montarDetalheDoEvento(
    catalogoPublicoRepository,
    cupomRepository,
    inscricoesRepository,
    id,
    agora,
  );
  if (!detalhe) notFound();

  const pedidos = (await listarPedidosDoEvento(inscricoesRepository, id)).slice(0, 8);
  const { participacao } = detalhe;

  return (
    <div className="grid min-w-0 gap-6">
      <TiraDeMetricas
        itens={[
          {
            rotulo: 'Receita',
            valor: formatarMoeda(detalhe.receitaCentavos),
            apoio: `Ticket médio de ${formatarMoeda(detalhe.ticketMedioCentavos, true)}`,
            destaque: true,
          },
          {
            rotulo: 'Ingressos vendidos',
            valor: formatarNumero(detalhe.ingressosVendidos),
            apoio: `${detalhe.ocupacaoPercentual}% de ${formatarNumero(detalhe.capacidade)} lugares`,
          },
          {
            rotulo: 'Participantes',
            valor: formatarNumero(participacao.inscritos),
            apoio: `${formatarNumero(participacao.pedidos)} pedidos · ${formatarNumero(participacao.cancelados)} cancelados`,
          },
          {
            rotulo: 'Check-ins',
            valor: formatarNumero(participacao.presentes),
            apoio:
              participacao.presentes === 0
                ? 'Portaria sem entradas ainda'
                : `${participacao.taxaDePresenca}% de presença · ${formatarNumero(participacao.ausentes)} ausentes`,
          },
        ]}
      />

      {/* Vendas por lote em tabela, não em lista de barras soltas: com preço,
          estoque e receita lado a lado dá para responder "qual lote está
          segurando a venda?" numa varredura só. */}
      <BlocoDoPainel
        titulo="Vendas por lote"
        descricao="Estoque, preço e receita de cada lote da fila."
        acao={
          <Link
            href={`/organizer/events/${id}/lotes`}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-ink underline-offset-4 hover:underline"
          >
            Gerenciar lotes
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </Link>
        }
        className="[&>div:last-child]:p-0"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Lote</TableHead>
                <TableHead className="w-[38%]">Vendidos</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="pr-5 text-right">Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detalhe.lotes.map(({ lote, ocupacaoPercentual, receitaCentavos }) => {
                const situacao = statusDoLote(lote, agora);
                return (
                  <TableRow key={lote.id}>
                    <TableCell className="pl-5">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{lote.nome}</span>
                        {situacao === 'a-venda' ? null : (
                          <Selo tom={situacao === 'em-breve' ? 'atencao' : 'neutro'}>
                            {situacao === 'em-breve'
                              ? 'em breve'
                              : situacao === 'esgotado'
                                ? 'esgotado'
                                : 'encerrado'}
                          </Selo>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="block text-[13px] tabular-nums">
                        {formatarNumero(lote.vendidos)} / {formatarNumero(lote.vagas)}
                      </span>
                      <BarraDeProporcao
                        percentual={ocupacaoPercentual}
                        rotulo={`Ocupação do lote ${lote.nome}`}
                        className="mt-1.5 max-w-[14rem]"
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {lote.precoCentavos === 0
                        ? 'Gratuito'
                        : formatarMoeda(lote.precoCentavos, true)}
                    </TableCell>
                    <TableCell className="pr-5 text-right font-semibold tabular-nums">
                      {formatarMoeda(receitaCentavos)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </BlocoDoPainel>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <BlocoDoPainel
          titulo="Curva de vendas"
          descricao="Ingressos vendidos por dia nos 30 dias que antecedem o evento."
        >
          <BarrasVerticais
            dados={detalhe.vendasPorDia}
            formatarValor={(valor) => `${formatarNumero(valor)} ingressos`}
          />
        </BlocoDoPainel>

        <BlocoDoPainel titulo="Ocupação" descricao="Ingressos vendidos sobre a capacidade.">
          <div className="flex items-baseline gap-2">
            <span className="display text-[2.5rem] leading-none tabular-nums">
              {detalhe.ocupacaoPercentual}%
            </span>
            <span className="text-[13px] text-fg-muted">
              {formatarNumero(detalhe.ingressosVendidos)} de{' '}
              {formatarNumero(detalhe.capacidade)} lugares
            </span>
          </div>
          <BarraDeProporcao
            percentual={detalhe.ocupacaoPercentual}
            rotulo="Ocupação do evento"
            enfase
            className="mt-4 h-2.5"
          />

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5">
            <div>
              <dt className="text-[13px] text-fg-muted">Presentes</dt>
              <dd className="display mt-0.5 text-xl tabular-nums">
                {formatarNumero(participacao.presentes)}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-fg-muted">Ausentes</dt>
              <dd className="display mt-0.5 text-xl tabular-nums">
                {formatarNumero(participacao.ausentes)}
              </dd>
            </div>
          </dl>
        </BlocoDoPainel>
      </div>

      <BlocoDoPainel
        titulo="Últimos pedidos"
        descricao="As compras mais recentes deste evento."
        acao={
          <Link
            href={`/organizer/events/${id}/orders`}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-ink underline-offset-4 hover:underline"
          >
            Ver todos
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </Link>
        }
        className="[&>div:last-child]:p-0"
      >
        {pedidos.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-fg-muted">
            Nenhum pedido registrado para este evento ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Pedido</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead className="hidden md:table-cell">Lote</TableHead>
                  <TableHead className="text-right">Ingressos</TableHead>
                  <TableHead className="pr-5 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="pl-5 font-mono text-[13px] text-fg-muted">
                      {pedido.id}
                    </TableCell>
                    <TableCell>
                      <span className="block font-medium">{pedido.comprador}</span>
                      <span className="block text-[13px] text-fg-muted tabular-nums">
                        {dataCurta.format(pedido.compradoEm)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-fg-muted md:table-cell">
                      {pedido.lotes.join(' · ')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{pedido.quantidade}</TableCell>
                    <TableCell className="pr-5 text-right font-semibold tabular-nums">
                      {formatarMoeda(pedido.totalCentavos)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </BlocoDoPainel>
    </div>
  );
}
