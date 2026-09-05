import { notFound } from 'next/navigation';
import {
  BlocoDoPainel,
} from '@/components/organizer/metricas';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { drizzleCancelamentosRepository } from '@/server/participation/infrastructure/drizzle-cancelamentos';
import { DecidirCancelamento } from './decidir-cancelamento';

export const dynamic = 'force-dynamic';

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function CancelamentosDoEvento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const evento = await catalogoPublicoRepository.buscarPorId(id);
  if (!evento) notFound();

  const solicitacoes = await drizzleCancelamentosRepository.listarSolicitadosDoEvento(id);

  return (
    <BlocoDoPainel
      titulo="Solicitações de cancelamento"
      descricao="Analise os pedidos feitos pelos participantes. A aprovação invalida o ingresso."
      className="[&>div:last-child]:p-0"
    >
      {solicitacoes.length === 0 ? (
        <p className="px-5 py-10 text-center text-[13px] text-fg-muted">
          Nenhuma solicitação pendente para este evento.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Participante</TableHead>
                <TableHead>Solicitado em</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="pr-5 text-right">Decisão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitacoes.map((solicitacao) => (
                <TableRow key={solicitacao.id}>
                  <TableCell className="pl-5">
                    <span className="block font-medium">{solicitacao.participanteNome}</span>
                    <span className="block text-[13px] text-fg-muted">
                      {solicitacao.participanteEmail}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[13px] text-fg-muted">
                    {dataHora.format(solicitacao.solicitadoEm)}
                  </TableCell>
                  <TableCell className="max-w-[20rem] text-[13px] text-fg-muted">
                    {solicitacao.motivo ?? 'Sem motivo informado'}
                  </TableCell>
                  <TableCell className="pr-5">
                    <DecidirCancelamento eventoId={id} cancelamentoId={solicitacao.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </BlocoDoPainel>
  );
}
