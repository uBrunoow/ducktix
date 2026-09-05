import { ArrowLeft, Briefcase, Calendar, Mail, MapPin, Phone } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Cabecalho } from '@/components/cabecalho';
import { CapaEvento } from '@/components/capa-evento';
import { CodigoQR } from '@/components/codigo-qr';
import { Faixa, Filete, Moldura } from '@/components/moldura';
import { Rodape } from '@/components/rodape';
import { SeloStatusIngresso } from '@/components/selo-status-ingresso';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { localDeExibicao, rotuloModalidade } from '@/server/event/domain/evento';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { listarIngressosDoPedidoDoParticipante } from '@/server/participation/application/meus-ingressos';
import { nomeDeExibicao } from '@/server/participation/domain/ingresso';
import { drizzleIngressosRepository as memoriaIngressosRepository } from '@/server/participation/infrastructure/drizzle-ingressos';
import { drizzlePedidosRepository as pedidosRepository } from '@/server/ticketing/infrastructure/drizzle-pedidos';
import { drizzleCancelamentosRepository } from '@/server/participation/infrastructure/drizzle-cancelamentos';
import { SolicitarCancelamento } from './solicitar-cancelamento';

export const dynamic = 'force-dynamic';

const dataCompleta = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dataEmissao = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const CAMPO_PROFISSIONAL: Record<string, string> = {
  cargo: 'Cargo',
  empresa: 'Empresa',
  segmento: 'Segmento',
  nivel: 'Nível',
  linkedin: 'LinkedIn',
  github: 'GitHub',
};

export default async function PaginaDeIngresso({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) redirect(`/login?next=${encodeURIComponent(`/my-tickets/${id}`)}`);

  const encontrados = await listarIngressosDoPedidoDoParticipante(
    pedidosRepository,
    memoriaIngressosRepository,
    sessao.usuarioId,
    id,
  );
  if (encontrados.length === 0) notFound();

  const evento = await catalogoPublicoRepository.buscarPorId(encontrados[0].eventoId);
  const ingressosComCancelamento = await Promise.all(
    encontrados.map(async (item) => ({
      ...item,
      cancelamento: await drizzleCancelamentosRepository.buscarPorIngresso(item.ingresso.id),
    })),
  );

  return (
    <Moldura>
      <Cabecalho />
      <Faixa className="py-14 md:py-20">
        <Link
          href="/my-tickets"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden="true" />
          Meus ingressos
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
          <h1 className="display m-0 max-w-[42rem] text-[clamp(1.75rem,3.6vw,2.5rem)] text-balance">
            {evento?.nome ?? 'Evento removido'}
          </h1>
          <SeloStatusIngresso status={encontrados[0].ingresso.status} />
        </div>

        <div className="mt-10 grid min-w-0 gap-8">
          {ingressosComCancelamento.map(({ ingresso, cancelamento }) => {
            const dadosProfissionaisPreenchidos = ingresso.dadosProfissionais
              ? Object.entries(ingresso.dadosProfissionais).filter(([, valor]) => valor.trim() !== '')
              : [];

            return (
              <div key={ingresso.id} className="grid min-w-0 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          {/* Cartão do ingresso: capa, QR e o essencial para apresentar na entrada. */}
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            {evento ? <CapaEvento evento={evento} className="aspect-[16/9]" /> : null}

            <div className="relative border-t border-dashed border-line-strong p-6 text-center">
              <span
                aria-hidden="true"
                className="absolute -left-3 -top-3 size-6 rounded-full bg-bg"
              />
              <span
                aria-hidden="true"
                className="absolute -right-3 -top-3 size-6 rounded-full bg-bg"
              />

              <div className="mx-auto flex w-fit flex-col items-center gap-3 rounded-[calc(var(--r-card)-0.4rem)] border border-line bg-surface p-4">
                <CodigoQR valor={ingresso.id} />
                <p className="break-all font-mono text-[11px] tracking-tight text-fg-muted">
                  {ingresso.id}
                </p>
              </div>

              <p className="display mt-5 text-lg">{nomeDeExibicao(ingresso)}</p>
              {evento ? (
                <p className="mt-1 text-[13px] text-fg-muted">
                  {dataCompleta.format(evento.comecaEm).replace(/^\w/, (c) => c.toUpperCase())} ·{' '}
                  {hora.format(evento.comecaEm)}
                </p>
              ) : null}
                </div>
          </div>

          {/* Detalhamento: evento, participante e dados complementares. */}
          <div className="flex flex-col gap-6">
            <section className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-7">
              <h2 className="display m-0 text-lg">Sobre o evento</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-fg-muted" strokeWidth={1.75} aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[13px] text-fg-muted">Data e horário</dt>
                    <dd className="mt-0.5 text-sm font-medium">
                      {evento
                        ? `${dataCompleta.format(evento.comecaEm).replace(/^\w/, (c) => c.toUpperCase())} · ${hora.format(evento.comecaEm)}`
                        : 'Indisponível'}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-fg-muted" strokeWidth={1.75} aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[13px] text-fg-muted">Local</dt>
                    <dd className="mt-0.5 text-sm font-medium">
                      {evento ? localDeExibicao(evento) : 'Indisponível'}
                      {evento ? (
                        <span className="ml-1.5 text-fg-muted">· {rotuloModalidade(evento.modalidade)}</span>
                      ) : null}
                    </dd>
                  </div>
                </div>
                {evento ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[13px] text-fg-muted">Organização</dt>
                    <dd className="mt-0.5 text-sm font-medium">{evento.organizador}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-7">
              <h2 className="display m-0 text-lg">Participante</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-[13px] text-fg-muted">Nome</dt>
                  <dd className="mt-0.5 text-sm font-medium">
                    {ingresso.participanteNome} {ingresso.participanteSobrenome}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[13px] text-fg-muted">Nome no crachá</dt>
                  <dd className="mt-0.5 text-sm font-medium">{nomeDeExibicao(ingresso)}</dd>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 size-4 shrink-0 text-fg-muted" strokeWidth={1.75} aria-hidden="true" />
                  <div>
                    <dt className="text-[13px] text-fg-muted">E-mail</dt>
                    <dd className="mt-0.5 truncate text-sm font-medium">{ingresso.participanteEmail}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-fg-muted" strokeWidth={1.75} aria-hidden="true" />
                  <div>
                    <dt className="text-[13px] text-fg-muted">Celular</dt>
                    <dd className="mt-0.5 text-sm font-medium">{ingresso.participanteCelular}</dd>
                  </div>
                </div>
              </dl>
            </section>

            {dadosProfissionaisPreenchidos.length > 0 ? (
              <section className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-7">
                <h2 className="display flex items-center gap-2 text-lg">
                  <Briefcase className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden="true" />
                  Dados profissionais
                </h2>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  {dadosProfissionaisPreenchidos.map(([campo, valor]) => (
                    <div key={campo}>
                      <dt className="text-[13px] text-fg-muted">{CAMPO_PROFISSIONAL[campo] ?? campo}</dt>
                      <dd className="mt-0.5 truncate text-sm font-medium">{valor}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            <p className="px-1 text-[13px] text-fg-muted">
              Ingresso emitido em {dataEmissao.format(ingresso.emitidoEm)}.
            </p>
            {cancelamento ? (
              <div className="rounded-[var(--r-control)] bg-secondary px-4 py-3 text-sm">
                <p className="font-medium">
                  Cancelamento{' '}
                  {cancelamento.status === 'solicitado'
                    ? 'aguardando análise'
                    : cancelamento.status === 'aprovado'
                      ? 'aprovado'
                      : 'recusado'}
                </p>
                {cancelamento.motivo ? (
                  <p className="mt-1 text-[13px] text-fg-muted">Motivo: {cancelamento.motivo}</p>
                ) : null}
                {cancelamento.status === 'negado' ? (
                  <SolicitarCancelamento
                    ingressoId={ingresso.id}
                    pedidoId={id}
                    bloqueado={false}
                  />
                ) : null}
              </div>
            ) : (
              <SolicitarCancelamento
                ingressoId={ingresso.id}
                pedidoId={id}
                bloqueado={ingresso.status !== 'emitido'}
              />
            )}
          </div>
                </div>
              );
            })}
        </div>
      </Faixa>
      <Filete />
      <Rodape />
    </Moldura>
  );
}
