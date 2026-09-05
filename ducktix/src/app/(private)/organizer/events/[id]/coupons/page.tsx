import { ChevronRight } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BarraDeProporcao,
  BlocoDoPainel,
  TiraDeMetricas,
  formatarMoeda,
  formatarNumero,
} from '@/components/organizer/metricas';
import { SeloStatusCupom } from '@/components/organizer/selo-status-cupom';
import { Button } from '@/components/ui/button';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import {
  cupomValeParaEvento,
  descricaoDoDesconto,
  statusDoCupom,
} from '@/server/ticketing/domain/cupom';
import { drizzleCupomRepository as cupomRepository } from '@/server/ticketing/infrastructure/drizzle-cupons';

export const dynamic = 'force-dynamic';

export default async function CuponsDoEvento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const evento = await catalogoPublicoRepository.buscarPorId(id);
  if (!evento) notFound();

  const agora = new Date();
  const todos = await cupomRepository.listarTodos();
  const usosDoEvento = await cupomRepository.listarUsosPorEvento(evento.id);

  // Cada cupom pertence a um evento; nunca exibir cupons de outros eventos.
  const cupons = todos.filter((cupom) => cupomValeParaEvento(cupom, evento.id));

  const linhas = cupons.map((cupom) => {
    const usos = usosDoEvento.filter((u) => u.cupomId === cupom.id);
    return {
      cupom,
      status: statusDoCupom(cupom, agora),
      usosNoEvento: usos.length,
      descontoNoEventoCentavos: usos.reduce(
        (t, u) => t + u.descontoCentavos,
        0,
      ),
    };
  });

  const descontoTotal = linhas.reduce(
    (t, l) => t + l.descontoNoEventoCentavos,
    0,
  );
  const ativos = linhas.filter((l) => l.status === 'ativo').length;

  return (
    <div className="grid min-w-0 gap-6">
      <TiraDeMetricas
        itens={[
          {
            rotulo: 'Desconto concedido',
            valor: formatarMoeda(descontoTotal),
            destaque: true,
          },
          {
            rotulo: 'Usos neste evento',
            valor: formatarNumero(usosDoEvento.length),
          },
          { rotulo: 'Cupons ativos', valor: formatarNumero(ativos) },
          {
            rotulo: 'Cupons que valem aqui',
            valor: formatarNumero(linhas.length),
          },
        ]}
      />

      <BlocoDoPainel
        titulo="Cupons"
        descricao="Códigos de desconto criados exclusivamente para este evento."
        acao={
          <Button asChild>
            <Link href={`/organizer/events/${evento.id}/coupons/new` as Route}>
              Criar cupom
            </Link>
          </Button>
        }
      >
        {linhas.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold">
              Nenhum cupom vale para este evento.
            </p>
            <p className="mt-1 text-[13px] text-fg-muted">
              Crie um código de desconto restrito a este evento.
            </p>
            <Button asChild className="mt-4">
              <Link
                href={`/organizer/events/${evento.id}/coupons/new` as Route}
              >
                Criar cupom
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-2">
            {linhas.map((linha) => {
              const aproveitamento =
                linha.cupom.limiteDeUso === 0
                  ? 0
                  : Math.round(
                      (linha.cupom.usos / linha.cupom.limiteDeUso) * 100,
                    );

              return (
                <li key={linha.cupom.id}>
                  <Link
                    href={
                      `/organizer/events/${evento.id}/coupons/${linha.cupom.id}` as Route
                    }
                    className="group flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-line bg-bg p-4 transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="font-mono text-sm font-semibold">
                        {linha.cupom.codigo}
                      </span>
                      <SeloStatusCupom status={linha.status} />
                    </span>

                    <span className="text-sm font-semibold tabular-nums">
                      −{descricaoDoDesconto(linha.cupom)}
                    </span>

                    <span className="w-full sm:w-40">
                      <span className="flex items-baseline justify-between gap-2 text-[13px] text-fg-muted tabular-nums">
                        <span>
                          {formatarNumero(linha.cupom.usos)}/
                          {formatarNumero(linha.cupom.limiteDeUso)} usos
                        </span>
                        <span>{aproveitamento}%</span>
                      </span>
                      <BarraDeProporcao
                        percentual={aproveitamento}
                        rotulo={`Aproveitamento do cupom ${linha.cupom.codigo}`}
                        className="mt-1.5"
                      />
                    </span>

                    <span className="hidden w-28 text-right text-sm font-semibold tabular-nums sm:block">
                      {formatarMoeda(linha.descontoNoEventoCentavos)}
                    </span>

                    <ChevronRight
                      className="size-4 shrink-0 text-fg-muted transition-transform duration-200 group-hover:translate-x-0.5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </BlocoDoPainel>
    </div>
  );
}
