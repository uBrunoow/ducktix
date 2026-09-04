import { SearchIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { BlocoDoPainel, formatarMoeda, formatarNumero } from '@/components/organizer/metricas';
import { SeloStatusIngresso } from '@/components/selo-status-ingresso';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { InscricaoNaTabela } from '@/server/event/application/detalhe-do-evento';
import { nomeCompleto } from '@/server/participation/domain/inscricao';

const POR_PAGINA = 25;

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

/**
 * Lista nominal de inscritos, com busca e paginação no servidor — um evento
 * grande passa de mil linhas, e mandar tudo para o cliente para filtrar em
 * memória seria pesado à toa. Busca e página vivem na URL, então o estado é
 * compartilhável e sobrevive ao recarregar.
 */
export function TabelaDeInscritos({
  eventoId,
  inscricoes,
  jaAconteceu,
  busca,
  pagina,
}: {
  eventoId: string;
  inscricoes: readonly InscricaoNaTabela[];
  jaAconteceu: boolean;
  busca: string;
  pagina: number;
}) {
  const termo = busca.trim().toLowerCase();
  const filtradas = termo
    ? inscricoes.filter(
        ({ inscricao }) =>
          nomeCompleto(inscricao).toLowerCase().includes(termo) ||
          inscricao.participanteEmail.toLowerCase().includes(termo) ||
          inscricao.loteNome.toLowerCase().includes(termo),
      )
    : inscricoes;

  const totalDePaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(Math.max(1, pagina), totalDePaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const base = `/organizer/events/${eventoId}`;
  const comBusca = (p: number) =>
    `${base}?${new URLSearchParams({ ...(termo ? { busca } : {}), pagina: String(p) })}` as Route;

  return (
    <BlocoDoPainel
      titulo="Participantes"
      descricao={
        termo
          ? `${formatarNumero(filtradas.length)} de ${formatarNumero(inscricoes.length)} inscrições correspondem à busca.`
          : `${formatarNumero(inscricoes.length)} inscrições emitidas para este evento.`
      }
      acao={
        <form method="get" action={base} className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-fg-muted"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <Input
              type="search"
              name="busca"
              defaultValue={busca}
              placeholder="Buscar por nome, e-mail ou lote"
              aria-label="Buscar participante"
              className="h-9 w-full pl-9 sm:w-72"
            />
          </div>
        </form>
      }
    >
      {visiveis.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-fg-muted">
          {termo
            ? 'Nenhum participante corresponde à busca.'
            : 'Nenhuma inscrição registrada para este evento ainda.'}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead className="hidden md:table-cell">Lote</TableHead>
                  <TableHead className="hidden lg:table-cell">Compra</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">
                    {jaAconteceu ? 'Check-in' : 'Status'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.map(({ inscricao, status }) => (
                  <TableRow key={inscricao.id}>
                    <TableCell>
                      <span className="block font-medium">{nomeCompleto(inscricao)}</span>
                      <span className="block text-[13px] text-fg-muted">
                        {inscricao.participanteEmail}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-fg-muted md:table-cell">
                      {inscricao.loteNome}
                    </TableCell>
                    <TableCell className="hidden text-fg-muted tabular-nums lg:table-cell">
                      {dataCurta.format(inscricao.compradoEm)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {inscricao.precoPagoCentavos === 0
                        ? 'Gratuito'
                        : formatarMoeda(inscricao.precoPagoCentavos, true)}
                    </TableCell>
                    <TableCell className="text-right">
                      <SeloStatusIngresso status={status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalDePaginas > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
              <p className="text-[13px] text-fg-muted">
                Página {paginaAtual} de {totalDePaginas}
              </p>
              <div className="flex items-center gap-2">
                {paginaAtual > 1 ? (
                  <Link
                    href={comBusca(paginaAtual - 1)}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
                  >
                    Anterior
                  </Link>
                ) : null}
                {paginaAtual < totalDePaginas ? (
                  <Link
                    href={comBusca(paginaAtual + 1)}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
                  >
                    Próxima
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </BlocoDoPainel>
  );
}
