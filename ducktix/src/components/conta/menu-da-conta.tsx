'use client';

import { LogOutIcon, UserRoundIcon } from 'lucide-react';
import Link from 'next/link';
import { useTransition } from 'react';
import { acaoSair } from '@/app/(public)/(auth)/acoes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface UsuarioNoMenu {
  readonly nome: string;
  readonly email: string;
  readonly fotoUrl?: string | null;
}

/** "AB" a partir de "Ana Beatriz Souza" — primeira letra do primeiro e do
 *  último nome; um nome só usa as duas primeiras letras. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

/**
 * Avatar com dropdown de conta — substitui o nome cru que só o back-office
 * mostrava. Mesmo componente serve a vitrine e o organizador: os dois
 * headers já buscam `usuario` da sessão, só faltava algo para clicar.
 */
export function MenuDaConta({ usuario }: { usuario: UsuarioNoMenu }) {
  const [saindo, iniciarSaida] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-offset-2 transition-opacity hover:opacity-80 disabled:opacity-50"
          disabled={saindo}
          aria-label="Menu da conta"
        >
          <Avatar>
            {usuario.fotoUrl ? <AvatarImage src={usuario.fotoUrl} alt="" /> : null}
            <AvatarFallback className="bg-brand-tint font-semibold text-brand-ink">
              {iniciais(usuario.nome)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="grid gap-0.5 font-normal">
          <span className="truncate text-sm font-semibold text-fg">{usuario.nome}</span>
          <span className="truncate text-xs text-fg-muted">{usuario.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account" className="gap-2">
            <UserRoundIcon aria-hidden="true" />
            Minha conta
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={saindo}
          onSelect={(evento) => {
            evento.preventDefault();
            iniciarSaida(() => acaoSair());
          }}
          className="gap-2"
        >
          <LogOutIcon aria-hidden="true" />
          {saindo ? 'Saindo…' : 'Sair'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
