import { z } from 'zod';

export const esquemaLote = z
  .object({
    nome: z.string().trim().min(2, 'Informe o nome do lote.').max(60, 'Nome longo demais.'),
    /** Cada lote decide por conta própria — o Lote 1 pode ser gratuito e o
     *  Lote 2 pago, ou os dois pagos com preços diferentes (desconto de
     *  lançamento, aumento progressivo etc). */
    gratuito: z.boolean().default(false),
    precoReais: z.coerce.number().min(0, 'Preço não pode ser negativo.'),
    vagas: z.coerce.number().int().min(1, 'Informe ao menos 1 vaga.'),
    /** Data (YYYY-MM-DD) opcional — sem início, o lote vende desde que o
     *  evento é publicado. É o caso do lote único e do primeiro da fila. */
    iniciaEm: z.string().trim().optional(),
    /** Data (YYYY-MM-DD) opcional — lote sem prazo fica aberto até o evento. */
    encerraEm: z.string().trim().optional(),
  })
  .superRefine((valores, ctx) => {
    if (!valores.gratuito && valores.precoReais <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Informe um preço maior que zero, ou marque como gratuito.', path: ['precoReais'] });
    }
    // Comparação de string funciona porque o formato é YYYY-MM-DD, que é
    // ordenável lexicograficamente — o mesmo truque usado em comecaEm/terminaEm.
    if (valores.iniciaEm && valores.encerraEm && valores.encerraEm <= valores.iniciaEm) {
      ctx.addIssue({ code: 'custom', message: 'O encerramento precisa ser depois da abertura.', path: ['encerraEm'] });
    }
  });

export const esquemaEndereco = z.object({
  cep: z.string().trim().optional(),
  logradouro: z.string().trim().optional(),
  numero: z.string().trim().optional(),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().optional(),
  cidade: z.string().trim().optional(),
  uf: z.string().trim().optional(),
});

export const esquemaCriarEvento = z
  .object({
    nome: z.string().trim().min(3, 'Informe o nome do evento.').max(140, 'Nome longo demais.'),
    modalidade: z.enum(['presencial', 'online', 'hibrido']),
    formatoOnline: z.enum(['ao-vivo', 'videoconferencia', 'desafio-virtual', 'conteudo-digital']).optional(),
    categoria: z.string().min(1, 'Selecione uma categoria.'),
    endereco: esquemaEndereco,
    comecaEm: z.string().min(1, 'Informe a data e hora de início.'),
    terminaEm: z.string().min(1, 'Informe a data e hora de término.'),
    imagemUrl: z.string().nullable().default(null),
    descricao: z
      .string()
      .trim()
      .min(1, 'Descreva o evento.')
      .refine((html) => html.replace(/<[^>]+>/g, '').trim().length >= 10, 'Descreva o evento com um pouco mais de detalhe.'),
    lotes: z.array(esquemaLote).min(1, 'Adicione ao menos um lote de ingresso.'),
    visibilidade: z.enum(['publico', 'nao-listado']),
    aceiteTermos: z.literal(true, {
      message: 'É preciso aceitar os termos de uso e a política da Ducktix.',
    }),
  })
  .superRefine((valores, ctx) => {
    if (valores.modalidade !== 'online') {
      if (!valores.endereco.logradouro) {
        ctx.addIssue({ code: 'custom', message: 'Informe o endereço.', path: ['endereco', 'logradouro'] });
      }
      if (!valores.endereco.cidade) {
        ctx.addIssue({ code: 'custom', message: 'Informe a cidade.', path: ['endereco', 'cidade'] });
      }
      if (!valores.endereco.uf) {
        ctx.addIssue({ code: 'custom', message: 'Informe a UF.', path: ['endereco', 'uf'] });
      }
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
    // A janela de venda tem que caber antes do evento: um lote que só abre
    // depois da porta fechar nunca vende nada.
    const diaDoEvento = valores.comecaEm?.slice(0, 10);
    if (diaDoEvento) {
      valores.lotes.forEach((lote, indice) => {
        if (lote.iniciaEm && lote.iniciaEm > diaDoEvento) {
          ctx.addIssue({
            code: 'custom',
            message: 'A venda precisa abrir antes do evento começar.',
            path: ['lotes', indice, 'iniciaEm'],
          });
        }
      });
    }
  });

/**
 * Tipo de ENTRADA do schema, não de saída: `z.coerce.number()` aceita
 * string/number no formulário e só normaliza para `number` depois do
 * parse. Usar `z.infer` (saída) aqui faz o `Resolver` do RHF não bater com
 * `useForm<DadosCriarEvento>`.
 */
export type DadosCriarEvento = z.input<typeof esquemaCriarEvento>;

/** Compõe o endereço num único texto de exibição — `Evento.local` no
 *  domínio continua sendo uma string, o detalhe estruturado é só desta
 *  tela (fica em memória; migrará para colunas próprias no Postgres). */
export function enderecoParaTexto(endereco: z.infer<typeof esquemaEndereco>): string {
  const rua = [endereco.logradouro, endereco.numero].filter(Boolean).join(', ');
  const partes = [rua, endereco.bairro, endereco.cidade && endereco.uf ? `${endereco.cidade} · ${endereco.uf}` : endereco.cidade || endereco.uf];
  return partes.filter(Boolean).join(' · ');
}

/** Campos de cada passo do wizard — usado para validar só o passo atual
 *  antes de deixar avançar (`formulario.trigger(CAMPOS_DO_PASSO[n])`). */
export const CAMPOS_DO_PASSO = [
  ['nome', 'modalidade', 'formatoOnline', 'categoria', 'endereco', 'comecaEm', 'terminaEm'],
  ['imagemUrl', 'descricao'],
  ['lotes'],
  ['visibilidade', 'aceiteTermos'],
] as const;
