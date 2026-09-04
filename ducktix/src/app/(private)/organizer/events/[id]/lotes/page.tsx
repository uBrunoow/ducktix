import { notFound } from 'next/navigation';
import {
  BarraDeProporcao,
  BlocoDoPainel,
  TiraDeMetricas,
  formatarMoeda,
  formatarNumero,
} from '@/components/organizer/metricas';
import { Selo, type TomDeSelo } from '@/components/organizer/selo';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  capacidadeTotal,
  ingressosVendidos,
  receitaCentavos,
  rotuloStatus,
  statusDoLote,
  type StatusLote,
} from '@/server/event/domain/evento';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';

export const dynamic = 'force-dynamic';

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const TOM_DO_STATUS: Record<StatusLote, TomDeSelo> = {
  'a-venda': 'ok',
  'ultimo-lote': 'marca',
  'em-breve': 'atencao',
  esgotado: 'neutro',
  encerrado: 'neutro',
};

/** "de 12 set a 19 set" — a janela lida como frase, não como duas colunas
 *  de data que o olho tem que juntar sozinho. */
function janelaDeVenda(iniciaEm: Date | null, encerraEm: Date | null): string {
  if (!iniciaEm && !encerraEm) return 'Aberto enquanto o evento não começa';
  if (iniciaEm && !encerraEm) return `A partir de ${dataHora.format(iniciaEm)}`;
  if (!iniciaEm && encerraEm) return `Até ${dataHora.format(encerraEm)}`;
  return `${dataHora.format(iniciaEm!)} → ${dataHora.format(encerraEm!)}`;
}

export default async function LotesDoEvento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const evento = await catalogoPublicoRepository.buscarPorId(id);
  if (!evento) notFound();

  const agora = new Date();
  const vendidos = ingressosVendidos(evento);
  const capacidade = capacidadeTotal(evento);
  const receita = receitaCentavos(evento);

  return (
    <div className="grid min-w-0 gap-6">
      <TiraDeMetricas
        itens={[
          {
            rotulo: 'À venda agora',
            valor: formatarNumero(
              evento.lotes.filter((l) => statusDoLote(l, agora) === 'a-venda')
                .length,
            ),
          },
          {
            rotulo: 'Lotes na fila',
            valor: formatarNumero(evento.lotes.length),
          },
          { rotulo: 'Vendidos', valor: formatarNumero(vendidos) },
          {
            rotulo: 'Estoque restante',
            valor: formatarNumero(capacidade - vendidos),
          },
          {
            rotulo: 'Receita dos lotes',
            valor: formatarMoeda(receita),
            destaque: true,
          },
        ]}
      />

      <BlocoDoPainel
        titulo="Fila de lotes"
        descricao="A ordem em que os lotes abrem, com a janela de venda de cada um."
        className="[&>div:last-child]:p-0"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Lote</TableHead>
                <TableHead>Janela de venda</TableHead>
                <TableHead className="w-[22%]">Estoque</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="pr-5 text-right">Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evento.lotes.map((lote) => {
                const situacao = statusDoLote(lote, agora);
                const ocupacao =
                  lote.vagas === 0
                    ? 0
                    : Math.round((lote.vendidos / lote.vagas) * 100);

                return (
                  <TableRow key={lote.id}>
                    <TableCell className="pl-5">
                      <span className="block font-medium">{lote.nome}</span>
                      <Selo tom={TOM_DO_STATUS[situacao]} className="mt-1.5">
                        {rotuloStatus(situacao)}
                      </Selo>
                    </TableCell>
                    <TableCell className="text-[13px] text-fg-muted">
                      {janelaDeVenda(lote.iniciaEm, lote.encerraEm)}
                    </TableCell>
                    <TableCell>
                      <span className="block text-[13px] tabular-nums">
                        {formatarNumero(lote.vendidos)} /{' '}
                        {formatarNumero(lote.vagas)}
                      </span>
                      <BarraDeProporcao
                        percentual={ocupacao}
                        rotulo={`Ocupação do lote ${lote.nome}`}
                        className="mt-1.5"
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {lote.precoCentavos === 0
                        ? 'Gratuito'
                        : formatarMoeda(lote.precoCentavos, true)}
                    </TableCell>
                    <TableCell className="pr-5 text-right font-semibold tabular-nums">
                      {formatarMoeda(lote.vendidos * lote.precoCentavos)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </BlocoDoPainel>

      <p className="text-[13px] text-fg-muted">
        Preço, vagas e datas de um lote com ingresso já vendido mudam por um
        processo próprio — não por edição direta do formulário do evento.
        Enquanto ele não existe, a fila é definida na criação do evento.
      </p>
    </div>
  );
}
