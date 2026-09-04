'use client';

import { Marca, Seta } from '@/components/marca';
import { MenuDaConta } from '@/components/conta/menu-da-conta';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronsUpDownIcon, LayoutDashboardIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** O mínimo que o seletor precisa saber de cada evento — o header é um
 *  componente de cliente e não deve receber o objeto de domínio inteiro. */
export interface EventoNoSeletor {
  readonly id: string;
  readonly nome: string;
  readonly quando: string;
  readonly jaAconteceu: boolean;
  readonly rascunho: boolean;
}

/** Extrai o id do evento da URL. `/organizer/events/new` não é um evento. */
function eventoDaRota(pathname: string): string | null {
  const partes = pathname.split('/').filter(Boolean);
  if (partes[0] !== 'organizer' || partes[1] !== 'events') return null;
  const id = partes[2];
  return !id || id === 'new' ? null : id;
}

/**
 * Header do back-office: o mesmo header pill flutuante da vitrine, só que
 * com a navegação trocada por seletor de evento e link para "Meus eventos"
 * no lugar do menu de visitante. Substitui a sidebar — a navegação de dentro
 * de um evento já vive nas abas (`AbasDoEvento`), então a sidebar duplicava
 * o mesmo menu duas vezes.
 */
export function CabecalhoOrganizador({
  eventos,
  usuario,
}: {
  eventos: readonly EventoNoSeletor[];
  usuario: { readonly nome: string; readonly email: string; readonly fotoUrl: string | null } | null;
}) {
  const pathname = usePathname();
  const eventoId = eventoDaRota(pathname);
  const selecionado = eventoId ? (eventos.find((e) => e.id === eventoId) ?? null) : null;

  const proximos = eventos.filter((e) => !e.jaAconteceu);
  const realizados = eventos.filter((e) => e.jaAconteceu);

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 rounded-full border border-line bg-surface/85 py-2 pl-5 pr-2 shadow-card backdrop-blur-md">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Marca />
          <span className="display hidden text-lg sm:inline">Ducktix</span>
        </Link>

        <nav aria-label="Organizador" className="flex min-w-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
              >
                <span className="max-w-40 truncate sm:max-w-56">
                  {selecionado ? selecionado.nome : 'Selecionar evento'}
                </span>
                <ChevronsUpDownIcon
                  className="size-3.5 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="max-h-[26rem] w-72 overflow-y-auto">
              <DropdownMenuItem asChild>
                <Link href="/organizer" className="gap-2">
                  <LayoutDashboardIcon aria-hidden="true" />
                  <span className="flex-1">Selecionar evento</span>
                </Link>
              </DropdownMenuItem>

              {(
                [
                  ['Por vir', proximos],
                  ['Já realizados', realizados],
                ] as const
              ).map(([titulo, lista]) =>
                lista.length === 0 ? null : (
                  <div key={titulo}>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[11px] tracking-wide text-fg-muted uppercase">
                      {titulo}
                    </DropdownMenuLabel>
                    {lista.map((evento) => (
                      <DropdownMenuItem key={evento.id} asChild>
                        <Link href={`/organizer/events/${evento.id}` as Route} className="gap-2">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{evento.nome}</span>
                            <span className="block text-[12px] text-fg-muted">
                              {evento.quando}
                              {evento.rascunho ? ' · rascunho' : ''}
                            </span>
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ),
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/organizer/events"
            className="hidden shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg sm:inline-block"
          >
            Meus eventos
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {usuario ? (
            <MenuDaConta usuario={usuario} />
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Entrar</Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href="/organizer/events/new">
              Criar evento
              <Seta />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
