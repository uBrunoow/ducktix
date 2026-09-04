import { z } from 'zod';

const cpfCnpjSomenteDigitos = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length === 11 || v.length === 14, 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');

export const esquemaPerfil = z.object({
  nome: z.string().trim().min(2, 'Informe o seu nome.').max(120, 'Nome longo demais.'),
  email: z.email('Informe um e-mail válido.').trim().max(254, 'E-mail longo demais.'),
  cpfCnpj: cpfCnpjSomenteDigitos,
});

const senha = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres.')
  .max(200, 'Senha longa demais.');

export const esquemaSenha = z
  .object({
    senhaAtual: z.string().min(1, 'Informe a senha atual.'),
    novaSenha: senha,
    confirmacao: z.string(),
  })
  .refine((valores) => valores.novaSenha === valores.confirmacao, {
    message: 'As senhas não conferem.',
    path: ['confirmacao'],
  });

export type DadosPerfil = z.infer<typeof esquemaPerfil>;
export type DadosSenha = z.infer<typeof esquemaSenha>;
