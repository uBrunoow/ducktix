import type { Route } from 'next';
import Link from 'next/link';
import { Marca } from '@/components/marca';
import { Filete } from '@/components/moldura';

const COLUNAS = [
  {
    titulo: 'Descobrir',
    links: [
      { rotulo: 'Todos os eventos', href: '/events' },
      { rotulo: 'Esta semana', href: '/events?quando=semana' },
      { rotulo: 'Entrada gratuita', href: '/events?preco=gratuito' },
    ],
  },
  {
    titulo: 'Organizar',
    links: [
      { rotulo: 'Criar evento', href: '/organizer/events/new' },
      { rotulo: 'Painel do organizador', href: '/organizer' },
    ],
  },
  {
    titulo: 'Conta',
    links: [
      { rotulo: 'Entrar', href: '/login' },
      { rotulo: 'Criar conta', href: '/register' },
      { rotulo: 'Meus ingressos', href: '/my-tickets' },
    ],
  },
] as const satisfies readonly { titulo: string; links: readonly { rotulo: string; href: Route }[] }[];

export function Rodape() {
  return (
    <>
      <Filete />
      <footer className="px-5 py-14 md:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Marca />
              <span className="display text-lg">Ducktix</span>
            </Link>
            <p className="mt-3 max-w-[34ch] text-sm text-fg-muted">
              Gestão de eventos, ingressos e participantes — do rascunho ao
              relatório de presença.
            </p>
          </div>

          {COLUNAS.map((coluna) => (
            <nav key={coluna.titulo} aria-label={coluna.titulo}>
              <p className="text-sm font-semibold">{coluna.titulo}</p>
              <ul className="mt-3 grid gap-2">
                {coluna.links.map((link) => (
                  <li key={link.rotulo}>
                    <Link
                      href={link.href}
                      className="text-sm text-fg-muted transition-colors duration-150 hover:text-brand-ink"
                    >
                      {link.rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-12 border-t border-line pt-6 text-xs text-fg-muted">
          Ducktix · projeto acadêmico de Banco de Dados (UDESC) · os eventos
          exibidos são dados de demonstração
        </p>
      </footer>
    </>
  );
}
