import { z } from 'zod';

export const esquemaParticipante = z
  .object({
    nome: z.string().trim().min(2, 'Informe o nome.').max(80, 'Nome longo demais.'),
    sobrenome: z.string().trim().min(2, 'Informe o sobrenome.').max(80, 'Sobrenome longo demais.'),
    cpf: z.string().transform((v) => v.replace(/\D/g, '')).refine((v) => v.length === 11, 'Informe um CPF válido.'),
    email: z.email('Informe um e-mail válido.').trim(),
    confirmarEmail: z.string().trim(),
    nomeCracha: z.string().trim().max(60, 'Nome longo demais.').optional().default(''),
    celular: z.string().trim().min(8, 'Informe um celular válido.'),
    comoConheceu: z.string().trim().optional().default(''),
    // Dados profissionais — todos opcionais.
    linkedin: z.string().trim().optional().default(''),
    github: z.string().trim().optional().default(''),
    empresa: z.string().trim().optional().default(''),
    segmento: z.string().trim().optional().default(''),
    cargo: z.string().trim().optional().default(''),
    nivel: z.string().trim().optional().default(''),
  })
  .refine((valores) => valores.email.toLowerCase() === valores.confirmarEmail.toLowerCase(), {
    message: 'Os e-mails não conferem.',
    path: ['confirmarEmail'],
  });

const cpfSomenteDigitos = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length === 11, 'CPF precisa ter 11 dígitos.');

const cepSomenteDigitos = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length === 8, 'CEP precisa ter 8 dígitos.');

export const esquemaEnderecoDeCobranca = z.object({
  cep: cepSomenteDigitos,
  logradouro: z.string().trim().min(1, 'Informe o endereço.'),
  numero: z.string().trim().min(1, 'Informe o número.'),
  complemento: z.string().trim().optional().default(''),
  bairro: z.string().trim().min(1, 'Informe o bairro.'),
  cidade: z.string().trim().min(1, 'Informe a cidade.'),
  uf: z.string().trim().length(2, 'UF precisa ter 2 letras.'),
});

export const metodosDePagamento = ['cartao', 'pix', 'boleto'] as const;
export type MetodoDePagamento = (typeof metodosDePagamento)[number];

export const esquemaEtapaParticipantes = z.object({
  participantes: z.array(esquemaParticipante).min(1),
  cpf: cpfSomenteDigitos.optional(),
  endereco: esquemaEnderecoDeCobranca.optional(),
  metodoPagamento: z.enum(metodosDePagamento).optional(),
});

export const esquemaAplicarCupom = z.object({
  codigo: z.string().trim().min(1, 'Informe um código de cupom.').max(40),
});

/** Tipo de ENTRADA, não de saída — vários campos usam `.optional().default(...)`,
 *  então o tipo de saída os torna opcionais na leitura mas o formulário
 *  sempre envia string vazia. `z.input` é o que bate com `useForm`. */
export type DadosEtapaParticipantes = z.input<typeof esquemaEtapaParticipantes>;
export type DadosAplicarCupom = z.infer<typeof esquemaAplicarCupom>;
