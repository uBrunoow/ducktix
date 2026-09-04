import { SearchIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BlocoDoPainel,
  Paginacao,
  TiraDeMetricas,
  formatarMoeda,
  formatarNumero,
} from '@/components/organizer/metricas';
import { Selo } from '@/components/organizer/selo';
import { Input } from '@/components/ui/input';
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
  listarParticipantes,
  resumoDoEvento,
} from '@/server/participation/application/participantes';
import { nomeCompleto } from '@/server/participation/domain/inscricao';
import { drizzleInscricoesRepository as inscricoesRepository } from '@/server/participation/infrastructure/drizzle-inscricoes';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});
const hora = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

type Situacao = 'todos' | 'presentes' | 'ausentes';

const FILTROS: readonly {
  readonly valor: Situacao;
  readonly rotulo: string;
}[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'presentes', rotulo: 'Presentes' },
  { valor: 'ausentes', rotulo: 'Ausentes' },
];

/**
 * Lista nominal de participantes.
 *
 * Busca, filtro e página vivem na URL: o estado é compartilhável, sobrevive
 * ao recarregar e o botão voltar faz o que se espera dele — três coisas que
 * um filtro só de cliente perderia num painel que é usado com o evento
 * acontecendo.
 */
export default async function ParticipantesDoEvento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ busca?: string; situacao?: string; pagina?: string }>;
}) {
  const { id } = await params;
  const {
    busca = '',
    situacao: situacaoBruta = 'todos',
    pagina = '1',
  } = await searchParams;

  const evento = await catalogoPublicoRepository.buscarPorId(id);
  if (!evento) notFound();

  const situacao: Situacao = FILTROS.some((f) => f.valor === situacaoBruta)
    ? (situacaoBruta as Situacao)
    : 'todos';

  const [lista, resumo] = await Promise.all([
    listarParticipantes(inscricoesRepository, id, {
      busca,
      apenasPresentes: situacao === 'presentes',
      apenasAusentes: situacao === 'ausentes',
      pagina: Number(pagina) || 1,
    }),
    resumoDoEvento(inscricoesRepository, id),
  ]);

  const base = `/organizer/events/${id}/attendees`;
  const comFiltros = (mudanca: Record<string, string>) => {
    const query = new URLSearchParams({
      ...(busca ? { busca } : {}),
      ...(situacao !== 'todos' ? { situacao } : {}),
      ...mudanca,
    });
    const texto = query.toString();
    return (texto ? `${base}?${texto}` : base) as Route;
  };

  return (
    <div className="grid min-w-0 gap-6">
      <TiraDeMetricas
        itens={[
          { rotulo: 'Inscritos', valor: formatarNumero(resumo.inscritos) },
          {
            rotulo: 'Presentes',
            valor: formatarNumero(resumo.presentes),
            destaque: true,
          },
          { rotulo: 'Ausentes', valor: formatarNumero(resumo.ausentes) },
          { rotulo: 'Cancelados', valor: formatarNumero(resumo.cancelados) },
          { rotulo: 'Taxa de presença', valor: `${resumo.taxaDePresenca}%` },
        ]}
      />

      <BlocoDoPainel
        titulo="Participantes"
        descricao="Lista nominal de quem comprou ingresso para este evento."
        acao={
          <form
            method="get"
            action={base}
            className="flex flex-wrap items-center gap-2"
          >
            {/* O filtro viaja junto com a busca para o organizador não perder
              o recorte ao digitar um nome. */}
            {situacao !== 'todos' ? (
              <input type="hidden" name="situacao" value={situacao} />
            ) : null}
            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-fg-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <Input
                type="search"
                name="busca"
                defaultValue={busca}
                placeholder="Nome, e-mail ou código"
                aria-label="Buscar participante"
                className="h-9 w-full pl-9 sm:w-64"
              />
            </div>
          </form>
        }
        className="[&>div:last-child]:p-0"
      >
        <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3">
          {FILTROS.map((filtro) => (
            <Link
              key={filtro.valor}
              href={comFiltros({
                situacao: filtro.valor,
                pagina: '1',
              })}
              aria-current={situacao === filtro.valor ? 'true' : undefined}
              className={cn(
                'rounded-chip border px-3 py-1 text-[13px] font-medium transition-colors duration-150',
                situacao === filtro.valor
                  ? 'border-brand bg-brand-tint text-fg'
                  : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:bg-surface-2',
              )}
            >
              {filtro.rotulo}
            </Link>
          ))}
        </div>

        {lista.linhas.length === 0 ? (
          <p className="px-5 py-12 text-center text-[13px] text-fg-muted">
            {busca
              ? 'Nenhum participante corresponde à busca.'
              : 'Nenhuma inscrição neste recorte.'}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Participante</TableHead>
                    <TableHead className="hidden md:table-cell">Lote</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Código
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Compra
                    </TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="pr-5 text-right">Entrada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.linhas.map(({ inscricao }) => (
                    <TableRow key={inscricao.id}>
                      <TableCell className="pl-5">
                        <span className="block font-medium">
                          {nomeCompleto(inscricao)}
                        </span>
                        <span className="block text-[13px] text-fg-muted">
                          {inscricao.participanteEmail}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-fg-muted md:table-cell">
                        {inscricao.loteNome}
                      </TableCell>
                      <TableCell className="hidden font-mono text-[12px] text-fg-muted lg:table-cell">
                        {inscricao.codigo}
                      </TableCell>
                      <TableCell className="hidden text-fg-muted tabular-nums lg:table-cell">
                        {dataCurta.format(inscricao.compradoEm)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {inscricao.precoPagoCentavos === 0
                          ? 'Gratuito'
                          : formatarMoeda(inscricao.precoPagoCentavos, true)}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        {inscricao.cancelada ? (
                          <Selo tom="erro">Cancelado</Selo>
                        ) : inscricao.checkInEm ? (
                          <Selo tom="ok">
                            {hora.format(inscricao.checkInEm)}
                          </Selo>
                        ) : (
                          <Selo>Não entrou</Selo>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Paginacao
              paginaAtual={lista.pagina}
              totalDePaginas={lista.totalDePaginas}
              legenda={`${formatarNumero(lista.total)} inscrições · página ${lista.pagina} de ${lista.totalDePaginas}`}
              href={(pagina) => comFiltros({ pagina: String(pagina) })}
            />
          </>
        )}
      </BlocoDoPainel>
    </div>
  );
}
