'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Navegação de dentro de um evento, em abas — não mais na sidebar.
 *
 * Os grupos são os do fluxo de trabalho real do organizador: montar a
 * venda, acompanhar a venda, operar a porta. A mesma ordem que a sidebar
 * usava antes de virar aba (ver histórico de `sidebar.tsx`).
 */
const ABAS = [
  { sufixo: '', rotulo: 'Visão geral' },
  { sufixo: '/lotes', rotulo: 'Lotes' },
  { sufixo: '/coupons', rotulo: 'Cupons' },
  { sufixo: '/orders', rotulo: 'Pedidos' },
  { sufixo: '/cancellations', rotulo: 'Cancelamentos' },
  { sufixo: '/attendees', rotulo: 'Participantes' },
  { sufixo: '/check-in', rotulo: 'Check-in' },
  { sufixo: '/edit', rotulo: 'Configurações' },
] as const;

export function AbasDoEvento({ eventoId }: { eventoId: string }) {
  const pathname = usePathname();
  const base = `/organizer/events/${eventoId}`;

  return (
    <nav
      className="flex gap-5 overflow-x-auto border-b border-line"
      aria-label="Seções do evento"
    >
      {ABAS.map((aba) => {
        const href = `${base}${aba.sufixo}`;
        const ativo =
          aba.sufixo === '' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={aba.sufixo}
            href={href as Route}
            aria-current={ativo ? 'page' : undefined}
            className={cn(
              'shrink-0 border-b-2 px-0.5 py-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-150',
              ativo
                ? 'border-brand-ink text-fg'
                : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
