import { redirect } from 'next/navigation';
import {
  CabecalhoOrganizador,
  type EventoNoSeletor,
} from '@/components/organizer/cabecalho-organizador';
import { Moldura } from '@/components/moldura';
import { drizzleCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/drizzle-catalogo';
import { drizzleUsuariosRepository as usuariosRepository } from '@/server/identity/infrastructure/drizzle-usuarios';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';

/**
 * Shell do back-office: a mesma moldura da vitrine (filetes verticais +
 * gutters hachurados), com o header pill trocado pelo `CabecalhoOrganizador`
 * — decisão do usuário de dar uma casa única ao produto em vez de duas
 * gramáticas visuais (vitrine emoldurada vs. back-office de sidebar). A
 * navegação de seção vive nas abas de cada evento (`AbasDoEvento`), não
 * mais numa barra lateral.
 */
const CONTRATO_DE_DIRECAO = `
IMPECCABLE DIRECTION CONTRACT — /organizer (back-office)

THESIS: uma casa só. O back-office deixa de ter gramática própria de
"ferramenta densa com sidebar" e passa a viver dentro da mesma moldura da
vitrine — filetes verticais, gutters hachurados, header pill flutuante — só
trocando o que o header oferece: seletor de evento e "Meus eventos" no lugar
do menu de visitante.

OWN-WORLD: mesmo sistema de tokens, mesma moldura, mesmo header pill. A
navegação de dentro de um evento é em abas no topo do conteúdo, não mais
numa sidebar — um menu a menos duplicando a mesma informação.

STORY: o organizador reconhece a mesma casa que o visitante via na vitrine;
o CTA "Criar evento" nunca sai de vista.

FIRST VIEWPORT: moldura com header pill (marca, seletor de evento, "Meus
eventos", CTA "Criar evento" em destaque); conteúdo com cabeçalho da página
e uma fileira de números.

FORM: reaproveita a moldura da vitrine; sidebar removida por decisão
explícita do usuário.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.
`;

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await sessaoAtual();
  // O middleware já bloqueia quem não é organizador antes de chegar aqui;
  // esta checagem é defesa em profundidade, não a única fechadura.
  if (!sessao || sessao.papel !== 'organizador') redirect('/');
  const usuario = await usuariosRepository.buscarPorId(sessao.usuarioId);

  // O seletor de contexto do header precisa da lista inteira, e ela é lida
  // no layout (não em cada página) para trocar de evento sem recarregar a
  // navegação. Só os campos que o seletor desenha atravessam a fronteira
  // servidor→cliente: o header não recebe objeto de domínio.
  const agora = new Date();
  const eventos: readonly EventoNoSeletor[] = (
    await catalogoPublicoRepository.listarDoOrganizador(sessao.usuarioId)
  ).map((evento) => ({
    id: evento.id,
    nome: evento.nome,
    quando: dataCurta.format(evento.comecaEm),
    jaAconteceu: agora >= evento.comecaEm,
    rascunho: evento.status === 'rascunho',
  }));

  return (
    <Moldura>
      <div dangerouslySetInnerHTML={{ __html: `<!--${CONTRATO_DE_DIRECAO}-->` }} />

      <CabecalhoOrganizador
        eventos={eventos}
        usuario={
          usuario
            ? { nome: usuario.nome, email: usuario.email, fotoUrl: usuario.fotoUrl }
            : null
        }
      />

      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </Moldura>
  );
}
