'use client';

import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Campo de senha com alternância de visibilidade. O botão fica dentro do
 * campo, então o input reserva o espaço dele no padding — e o botão sai da
 * ordem de tabulação por Shift+Tab natural, ficando depois do input.
 *
 * O rótulo do botão muda com o estado em vez de ser fixo: um leitor de tela
 * precisa saber o que a ação vai fazer, não em que estado o campo está.
 */
export function CampoDeSenha({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'type'>) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visivel ? 'text' : 'password'}
        className={cn('pr-11', className)}
      />
      <button
        type="button"
        onClick={() => setVisivel((atual) => !atual)}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center rounded-r-lg text-fg-muted transition-colors duration-150 hover:text-fg"
      >
        {visivel ? (
          <EyeOffIcon className="size-4" aria-hidden="true" />
        ) : (
          <EyeIcon className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
