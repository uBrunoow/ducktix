'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, BarcodeIcon, CreditCardIcon, QrCodeIcon } from 'lucide-react';
import Link from 'next/link';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { BotaoCopiar } from '@/components/botao-copiar';
import { QrSvg } from '@/components/codigo-qr';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';
import type { MetodoDePagamento } from '@/server/ticketing/domain/pedido';
import { acaoConfirmarPedido } from './acoes';
import { type DadosPagamentoComCartao, esquemaPagamentoComCartao } from './schemas';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dataLonga = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' });

const ROTULO_METODO: Record<MetodoDePagamento, string> = {
  cartao: 'Cartão de crédito',
  pix: 'Pix',
  boleto: 'Boleto bancário',
};

const ICONE_METODO: Record<MetodoDePagamento, typeof QrCodeIcon> = {
  cartao: CreditCardIcon,
  pix: QrCodeIcon,
  boleto: BarcodeIcon,
};

export function FormularioPagamento({
  pedidoId,
  metodo,
  totalCentavos,
  codigoPix,
  qrPixSvg,
  linhaDigitavel,
  vencimento,
}: {
  pedidoId: string;
  metodo: MetodoDePagamento;
  totalCentavos: number;
  codigoPix: string;
  qrPixSvg: string;
  linhaDigitavel: string;
  vencimento: string;
}) {
  const [confirmando, iniciarTransicaoConfirmar] = useTransition();

  const formularioCartao = useForm<DadosPagamentoComCartao>({
    resolver: zodResolver(esquemaPagamentoComCartao),
    defaultValues: { numeroCartao: '', nomeNoCartao: '', validade: '', cvv: '' },
  });

  function confirmar() {
    iniciarTransicaoConfirmar(async () => {
      const resposta = await acaoConfirmarPedido(pedidoId);
      // Sucesso não retorna: a Server Action redireciona para o thank-you.
      if (resposta?.erro) toast.error(resposta.erro);
    });
  }

  const confirmarComCartao = formularioCartao.handleSubmit(() => confirmar());
  const Icone = ICONE_METODO[metodo];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-chip border border-line bg-surface px-3 py-1.5 text-[13px] font-medium">
          <Icone className="size-3.5 text-fg-muted" strokeWidth={1.75} aria-hidden="true" />
          {ROTULO_METODO[metodo]}
        </span>
        <Link
          href={`/checkout/${pedidoId}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden="true" />
          Trocar meio de pagamento
        </Link>
      </div>

      {metodo === 'cartao' ? (
        <Form {...formularioCartao}>
          <form
            onSubmit={confirmarComCartao}
            noValidate
            className="grid gap-4 rounded-card border border-line bg-surface p-6 shadow-card"
          >
            <FormField
              control={formularioCartao.control}
              name="numeroCartao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do cartão</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="0000 0000 0000 0000"
                      className="tabular-nums"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formularioCartao.control}
              name="nomeNoCartao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome impresso no cartão</FormLabel>
                  <FormControl>
                    <Input autoComplete="cc-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={formularioCartao.control}
                name="validade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="cc-exp"
                        placeholder="MM/AA"
                        className="tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formularioCartao.control}
                name="cvv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CVV</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="000"
                        className="tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <LoadingButton
              type="submit"
              size="lg"
              loading={confirmando}
              loadingText="Confirmando…"
              className="mt-1 w-full sm:w-fit"
            >
              Pagar {moeda.format(totalCentavos / 100)}
            </LoadingButton>
          </form>
        </Form>
      ) : null}

      {metodo === 'pix' ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-8">
            <div className="mx-auto rounded-[calc(var(--r-card)-0.4rem)] border border-line bg-surface p-4 sm:mx-0">
              <QrSvg svg={qrPixSvg} tamanho={168} rotulo="QR code do Pix para pagamento" />
            </div>

            <div>
              <p className="display m-0 text-lg">Escaneie para pagar</p>
              <p className="mt-1.5 text-[13px] leading-[1.6] text-fg-muted">
                Abra o app do seu banco, escolha Pix e aponte a câmera para o código. Ou use o
                Pix copia e cola abaixo.
              </p>

              <p className="mt-4 text-xs text-fg-muted">Valor</p>
              <p className="display text-2xl tabular-nums">{moeda.format(totalCentavos / 100)}</p>

              <div className="mt-4">
                <p className="break-all rounded-lg border border-line bg-surface-2 p-3 font-mono text-[11px] leading-[1.5] text-fg-muted">
                  {codigoPix}
                </p>
                <BotaoCopiar
                  valor={codigoPix}
                  rotulo="Copiar código Pix"
                  rotuloCopiado="Código copiado"
                  className="mt-3 w-full sm:w-fit"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-line px-6 py-5">
            <p className="text-[13px] text-fg-muted">
              Assim que o pagamento cair, o pedido é confirmado e os ingressos são emitidos
              automaticamente.{' '}
              <span className="font-medium text-fg">
                Este é um ambiente de demonstração — o código acima não é cobrável;
              </span>{' '}
              use o botão abaixo para simular a confirmação.
            </p>
            <LoadingButton
              type="button"
              size="lg"
              loading={confirmando}
              loadingText="Confirmando…"
              onClick={confirmar}
              className="mt-4 w-full sm:w-fit"
            >
              Já paguei
            </LoadingButton>
          </div>
        </div>
      ) : null}

      {metodo === 'boleto' ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <div className="p-6">
            <p className="display m-0 text-lg">Boleto gerado</p>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-fg-muted">
              Pague pelo app do seu banco, internet banking ou em qualquer agência lotérica.
            </p>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-fg-muted">Valor</dt>
                <dd className="display text-2xl tabular-nums">
                  {moeda.format(totalCentavos / 100)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-fg-muted">Vencimento</dt>
                <dd className="display text-2xl">{vencimento}</dd>
              </div>
            </dl>

            <p className="mt-5 text-xs text-fg-muted">Linha digitável</p>
            <p className="mt-1.5 rounded-lg border border-line bg-surface-2 p-3 font-mono text-[13px] leading-[1.6] tabular-nums">
              {linhaDigitavel}
            </p>
            <BotaoCopiar
              valor={linhaDigitavel.replace(/\D/g, '')}
              rotulo="Copiar linha digitável"
              rotuloCopiado="Linha copiada"
              className="mt-3 w-full sm:w-fit"
            />
          </div>

          <div className="border-t border-line px-6 py-5">
            <p className="text-[13px] text-fg-muted">
              A confirmação costuma levar até 2 dias úteis após o pagamento.{' '}
              <span className="font-medium text-fg">
                Este é um ambiente de demonstração — o boleto acima não é cobrável;
              </span>{' '}
              use o botão abaixo para simular a compensação.
            </p>
            <LoadingButton
              type="button"
              size="lg"
              loading={confirmando}
              loadingText="Confirmando…"
              onClick={confirmar}
              className="mt-4 w-full sm:w-fit"
            >
              Simular pagamento do boleto
            </LoadingButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
