import { z } from 'zod';

/**
 * Fonte única de validação das telas de conta. O mesmo objeto alimenta o
 * `zodResolver` no cliente e o `parse` dentro da Server Action — validação de
 * cliente é conveniência, a do servidor é a que vale, e as duas não podem
 * divergir por serem duas cópias da mesma regra.
 */

const email = z
  .email('Informe um e-mail válido.')
  .trim()
  .max(254, 'E-mail longo demais.');

const senha = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres.')
  .max(200, 'Senha longa demais.');

export const esquemaLogin = z.object({
  email,
  senha: z.string().min(1, 'Informe a sua senha.'),
});

export const esquemaRegistro = z.object({
  nome: z.string().trim().min(2, 'Informe o seu nome.').max(120, 'Nome longo demais.'),
  email,
  senha,
  papel: z.enum(['participante', 'organizador']),
});

export const esquemaEsqueciSenha = z.object({ email });

export const esquemaRedefinicao = z
  .object({
    token: z.string().min(1, 'Link de redefinição inválido.'),
    senha,
    confirmacao: z.string(),
  })
  .refine((valores) => valores.senha === valores.confirmacao, {
    message: 'As senhas não conferem.',
    path: ['confirmacao'],
  });

export type DadosLogin = z.infer<typeof esquemaLogin>;
export type DadosRegistro = z.infer<typeof esquemaRegistro>;
export type DadosEsqueciSenha = z.infer<typeof esquemaEsqueciSenha>;
export type DadosRedefinicao = z.infer<typeof esquemaRedefinicao>;
