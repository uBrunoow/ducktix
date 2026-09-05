import { notFound, redirect } from 'next/navigation';
import { Cabecalho } from '@/components/cabecalho';
import { CabecalhoDoCheckout } from '@/components/checkout/cabecalho-do-checkout';
import { Faixa, Filete, Moldura } from '@/components/moldura';
import { Rodape } from '@/components/rodape';
import { drizzlePedidosRepository as pedidosRepository } from '@/server/ticketing/infrastructure/drizzle-pedidos';
import { drizzleCupomRepository as cupomRepository } from '@/server/ticketing/infrastructure/drizzle-cupons';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { totalComDescontoCentavos, totalDeUnidades } from '@/server/ticketing/domain/pedido';
import { drizzleUsuariosRepository as usuariosRepository } from '@/server/identity/infrastructure/drizzle-usuarios';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { FormularioParticipantes } from './formulario-participantes';
import { ResumoDoPedido } from './resumo-do-pedido';

export const dynamic = 'force-dynamic';

export default async function PaginaDeCheckout({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) redirect(`/login?next=${encodeURIComponent(`/checkout/${id}`)}`);

  const pedido = await pedidosRepository.buscarPorId(id);
  if (!pedido) notFound();
  if (pedido.participanteId !== sessao.usuarioId) notFound();
  if (pedido.status !== 'aberto') redirect(`/checkout/${id}/thank-you`);

  const usuario = await usuariosRepository.buscarPorId(sessao.usuarioId);
  const cupom = pedido.cupomId ? await cupomRepository.buscarPorId(pedido.cupomId) : null;

  const itensComEvento = await Promise.all(
    pedido.itens.map(async (item) => {
      const evento = await catalogoPublicoRepository.buscarPorId(item.eventoId);
      const lote = evento?.lotes.find((l) => l.id === item.loteId);
      return { item, evento: evento ?? null, loteNome: lote?.nome ?? '—' };
    }),
  );

  const eventoPrincipal = itensComEvento[0]?.evento ?? null;

  return (
    <Moldura>
      <Cabecalho />
      <Faixa className="py-10 md:py-14">
        <CabecalhoDoCheckout
          passoAtual={0}
          titulo="Quem vai participar"
          descricao="Um ingresso por participante — os dados vão no crachá e no e-mail de confirmação."
          evento={eventoPrincipal}
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
          <FormularioParticipantes
            pedidoId={pedido.id}
            totalDeUnidades={totalDeUnidades(pedido)}
            usuarioNome={usuario?.nome ?? ''}
            usuarioEmail={usuario?.email ?? ''}
            gratuito={totalComDescontoCentavos(pedido, cupom) === 0}
          />

          <ResumoDoPedido pedido={pedido} cupom={cupom} itensComEvento={itensComEvento} />
        </div>
      </Faixa>
      <Filete />
      <Rodape />
    </Moldura>
  );
}
