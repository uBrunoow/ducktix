import { z } from 'zod';

export const esquemaLoteDoEvento = z
  .object({
    nome: z.string().trim().min(2, 'Informe o nome do lote.').max(60, 'Nome longo demais.'),
    precoReais: z.coerce.number().min(0, 'Preço não pode ser negativo.'),
    vagas: z.coerce.number().int().min(1, 'Informe ao menos 1 vaga.'),
    iniciaEm: z.string().trim().optional(),
    encerraEm: z.string().trim().optional(),
  })
  .refine(
    (dados) => !dados.iniciaEm || !dados.encerraEm || dados.encerraEm > dados.iniciaEm,
    { message: 'O fim das vendas precisa ser depois do início.', path: ['encerraEm'] },
  );

export type DadosLoteDoEvento = z.input<typeof esquemaLoteDoEvento>;
