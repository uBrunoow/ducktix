import { z } from 'zod';

export const esquemaLoteDoEvento = z
  .object({
    nome: z.string().trim().min(2, 'Informe o nome do lote.').max(60, 'Nome longo demais.'),
    gratuito: z.boolean().default(false),
    precoReais: z.coerce.number().min(0, 'Preço não pode ser negativo.'),
    vagas: z.coerce.number().int().min(1, 'Informe ao menos 1 vaga.'),
    iniciaEm: z.string().trim().optional(),
    encerraEm: z.string().trim().optional(),
  })
  .superRefine((dados, contexto) => {
    if (!dados.gratuito && dados.precoReais <= 0) {
      contexto.addIssue({
        code: 'custom',
        message: 'Informe um preço maior que zero, ou marque como gratuito.',
        path: ['precoReais'],
      });
    }
    if (dados.iniciaEm && dados.encerraEm && dados.encerraEm <= dados.iniciaEm) {
      contexto.addIssue({
        code: 'custom',
        message: 'O fim das vendas precisa ser depois do início.',
        path: ['encerraEm'],
      });
    }
  });

export type DadosLoteDoEvento = z.input<typeof esquemaLoteDoEvento>;
