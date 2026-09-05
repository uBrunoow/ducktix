import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Trilha de progresso compartilhada entre os fluxos de várias etapas
 * (checkout e criação de evento). Antes cada fluxo desenhava a sua: o wizard
 * do organizador tinha bolinhas numeradas e o checkout só um "Etapa 1 de 2"
 * em texto — a mesma ideia com duas caras diferentes.
 *
 * O movimento é um só e é o próprio assunto da peça: o filete entre dois
 * passos se preenche da esquerda para a direita quando a etapa avança, e o
 * número vira check no mesmo instante.
 *
 * Por que transição de CSS e não uma mola de JS: isto é um indicador de
 * progresso. Uma animação por requestAnimationFrame congela no valor
 * intermediário quando a aba perde o foco e não se recupera sozinha — o
 * filete fica parado em 40% e passa a mentir sobre o progresso. A transição
 * de CSS é declarativa: interrompida ou nunca executada, o estilo final
 * continua sendo o correto. Barra de progresso não pode ter estado preso.
 *
 * Os rótulos ficam visíveis ao lado do número em telas largas; no mobile só o
 * passo atual é nomeado (abaixo da trilha), porque quatro rótulos lado a lado
 * a 375px viram três letras cada.
 */
export function PassosDoFluxo({
  passos,
  atual,
  className,
}: {
  passos: readonly string[];
  /** Índice do passo corrente, base zero. */
  atual: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <ol
        className="flex min-w-0 items-center gap-2 sm:gap-3"
        aria-label={`Progresso: etapa ${atual + 1} de ${passos.length}`}
      >
        {passos.map((titulo, indice) => {
          const feito = indice < atual;
          const ativo = indice === atual;

          return (
            <li
              key={titulo}
              className={cn('flex min-w-0 items-center gap-2', indice < passos.length - 1 && 'flex-1')}
            >
              <span
                aria-current={ativo ? 'step' : undefined}
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                  'transition-[background-color,border-color,color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  ativo && 'scale-108 border-brand bg-brand text-brand-fg',
                  feito && 'border-brand bg-brand-tint text-brand-ink',
                  !ativo && !feito && 'border-line bg-surface text-fg-muted',
                )}
              >
                {feito ? <CheckIcon className="size-3.5" aria-hidden="true" /> : indice + 1}
              </span>

              <span
                className={cn(
                  'hidden whitespace-nowrap text-[13px] font-medium transition-colors duration-300 sm:inline',
                  ativo ? 'text-fg' : 'text-fg-muted',
                )}
              >
                {titulo}
              </span>

              {indice < passos.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="relative h-px flex-1 overflow-hidden bg-line"
                >
                  {/* `scaleX` em vez de `width`: roda no compositor, então o
                      preenchimento não força layout a cada quadro. */}
                  <span
                    className={cn(
                      'absolute inset-0 block origin-left bg-brand',
                      'transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
                      feito ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-[13px] font-medium text-fg-muted sm:hidden">
        Etapa {atual + 1} de {passos.length} · {passos[atual]}
      </p>
    </div>
  );
}
