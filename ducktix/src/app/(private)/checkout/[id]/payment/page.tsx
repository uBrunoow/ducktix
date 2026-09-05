import { notFound, redirect } from 'next/navigation';
import { Cabecalho } from '@/components/cabecalho';
import { CabecalhoDoCheckout } from '@/components/checkout/cabecalho-do-checkout';
import { Faixa, Filete, Moldura } from '@/components/moldura';
import { Rodape } from '@/components/rodape';
import { drizzlePedidosRepository as pedidosRepository } from '@/server/ticketing/infrastructure/drizzle-pedidos';
import { drizzleCupomRepository as cupomRepository } from '@/server/ticketing/infrastructure/drizzle-cupons';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { totalComDescontoCentavos } from '@/server/ticketing/domain/pedido';
import {
  codigoPixSimulado,
  linhaDigitavelSimulada,
  vencimentoDoBoleto,
} from '@/server/ticketing/domain/codigos-simulados';
import { gerarQrSvg } from '@/components/codigo-qr';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { ResumoDoPedido } from '../resumo-do-pedido';
import { FormularioPagamento } from './formulario-pagamento';

export const dynamic = 'force-dynamic';

export default async function PaginaDePagamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) redirect(`/login?next=${encodeURIComponent(`/checkout/${id}/payment`)}`);

  const pedido = await pedidosRepository.buscarPorId(id);
  if (!pedido) notFound();
  if (pedido.participanteId !== sessao.usuarioId) notFound();
  if (pedido.status !== 'aberto') redirect(`/checkout/${id}/thank-you`);
  // Pedidos gratuitos confirmam na primeira etapa e nunca chegam aqui.
  if (!pedido.participantes) redirect(`/checkout/${id}`);

  const cupom = pedido.cupomId ? await cupomRepository.buscarPorId(pedido.cupomId) : null;
  if (totalComDescontoCentavos(pedido, cupom) === 0) {
    redirect(`/checkout/${id}/thank-you`);
  }
  if (!pedido.cobranca || !pedido.metodoPagamento) {
    redirect(`/checkout/${id}`);
  }

  const itensComEvento = await Promise.all(
    pedido.itens.map(async (item) => {
      const evento = await catalogoPublicoRepository.buscarPorId(item.eventoId);
      const lote = evento?.lotes.find((l) => l.id === item.loteId);
      return { item, evento: evento ?? null, loteNome: lote?.nome ?? '—' };
    }),
  );

  const eventoPrincipal = itensComEvento[0]?.evento ?? null;

  const total = totalComDescontoCentavos(pedido, cupom);
  const codigoPix = codigoPixSimulado(pedido.id, total);
  const qrPixSvg = pedido.metodoPagamento === 'pix' ? await gerarQrSvg(codigoPix) : '';
  const vencimento = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
  }).format(vencimentoDoBoleto(new Date()));

  return (
    <Moldura>
      <Cabecalho />
      <Faixa className="py-10 md:py-14">
        <CabecalhoDoCheckout
          passoAtual={1}
          titulo="Pagamento"
          descricao="Assim que o pagamento for confirmado, os ingressos são emitidos automaticamente."
          evento={eventoPrincipal}
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
          <FormularioPagamento
            pedidoId={pedido.id}
            metodo={pedido.metodoPagamento}
            totalCentavos={total}
            codigoPix={codigoPix}
            qrPixSvg={qrPixSvg}
            linhaDigitavel={linhaDigitavelSimulada(pedido.id)}
            vencimento={vencimento}
          />

          <ResumoDoPedido pedido={pedido} cupom={cupom} itensComEvento={itensComEvento} />
        </div>
      </Faixa>
      <Filete />
      <Rodape />
    </Moldura>
  );
}
