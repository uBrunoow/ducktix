import type { Route } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MenuIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MenuDaConta } from '@/components/conta/menu-da-conta';
import { Marca, Seta } from '@/components/marca';
import { drizzleUsuariosRepository as usuariosRepository } from '@/server/identity/infrastructure/drizzle-usuarios';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';

/** Header pill flutuante: marca à esquerda, navegação ao centro, CTA à direita. */
export async function Cabecalho() {
  const sessao = await sessaoAtual();
  const usuario = sessao ? await usuariosRepository.buscarPorId(sessao.usuarioId) : null;

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 rounded-full border border-line bg-surface/85 py-2 pl-5 pr-2 shadow-card backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <Marca />
          <span className="display text-lg">Ducktix</span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          <ItemDeMenu href="/events">Eventos</ItemDeMenu>
          <ItemDeMenu href="/organizer">Para organizadores</ItemDeMenu>
          <ItemDeMenu href="/my-tickets">Meus ingressos</ItemDeMenu>
        </nav>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Abrir menu">
                <MenuIcon aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild><Link href="/events">Eventos</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/organizer">Para organizadores</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/my-tickets">Meus ingressos</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {usuario ? (
            <MenuDaConta usuario={usuario} />
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Entrar</Link>
            </Button>
          )}
          <Button asChild size="sm" className="px-2.5 sm:px-3">
            <Link href="/organizer/events/new">
              <span className="hidden sm:inline">Criar evento</span>
              <Seta className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function ItemDeMenu({ href, children }: { href: Route; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
    >
      {children}
    </Link>
  );
}
