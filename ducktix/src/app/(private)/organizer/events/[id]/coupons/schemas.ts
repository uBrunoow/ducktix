import { z } from 'zod';

export const esquemaCriarCupomDoEvento = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(3, 'O código precisa de ao menos 3 caracteres.')
      .max(24, 'Código longo demais.')
      .regex(/^[A-Za-z0-9]+$/, 'Use apenas letras e números — sem espaço ou acento.'),
    tipoDesconto: z.enum(['percentual', 'fixo']),
    /** Percentual (1–100) ou valor em reais, conforme `tipoDesconto`. */
    valor: z.coerce.number().positive('Informe um valor maior que zero.'),
    validoDe: z.string().min(1, 'Informe a data inicial.'),
    validoAte: z.string().min(1, 'Informe a data final.'),
    limiteDeUso: z.coerce.number().int().min(1, 'O limite precisa ser de ao menos 1 uso.'),
  })
  .superRefine((valores, ctx) => {
    if (valores.tipoDesconto === 'percentual' && valores.valor > 100) {
      ctx.addIssue({
        code: 'custom',
        message: 'Um desconto percentual não pode passar de 100%.',
        path: ['valor'],
      });
    }
    if (valores.validoDe && valores.validoAte && valores.validoAte < valores.validoDe) {
      ctx.addIssue({
        code: 'custom',
        message: 'A data final precisa ser depois da inicial.',
        path: ['validoAte'],
      });
    }
  });

/** Tipo de ENTRADA — `z.coerce.number()` aceita string no formulário. */
export type DadosCriarCupomDoEvento = z.input<typeof esquemaCriarCupomDoEvento>;
