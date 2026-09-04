import { notFound } from 'next/navigation';
import { BotaoFalarComOrganizador } from '@/components/botao-falar-com-organizador';
import { Cabecalho } from '@/components/cabecalho';
import { CapaEvento } from '@/components/capa-evento';
import { Faixa, Filete, Moldura } from '@/components/moldura';
import { Rodape } from '@/components/rodape';
import { SeletorDeIngresso } from '@/components/seletor-de-ingresso';
import { SeloStatus } from '@/components/selo-status';
import {
  capacidadeTotal,
  localDeExibicao,
  rotuloModalidade,
  statusDoEvento,
} from '@/server/event/domain/evento';
import { buscarEventoPorSlug } from '@/server/event/application/vitrine';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';

export const dynamic = 'force-dynamic';

const catalogo = catalogoPublicoRepository;

const dataLonga = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default async function PaginaDoEvento({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const evento = await buscarEventoPorSlug(catalogo, slug);
  if (!evento) notFound();

  const agora = new Date();
  const status = statusDoEvento(evento, agora);
  const ocupacaoPercentual = Math.round(
    (evento.lotes.reduce((soma, l) => soma + l.vendidos, 0) / capacidadeTotal(evento)) * 100,
  );

  return (
    <Moldura>
      <Cabecalho />

      <Faixa className="py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <div>
            <CapaEvento
              evento={evento}
              destaque
              className="aspect-[16/10] rounded-card border border-line p-7"
            />

            <div className="mt-7">
              <h1 className="display text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[1.15] text-balance">
                {evento.nome}
              </h1>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[15px] text-fg-muted">Organizado por {evento.organizador}</p>
                <BotaoFalarComOrganizador organizador={evento.organizador} />
              </div>

              <dl className="mt-8 grid grid-cols-1 gap-5 border-t border-line pt-6 sm:grid-cols-2">
                <Fato rotulo="Quando">
                  {dataLonga.format(evento.comecaEm)} · {hora.format(evento.comecaEm)}
                </Fato>
                <Fato rotulo="Onde">
                  {localDeExibicao(evento)} · {rotuloModalidade(evento.modalidade)}
                </Fato>
                <Fato rotulo="Capacidade">
                  {capacidadeTotal(evento).toLocaleString('pt-BR')} pessoas
                </Fato>
                <Fato rotulo="Ocupação">{ocupacaoPercentual}% dos ingressos vendidos</Fato>
              </dl>

              <div className="mt-8 border-t border-line pt-6">
                <h2 className="text-sm font-semibold">Sobre o evento</h2>
                {/* Descrição vem do editor WYSIWYG do organizador — conteúdo
                    autoral do próprio dono do evento, não de terceiros. */}
                <div
                  className="prose-evento mt-2.5 max-w-[64ch] text-[15px] leading-[1.7] text-fg-muted"
                  dangerouslySetInnerHTML={{ __html: evento.descricao }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-card border border-line bg-surface p-6 shadow-card lg:sticky lg:top-24">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="display text-lg">Ingressos</h2>
              <SeloStatus status={status} />
            </div>
            <SeletorDeIngresso evento={evento} agora={agora} />
          </div>
        </div>
      </Faixa>

      <Filete />
      <Rodape />
    </Moldura>
  );
}

function Fato({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-fg-muted">{rotulo}</dt>
      <dd className="m-0 mt-1 text-sm font-medium">{children}</dd>
    </div>
  );
}
