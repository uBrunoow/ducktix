import { z } from 'zod';

/**
 * O método já foi escolhido na Etapa 1 — aqui só se executa o instrumento
 * dele. Campos de cartão só existem/validam quando o pedido usa "cartao";
 * Pix e boleto não pedem nada além de confirmar (mock).
 */
export const esquemaPagamentoComCartao = z.object({
  numeroCartao: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length >= 12, 'Número do cartão inválido.'),
  nomeNoCartao: z.string().trim().min(2, 'Informe o nome impresso no cartão.'),
  validade: z.string().trim().regex(/^\d{2}\/\d{2}$/, 'Use o formato MM/AA.'),
  cvv: z.string().trim().min(3, 'CVV inválido.').max(4, 'CVV inválido.'),
});

export type DadosPagamentoComCartao = z.input<typeof esquemaPagamentoComCartao>;
