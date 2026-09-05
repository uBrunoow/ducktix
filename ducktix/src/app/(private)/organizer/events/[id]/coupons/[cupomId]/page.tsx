import { notFound } from 'next/navigation';
import { CabecalhoDePagina } from '@/components/organizer/cabecalho-de-pagina';
import {
  BarraDeProporcao,
  BlocoDoPainel,
  TiraDeMetricas,
  formatarMoeda,
  formatarNumero,
} from '@/components/organizer/metricas';
import { SeloStatusCupom } from '@/components/organizer/selo-status-cupom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import {
  cupomValeParaEvento,
  descricaoDoDesconto,
  statusDoCupom,
} from '@/server/ticketing/domain/cupom';
import { drizzleCupomRepository as cupomRepository } from '@/server/ticketing/infrastructure/drizzle-cupons';
import { AcaoAtivarCupomDoEvento } from '../acao-ativar-cupom-do-evento';

export const dynamic = 'force-dynamic';

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function CupomDoEvento({
  params,
}: {
  params: Promise<{ id: string; cupomId: string }>;
}) {
  const { id, cupomId } = await params;
  const evento = await catalogoPublicoRepository.buscarPorId(id);
  if (!evento) notFound();

  const cupom = await cupomRepository.buscarPorId(cupomId);
  if (!cupom || !cupomValeParaEvento(cupom, evento.id)) notFound();

  const agora = new Date();
  const usos = (await cupomRepository.listarUsos(cupom.id)).filter(
    (u) => u.eventoId === evento.id,
  );

  const status = statusDoCupom(cupom, agora);
  const descontoNoEvento = usos.reduce((t, u) => t + u.descontoCentavos, 0);
  const aproveitamento =
    cupom.limiteDeUso === 0 ? 0 : Math.round((cupom.usos / cupom.limiteDeUso) * 100);

  return (
    <div className="grid min-w-0 gap-6">
      <CabecalhoDePagina
        titulo={cupom.codigo}
        voltar={{ href: `/organizer/events/${evento.id}/coupons`, rotulo: 'Cupons' }}
        descricao={`Desconto de ${descricaoDoDesconto(cupom)} · válido de ${dataCurta.format(cupom.validoDe)} a ${dataCurta.format(cupom.validoAte)}.`}
        acoes={
          <AcaoAtivarCupomDoEvento eventoId={evento.id} cupomId={cupom.id} ativo={cupom.ativo} />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SeloStatusCupom status={status} />
        <span className="text-[13px] text-fg-muted">Válido exclusivamente neste evento</span>
      </div>

      <TiraDeMetricas
        itens={[
          {
            rotulo: 'Desconto concedido aqui',
            valor: formatarMoeda(descontoNoEvento),
            apoio: `Em ${formatarNumero(usos.length)} pedidos deste evento`,
            destaque: true,
          },
          {
            rotulo: 'Usos do cupom',
            valor: `${formatarNumero(cupom.usos)} / ${formatarNumero(cupom.limiteDeUso)}`,
            apoio: `${aproveitamento}% do limite`,
          },
          {
            rotulo: 'Pedidos com cupom aqui',
            valor: formatarNumero(usos.length),
            apoio: 'Neste evento',
          },
          {
            rotulo: 'Desconto médio',
            valor:
              usos.length === 0
                ? '—'
                : formatarMoeda(Math.round(descontoNoEvento / usos.length), true),
            apoio: 'Por pedido com cupom, neste evento',
          },
        ]}
      />

      <BlocoDoPainel titulo="Aproveitamento do limite">
        <div className="flex items-baseline justify-between gap-3">
          <span className="display text-2xl tabular-nums">{aproveitamento}%</span>
          <span className="text-[13px] text-fg-muted tabular-nums">
            restam {formatarNumero(Math.max(0, cupom.limiteDeUso - cupom.usos))} usos
          </span>
        </div>
        <BarraDeProporcao
          percentual={aproveitamento}
          rotulo="Aproveitamento do limite"
          className="mt-3 h-2.5"
        />
      </BlocoDoPainel>

      {usos.length > 0 ? (
        <BlocoDoPainel
          titulo="Usos neste evento"
          descricao="Cada aplicação do cupom num pedido deste evento."
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usos.slice(0, 20).map((uso) => (
                  <TableRow key={uso.id}>
                    <TableCell className="tabular-nums text-fg-muted">
                      {dataHora.format(uso.usadoEm)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarMoeda(uso.descontoCentavos, true)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </BlocoDoPainel>
      ) : (
        <BlocoDoPainel titulo="Usos neste evento">
          <p className="py-8 text-center text-[13px] text-fg-muted">
            Este cupom ainda não foi usado em nenhum pedido deste evento.
          </p>
        </BlocoDoPainel>
      )}
    </div>
  );
}
