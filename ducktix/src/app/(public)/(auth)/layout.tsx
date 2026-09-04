/**
 * O grupo (auth) não tem casca própria: cada tela monta a sua com CascaConta.
 * O layout existe só para isolar o segmento — e é onde a direção destas telas
 * fica registrada, no mesmo mecanismo do contrato raiz.
 */
const CONTRATO_DE_DIRECAO = `
IMPECCABLE DIRECTION CONTRACT — /login, /register, /forgot-password,
/reset-password

THESIS: entrar e criar conta é uma tarefa, não uma vitrine — modo Operate. A
composição de duas colunas com painel de arte do mundo anterior foi descartada
junto com aquele mundo: ela vendia a plataforma numa tela onde já se decidiu
usá-la.

OWN-WORLD: o mesmo mundo da vitrine em outra densidade — canvas hachurado,
um card branco raio 1rem sobre ele, Onest no título, campos e botão pill do
sistema. A moldura de filetes não vem para cá: ela é gramática de página de
leitura, e aqui só existe uma tarefa.

STORY: quem chega resolve a tarefa sem distração, e reconhece a plataforma
pelo canvas e pela marca, não por um painel decorativo.

FIRST VIEWPORT: marca no topo à esquerda; card centrado com chip-rótulo,
título, campos e a ação primária em largura total, tudo acima da dobra.

FORM: modo Operate; a expressão fica nos detalhes (chip, hachura, amarelo em
dois papéis), nunca no volume.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.
`;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: `<!--${CONTRATO_DE_DIRECAO}-->` }} />
      {children}
    </>
  );
}
