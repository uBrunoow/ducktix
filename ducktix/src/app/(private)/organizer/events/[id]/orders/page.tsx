import type { Route } from 'next';
import { notFound } from 'next/navigation';
import {
  BlocoDoPainel,
  Paginacao,
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
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { listarPedidosDoEvento } from '@/server/participation/application/participantes';
import { drizzleInscricoesRepository as inscricoesRepository } from '@/server/participation/infrastructure/drizzle-inscricoes';

export const dynamic = 'force-dynamic';

const POR_PAGINA = 30;

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function PedidosDoEvento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { id } = await params;
  const { pagina = '1' } = await searchParams;

  const evento = await catalogoPublicoRepository.buscarPorId(id);
  if (!evento) notFound();

  const todos = await listarPedidosDoEvento(inscricoesRepository, id);
  const totalDePaginas = Math.max(1, Math.ceil(todos.length / POR_PAGINA));
  const atual = Math.min(Math.max(1, Number(pagina) || 1), totalDePaginas);
  const visiveis = todos.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);

  const receita = todos.reduce((total, p) => total + p.totalCentavos, 0);
  const ingressos = todos.reduce((total, p) => total + p.quantidade, 0);
  const comCancelamento = todos.filter((p) => p.canceladas > 0).length;

  return (
    <div className="grid min-w-0 gap-6">
      <TiraDeMetricas
        itens={[
          {
            rotulo: 'Receita dos pedidos',
            valor: formatarMoeda(receita),
            destaque: true,
          },
          {
            rotulo: 'Ticket médio',
            valor: formatarMoeda(
              todos.length === 0 ? 0 : Math.round(receita / todos.length),
              true,
            ),
          },
          { rotulo: 'Pedidos', valor: formatarNumero(todos.length) },
          { rotulo: 'Ingressos', valor: formatarNumero(ingressos) },
          {
            rotulo: 'Com cancelamento',
            valor: formatarNumero(comCancelamento),
          },
        ]}
      />

      <BlocoDoPainel
        titulo="Pedidos"
        descricao="Cada pedido agrupa as inscrições feitas na mesma compra."
        className="[&>div:last-child]:p-0"
      >
        {visiveis.length === 0 ? (
          <p className="px-5 py-12 text-center text-[13px] text-fg-muted">
            Nenhum pedido registrado para este evento ainda.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Pedido</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead className="hidden lg:table-cell">Lote</TableHead>
                    <TableHead className="hidden md:table-cell">Data</TableHead>
                    <TableHead className="text-right">Ingressos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="pr-5 text-right">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiveis.map((pedido) => (
                    <TableRow key={pedido.id}>
                      <TableCell className="pl-5 font-mono text-[12px] text-fg-muted">
                        {pedido.id}
                      </TableCell>
                      <TableCell>
                        <span className="block font-medium">
                          {pedido.comprador}
                        </span>
                        <span className="block text-[13px] text-fg-muted">
                          {pedido.compradorEmail}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-fg-muted lg:table-cell">
                        {pedido.lotes.join(' · ')}
                      </TableCell>
                      <TableCell className="hidden text-fg-muted tabular-nums md:table-cell">
                        {dataHora.format(pedido.compradoEm)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {pedido.quantidade}
                        {pedido.presentes > 0 ? (
                          <span className="block text-[12px] text-fg-muted">
                            {pedido.presentes} entraram
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatarMoeda(pedido.totalCentavos)}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        {pedido.canceladas === 0 ? (
                          <Selo tom="ok">Pago</Selo>
                        ) : pedido.canceladas === pedido.quantidade ? (
                          <Selo tom="erro">Cancelado</Selo>
                        ) : (
                          <Selo tom="atencao">
                            {pedido.canceladas} cancelada(s)
                          </Selo>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Paginacao
              paginaAtual={atual}
              totalDePaginas={totalDePaginas}
              href={(pagina) =>
                `/organizer/events/${id}/orders?pagina=${pagina}` as Route
              }
            />
          </>
        )}
      </BlocoDoPainel>
    </div>
  );
}
