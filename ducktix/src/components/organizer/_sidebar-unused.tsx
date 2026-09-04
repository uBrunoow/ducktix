'use client';

import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  LayoutDashboardIcon,
  PlusIcon,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Marca } from '@/components/marca';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

/** O mínimo que o seletor precisa saber de cada evento — a sidebar é um
 *  componente de cliente e não deve receber o objeto de domínio inteiro. */
export interface EventoNoSeletor {
  readonly id: string;
  readonly nome: string;
  readonly quando: string;
  readonly jaAconteceu: boolean;
  readonly rascunho: boolean;
}

/** Navegação de quando nenhum evento está selecionado: escolher um. Cupons
 *  e relatórios eram vistas do portfólio inteiro — agora só existem por
 *  evento, então saem daqui. */
const ITENS_GERAIS = [
  { sufixo: '', rotulo: 'Selecionar evento', icone: LayoutDashboardIcon },
  { sufixo: '/events', rotulo: 'Eventos', icone: CalendarIcon },
] as const;

/** Extrai o id do evento da URL. `/organizer/events/new` não é um evento. */
function eventoDaRota(pathname: string): string | null {
  const partes = pathname.split('/').filter(Boolean);
  if (partes[0] !== 'organizer' || partes[1] !== 'events') return null;
  const id = partes[2];
  return !id || id === 'new' ? null : id;
}

/**
 * Barra lateral do back-office sobre os primitivos `Sidebar` do shadcn/ui.
 *
 * Ela tem DOIS modos: no modo portfólio mostra a navegação geral (selecionar
 * evento, lista de eventos); ao entrar num evento, o menu de seções some
 * daqui — vira abas no topo do conteúdo (`AbasDoEvento`) — e a sidebar fica
 * só com o seletor de contexto e a ação de criar evento. O seletor no topo
 * é o que troca de evento nos dois sentidos, sem voltar à lista.
 *
 * A pele continua sendo a do Ducktix: os tokens `--sidebar-*` já apontam
 * para `--surface`/`--line`/`--brand` em `globals.css`, então nenhum
 * componente aqui carrega cor própria.
 */
export function BarraLateral({ eventos }: { eventos: readonly EventoNoSeletor[] }) {
  const pathname = usePathname();
  const eventoId = eventoDaRota(pathname);
  const selecionado = eventoId ? eventos.find((e) => e.id === eventoId) ?? null : null;

  const proximos = eventos.filter((e) => !e.jaAconteceu);
  const realizados = eventos.filter((e) => e.jaAconteceu);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 px-2 pt-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <Marca />
          <span className="display text-base group-data-[collapsible=icon]:hidden">Ducktix</span>
        </Link>

        {/* Seletor de contexto. Recolhido para ícone ele some: um combobox de
            32px de largura não comunica nada, e o rail já reabre a barra. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-2 text-left outline-none transition-colors duration-150 hover:border-line-strong hover:bg-surface-2 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 group-data-[collapsible=icon]:hidden"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] tracking-wide text-fg-muted uppercase">
                  {selecionado ? 'Evento' : 'Contexto'}
                </span>
                <span className="block truncate text-sm font-medium">
                  {selecionado ? selecionado.nome : 'Todos os eventos'}
                </span>
              </span>
              <ChevronsUpDownIcon
                className="size-4 shrink-0 text-fg-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="max-h-[26rem] w-72 overflow-y-auto">
            <DropdownMenuItem asChild>
              <Link href="/organizer" className="gap-2">
                <LayoutDashboardIcon aria-hidden="true" />
                <span className="flex-1">Todos os eventos</span>
                {selecionado ? null : <CheckIcon className="size-4" aria-hidden="true" />}
              </Link>
            </DropdownMenuItem>

            {[
              ['Por vir', proximos] as const,
              ['Já realizados', realizados] as const,
            ].map(([titulo, lista]) =>
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
                        {selecionado?.id === evento.id ? (
                          <CheckIcon className="size-4 shrink-0" aria-hidden="true" />
                        ) : null}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          asChild
          size="sm"
          className="group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
        >
          <Link href="/organizer/events/new">
            <PlusIcon />
            <span className="group-data-[collapsible=icon]:hidden">Criar evento</span>
          </Link>
        </Button>
      </SidebarHeader>

      {/* Dentro de um evento a navegação é em abas no topo do conteúdo — a
          sidebar fica só com o seletor de contexto e a ação de criar
          evento, sem repetir o mesmo menu em dois lugares. */}
      {selecionado ? null : (
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {ITENS_GERAIS.map((item) => {
                  const href = `/organizer${item.sufixo}`;
                  // "Eventos" continua marcado enquanto se navega dentro da
                  // lista; os demais são exatos.
                  const ativo =
                    item.sufixo === ''
                      ? pathname === '/organizer'
                      : pathname === href || pathname.startsWith(`${href}/`);
                  const Icone = item.icone;

                  return (
                    <SidebarMenuItem key={item.sufixo}>
                      <SidebarMenuButton asChild isActive={ativo} tooltip={item.rotulo}>
                        <Link href={href as Route} aria-current={ativo ? 'page' : undefined}>
                          <Icone aria-hidden="true" />
                          <span>{item.rotulo}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      )}

      <SidebarFooter>
        <SidebarMenu>
          {selecionado ? (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Voltar para todos os eventos">
                <Link href="/organizer">
                  <ArrowLeftIcon aria-hidden="true" />
                  <span>Todos os eventos</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Voltar ao site">
                <Link href="/">
                  <ArrowLeftIcon aria-hidden="true" />
                  <span>Voltar ao site</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
