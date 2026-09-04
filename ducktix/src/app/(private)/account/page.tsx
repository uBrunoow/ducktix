import { redirect } from 'next/navigation';
import { Cabecalho } from '@/components/cabecalho';
import { Faixa, Filete, Moldura, Rotulo } from '@/components/moldura';
import { Rodape } from '@/components/rodape';
import { rotuloPapel } from '@/server/identity/domain/usuario';
import { drizzleUsuariosRepository as usuariosRepository } from '@/server/identity/infrastructure/drizzle-usuarios';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { DialogAlterarSenha } from './dialog-alterar-senha';
import { FormularioPerfil } from './formulario-perfil';

export const dynamic = 'force-dynamic';

export default async function PaginaDeConta() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login?next=%2Faccount');

  const usuarioExibido = await usuariosRepository.buscarPorId(sessao.usuarioId);
  if (!usuarioExibido) redirect('/login?next=%2Faccount');

  return (
    <Moldura>
      <Cabecalho />
      <Faixa className="py-14 md:py-20">
        <div className="mx-auto">
          <Rotulo>{rotuloPapel(usuarioExibido.papel)}</Rotulo>
          <h1 className="display mt-4 text-[clamp(1.75rem,3.6vw,2.5rem)]">Minha conta</h1>
          <p className="mt-2 text-sm text-fg-muted">Dados pessoais e segurança da sua conta.</p>

          <div className="mt-8 grid gap-6">
            <section className="rounded-card border border-line bg-surface p-6 shadow-card">
              <h2 className="text-sm font-semibold">Dados pessoais</h2>
              <div className="mt-5">
                <FormularioPerfil
                  nomeAtual={usuarioExibido.nome}
                  emailAtual={usuarioExibido.email}
                  cpfCnpjAtual={usuarioExibido.cpfCnpj ?? ''}
                  fotoAtual={usuarioExibido.fotoUrl}
                />
              </div>
            </section>

            <section className="rounded-card border border-line bg-surface p-6 shadow-card">
              <h2 className="text-sm font-semibold">Senha</h2>
              <p className="mt-1.5 text-[13px] text-fg-muted">
                Sua senha fica com um pequeno diálogo próprio, longe dos outros campos.
              </p>
              <div className="mt-4">
                <DialogAlterarSenha />
              </div>
            </section>
          </div>
        </div>
      </Faixa>
      <Filete />
      <Rodape />
    </Moldura>
  );
}
