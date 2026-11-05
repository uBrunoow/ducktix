import { dataHoraNoBrasil } from '@/lib/fuso-horario';
import { notFound } from 'next/navigation';
import { CabecalhoDePagina } from '@/components/organizer/cabecalho-de-pagina';
import { ingressosVendidos } from '@/server/event/domain/evento';
import { mongoCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/mongo-catalogo';
import { FormularioEditarEvento } from './formulario-editar-evento';
import { ZonaDeRisco } from './zona-de-risco';

export const dynamic = 'force-dynamic';

export default async function PaginaDeEditarEvento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const evento = await catalogoPublicoRepository.buscarPorId(id);
  if (!evento) notFound();

  const eventos = await catalogoPublicoRepository.listarTodos();
  const categorias = [...new Set(eventos.map((e) => e.categoria))].sort();

  return (
    <div className="grid gap-6">
      <CabecalhoDePagina
        titulo="Editar evento"
        voltar={{ href: `/organizer/events/${evento.id}`, rotulo: evento.nome }}
        descricao="Preço, vagas e lotes não são editados aqui — mexer neles com ingresso já vendido é outro processo."
      />

      <FormularioEditarEvento
        eventoId={evento.id}
        categorias={categorias}
        valoresIniciais={{
          nome: evento.nome,
          modalidade: evento.modalidade,
          formatoOnline: evento.formatoOnline ?? undefined,
          categoria: evento.categoria,
          local: evento.local ?? '',
          comecaEm: dataHoraNoBrasil(evento.comecaEm),
          terminaEm: dataHoraNoBrasil(evento.terminaEm),
          imagemUrl: evento.imagemUrl,
          descricao: evento.descricao,
          visibilidade: evento.visibilidade,
        }}
      />

      <ZonaDeRisco
        eventoId={evento.id}
        status={evento.status}
        podeExcluir={ingressosVendidos(evento) === 0}
      />
    </div>
  );
}
