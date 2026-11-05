import { notFound } from 'next/navigation';
import { PortariaDoEvento } from '@/components/organizer/portaria/portaria-do-evento';
import { mongoCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/mongo-catalogo';
import { montarPainelDaPortaria } from '@/server/participation/application/check-in';
import { mongoInscricoesRepository as inscricoesRepository } from '@/server/participation/infrastructure/mongo-inscricoes';

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
