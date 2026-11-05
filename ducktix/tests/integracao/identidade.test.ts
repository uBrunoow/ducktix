import { describe, expect, it } from 'vitest';
import { colecoes } from '@/server/db/colecoes';
import { mongoUsuariosRepository as usuarios } from '@/server/identity/infrastructure/mongo-usuarios';
import { criarUsuario, usarBancoLimpo } from './apoio';

usarBancoLimpo();

describe('usuarios (identidade)', () => {
  it('cria e lê por e-mail e por id', async () => {
    const criado = await usuarios.criar({
      nome: 'Bruno',
      email: 'bruno@ducktix.com',
      papel: 'organizador',
      senhaHash: 'hash',
    });

    expect(await usuarios.buscarPorEmail('bruno@ducktix.com')).toEqual(criado);
    expect(await usuarios.buscarPorId(criado.id)).toEqual(criado);
    expect(criado).toMatchObject({ cpfCnpj: null, fotoUrl: null, papel: 'organizador' });
  });

  it('devolve null para id e e-mail inexistentes', async () => {
    expect(await usuarios.buscarPorId('nao-existe')).toBeNull();
    expect(await usuarios.buscarPorEmail('ninguem@ducktix.com')).toBeNull();
  });

  it('recusa e-mail repetido pelo índice único (antigo UNIQUE)', async () => {
    const dados = { nome: 'A', email: 'repetido@ducktix.com', papel: 'participante' as const, senhaHash: 'h' };
    await usuarios.criar(dados);
    await expect(usuarios.criar(dados)).rejects.toMatchObject({ code: 11000 });
  });

  it('atualiza nome, e-mail, documento, foto e senha', async () => {
    const usuario = await criarUsuario();
    await usuarios.atualizarNome(usuario.id, 'Novo Nome');
    await usuarios.atualizarEmail(usuario.id, 'novo@ducktix.com');
    await usuarios.atualizarCpfCnpj(usuario.id, '52998224725');
    await usuarios.atualizarFoto(usuario.id, 'https://exemplo.com/foto.png');
    await usuarios.atualizarSenha(usuario.id, 'outro-hash');

    expect(await usuarios.buscarPorId(usuario.id)).toMatchObject({
      nome: 'Novo Nome',
      email: 'novo@ducktix.com',
      cpfCnpj: '52998224725',
      fotoUrl: 'https://exemplo.com/foto.png',
      senhaHash: 'outro-hash',
    });
  });

  it('falha ao atualizar usuário inexistente', async () => {
    await expect(usuarios.atualizarNome('nao-existe', 'X')).rejects.toThrow('Usuário não encontrado.');
  });

  it('o validador $jsonSchema recusa documento fora das regras (antigo CHECK)', async () => {
    const usuario = await criarUsuario();
    // CPF/CNPJ precisa ter 11 ou 14 dígitos — era o ck_usuario_documento.
    await expect(usuarios.atualizarCpfCnpj(usuario.id, '123')).rejects.toMatchObject({ code: 121 });
    // Papel fora do enum — era o ck_usuario_papel.
    await expect(
      colecoes.usuarios().updateOne({ _id: usuario.id }, { $set: { papel: 'admin' } }),
    ).rejects.toMatchObject({ code: 121 });
  });

  it('cria, encontra e invalida token de redefinição de senha', async () => {
    const usuario = await criarUsuario();
    const token = await usuarios.criarTokenDeRedefinicao(usuario.id);

    expect(token.expiraEm.getTime()).toBeGreaterThan(Date.now());
    expect(await usuarios.buscarTokenDeRedefinicao(token.token)).toEqual(token);

    await usuarios.invalidarTokenDeRedefinicao(token.token);
    expect(await usuarios.buscarTokenDeRedefinicao(token.token)).toBeNull();
  });
});
