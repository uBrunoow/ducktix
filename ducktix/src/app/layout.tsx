import type { Metadata } from 'next';
import { Inter_Tight, Onest } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const display = Onest({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ducktix — ingressos e gestão de eventos',
  description:
    'Publique o evento, venda o ingresso e receba na porta. Do rascunho ao relatório de presença, em um lugar só.',
};

const CONTRATO_DE_DIRECAO = `
IMPECCABLE DIRECTION CONTRACT — mundo visual Ducktix (substituição completa)

THESIS: uma plataforma de eventos vestida com a gramática de um produto de
infraestrutura — densa em dado, calma, com moldura editorial. Recusa o arranjo
padrão da categoria (herói fotográfico full-bleed com capa de show por cima) e
recusa também o mundo anterior deste repositório (mono/quadrado/bento), que foi
descartado por decisão explícita do usuário, não por acidente.

OWN-WORLD: canvas quente #EFF1E7, cards brancos raio 1rem sobre filete hairline,
Onest 600 tracking -0.05em no display, Inter Tight na UI, tudo pill. Amarelo em
dois papéis que nunca se trocam: #FFD400 preenche (texto sempre preto), #7A5C00
é o amarelo como tinta de texto e anel de foco. Reconhecível sem conteúdo pela
MOLDURA: filetes verticais full-bleed em volta da coluna central, gutters
hachurados a 45°, marcadores em cruz nos cruzamentos.

STORY: o visitante entende em segundos que aqui se escolhe entre muitos eventos;
o organizador entende que o back-office é a mesma casa, em outra densidade.

FIRST VIEWPORT: header pill com marca à esquerda e CTA amarelo à direita;
headline bicolor em duas linhas (linha 1 em tinta, linha 2 em #7A5C00); sub em
Inter Tight; par de ações — pill amarelo sólido mais link com seta. Tudo dentro
da moldura, dot-grid atrás.

FORM: direção fixada pelo brief do usuário (design da AbacatePay com o acento
remapeado para amarelo); sorteio de conceito dispensado por pin explícito.
Build code-led: sem gerador de imagem nesta máquina.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable}`}>
      <body>
        <div dangerouslySetInnerHTML={{ __html: `<!--${CONTRATO_DE_DIRECAO}-->` }} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
