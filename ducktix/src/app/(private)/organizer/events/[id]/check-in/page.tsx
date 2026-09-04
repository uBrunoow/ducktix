import { notFound } from 'next/navigation';
import { PortariaDoEvento } from '@/components/organizer/portaria/portaria-do-evento';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { montarPainelDaPortaria } from '@/server/participation/application/check-in';
import { drizzleInscricoesRepository as inscricoesRepository } from '@/server/participation/infrastructure/drizzle-inscricoes';

export const dynamic = 'force-dynamic';

/**
 * A portaria: câmera decodificando o QR do ingresso, entrada liberada ou
 * recusada com o motivo em voz alta, e o ritmo da fila em tempo real. É a
 * única tela do back-office pensada primeiro para celular — quem opera a
 * porta não está sentado numa mesa.
 */
export default async function CheckInDoEvento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const evento = await catalogoPublicoRepository.buscarPorId(id);
  if (!evento) notFound();

  const painel = await montarPainelDaPortaria(
    inscricoesRepository,
    evento.id,
    new Date(),
  );

  return <PortariaDoEvento eventoId={evento.id} painelInicial={painel} />;
}
