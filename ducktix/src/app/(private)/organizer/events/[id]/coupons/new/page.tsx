import { notFound } from 'next/navigation';
import { CabecalhoDePagina } from '@/components/organizer/cabecalho-de-pagina';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { FormularioCriarCupomDoEvento } from './formulario-criar-cupom-do-evento';

export const dynamic = 'force-dynamic';

export default async function NovoCupomDoEvento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const evento = await catalogoPublicoRepository.buscarPorId(id);
  if (!evento) notFound();

  return (
    <div className="grid gap-6">
      <CabecalhoDePagina
        titulo="Criar cupom"
        voltar={{ href: `/organizer/events/${evento.id}/coupons`, rotulo: 'Cupons' }}
        descricao={`Este código vale só para ${evento.nome}.`}
      />

      <FormularioCriarCupomDoEvento eventoId={evento.id} />
    </div>
  );
}
