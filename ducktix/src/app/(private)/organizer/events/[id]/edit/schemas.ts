import { z } from 'zod';

/**
 * Edição de evento. Duas diferenças propositais em relação à criação:
 *
 * 1. Não inclui lotes — mexer em preço e vagas de um lote que já vendeu
 *    ingresso é outro processo de negócio (reembolso, remanejamento), não um
 *    campo de formulário. Ver `atualizarEvento`.
 * 2. O local é um campo de texto único, não o endereço estruturado da
 *    criação. `Evento.local` é uma string no domínio, e não dá para
 *    reconstruir com segurança CEP/número/bairro a partir de "Joinville · SC"
 *    — um formulário que finge conseguir apagaria dado do organizador.
 */
export const esquemaEditarEvento = z
  .object({
    nome: z.string().trim().min(3, 'Informe o nome do evento.').max(140, 'Nome longo demais.'),
    modalidade: z.enum(['presencial', 'online', 'hibrido']),
    formatoOnline: z
      .enum(['ao-vivo', 'videoconferencia', 'desafio-virtual', 'conteudo-digital'])
      .optional(),
    categoria: z.string().min(1, 'Selecione uma categoria.'),
    local: z.string().trim().max(160, 'Local longo demais.').optional(),
    comecaEm: z.string().min(1, 'Informe a data e hora de início.'),
    terminaEm: z.string().min(1, 'Informe a data e hora de término.'),
    imagemUrl: z.string().nullable().default(null),
    descricao: z
      .string()
      .trim()
      .min(1, 'Descreva o evento.')
      .refine(
        (html) => html.replace(/<[^>]+>/g, '').trim().length >= 10,
        'Descreva o evento com um pouco mais de detalhe.',
      ),
    visibilidade: z.enum(['publico', 'nao-listado']),
  })
  .superRefine((valores, ctx) => {
    if (valores.modalidade !== 'online' && !valores.local?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Eventos presenciais ou híbridos precisam de um local.',
        path: ['local'],
      });
    }
    if (valores.modalidade !== 'presencial' && !valores.formatoOnline) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecione o formato da parte online do evento.',
        path: ['formatoOnline'],
      });
    }
    if (valores.comecaEm && valores.terminaEm && valores.terminaEm <= valores.comecaEm) {
      ctx.addIssue({
        code: 'custom',
        message: 'O término precisa ser depois do início.',
        path: ['terminaEm'],
      });
    }
  });

export type DadosEditarEvento = z.input<typeof esquemaEditarEvento>;
