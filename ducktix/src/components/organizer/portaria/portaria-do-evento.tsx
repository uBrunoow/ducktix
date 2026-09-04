'use client';

import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ScanLineIcon,
  XCircleIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  acaoAtualizarPainelDaPortaria,
  acaoDesfazerCheckIn,
  acaoLerCodigo,
} from '@/app/(private)/organizer/events/[id]/check-in/acoes';
import { LeitorDeCamera } from '@/components/organizer/portaria/leitor-de-camera';
import { TiraDeMetricas } from '@/components/organizer/metricas';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  LeituraDaPortaria,
  PainelDaPortaria,
} from '@/server/participation/application/check-in';
import type { Inscricao } from '@/server/participation/domain/inscricao';
import { nomeCompleto } from '@/server/participation/domain/inscricao';

const hora = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

// Verde e vermelho legível na banda de resultado — só entram fora de um
// `Selo` porque aqui a cor É a mensagem: quem opera a porta com uma fila na
// frente lê a cor antes de ler a frase.
const BANDA: Record<'aceito' | 'recusado', string> = {
  aceito: 'border-ok/30 bg-ok-tint text-ok',
  recusado: 'border-danger/30 bg-danger-tint text-danger',
};

/** Quanto tempo o resultado fica na tela antes de liberar a câmera de novo —
 *  recusa fica mais tempo porque a portaria costuma virar a tela para a
 *  pessoa ler o motivo. */
const PAUSA_MS = { aceito: 1400, recusado: 3200 } as const;

export function PortariaDoEvento({
  eventoId,
  painelInicial,
}: {
  eventoId: string;
  painelInicial: PainelDaPortaria;
}) {
  const [painel, setPainel] = useState(painelInicial);
  const [leitura, setLeitura] = useState<LeituraDaPortaria | null>(null);
  const [travado, setTravado] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');
  const [manualAberto, setManualAberto] = useState(false);
  const [processandoManual, iniciarManual] = useTransition();
  const [desfazendoId, setDesfazendoId] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geracaoRef = useRef(0);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  async function processarLeitura(codigo: string) {
    setTravado(true);
    const minhaGeracao = ++geracaoRef.current;

    const resultado = await acaoLerCodigo(eventoId, codigo);
    if (minhaGeracao !== geracaoRef.current) return; // uma leitura mais nova já chegou

    setLeitura(resultado);

    if (resultado.aceito) {
      const atualizado = await acaoAtualizarPainelDaPortaria(eventoId);
      if (minhaGeracao === geracaoRef.current) setPainel(atualizado);
    } else if (resultado.motivo !== 'nao-encontrado') {
      toast.error(resultado.mensagem);
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(
      () => {
        setTravado(false);
        setLeitura(null);
      },
      resultado.aceito ? PAUSA_MS.aceito : PAUSA_MS.recusado,
    );
  }

  function liberarAgora() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTravado(false);
    setLeitura(null);
  }

  function enviarManual() {
    const codigo = codigoManual.trim();
    if (!codigo || travado) return;
    setCodigoManual('');
    iniciarManual(() => processarLeitura(codigo));
  }

  async function desfazer(inscricaoId: string) {
    setDesfazendoId(inscricaoId);
    const ok = await acaoDesfazerCheckIn(eventoId, inscricaoId);
    if (ok) {
      const atualizado = await acaoAtualizarPainelDaPortaria(eventoId);
      setPainel(atualizado);
      if (leitura?.inscricaoId === inscricaoId) liberarAgora();
      toast.success('Entrada desfeita.');
    } else {
      toast.error('Não foi possível desfazer — tente de novo.');
    }
    setDesfazendoId(null);
  }

  return (
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="grid min-w-0 gap-4">
        <LeitorDeCamera travado={travado} onLeitura={processarLeitura} />

        {leitura ? (
          <div
            key={leitura.codigo + leitura.inscricaoId}
            className={cn(
              'animate-in fade-in-0 zoom-in-95 grid gap-2 rounded-card border p-4 duration-200',
              BANDA[leitura.aceito ? 'aceito' : 'recusado'],
            )}
          >
            <div className="flex items-start gap-3">
              {leitura.aceito ? (
                <CheckCircle2Icon
                  className="mt-0.5 size-6 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : (
                <XCircleIcon
                  className="mt-0.5 size-6 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0 flex-1">
                {leitura.nome ? (
                  <p className="display truncate text-lg text-fg">
                    {leitura.nome}
                  </p>
                ) : null}
                <p className="text-[13px] font-medium">{leitura.mensagem}</p>
                {leitura.loteNome ? (
                  <p className="text-[12px] opacity-80">{leitura.loteNome}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {leitura.aceito && leitura.inscricaoId ? (
                <button
                  type="button"
                  onClick={() => desfazer(leitura.inscricaoId!)}
                  disabled={desfazendoId === leitura.inscricaoId}
                  className="text-[12px] font-semibold underline decoration-1 underline-offset-2 disabled:opacity-50"
                >
                  Desfazer
                </button>
              ) : null}
              <button
                type="button"
                onClick={liberarAgora}
                className="text-[12px] font-semibold underline decoration-1 underline-offset-2"
              >
                Ler próximo
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-card border border-dashed border-line px-4 py-3.5 text-[13px] text-fg-muted">
            <ScanLineIcon
              className="size-4 shrink-0"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            Aponte a câmera para o QR do ingresso.
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setManualAberto((v) => !v)}
            aria-expanded={manualAberto}
            className="flex items-center gap-1.5 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
          >
            <ChevronDownIcon
              className={cn(
                'size-3.5 transition-transform duration-200',
                manualAberto && 'rotate-180',
              )}
              strokeWidth={2}
              aria-hidden="true"
            />
            Digitar código manualmente
          </button>

          {manualAberto ? (
            <form
              onSubmit={(evento) => {
                evento.preventDefault();
                enviarManual();
              }}
              className="mt-2.5 flex gap-2"
            >
              <Input
                value={codigoManual}
                onChange={(evento) => setCodigoManual(evento.target.value)}
                placeholder="Código do ingresso"
                aria-label="Código do ingresso"
                autoComplete="off"
                className="h-10 flex-1 font-mono text-[13px]"
              />
              <LoadingButton
                type="submit"
                loading={processandoManual}
                loadingText="Lendo…"
                disabled={!codigoManual.trim() || travado}
              >
                Validar
              </LoadingButton>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 gap-4">
        <TiraDeMetricas
          itens={[
            {
              rotulo: 'Presentes',
              valor: String(painel.presentes),
              destaque: true,
            },
            { rotulo: 'Ausentes', valor: String(painel.ausentes) },
            { rotulo: 'Presença', valor: `${painel.taxaDePresenca}%` },
            { rotulo: 'Última hora', valor: String(painel.naUltimaHora) },
            { rotulo: 'Pico/min', valor: String(painel.picoPorMinuto) },
          ]}
        />
        <UltimasEntradas
          ultimos={painel.ultimos}
          desfazendoId={desfazendoId}
          onDesfazer={desfazer}
        />
      </div>
    </div>
  );
}

function UltimasEntradas({
  ultimos,
  desfazendoId,
  onDesfazer,
}: {
  ultimos: readonly Inscricao[];
  desfazendoId: string | null;
  onDesfazer: (inscricaoId: string) => void;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="border-b border-line px-5 py-4">
        <h2 className="display m-0 text-base">Últimas entradas</h2>
        <p className="mt-0.5 text-[13px] text-fg-muted">
          As 12 leituras mais recentes deste evento, de qualquer aparelho na
          portaria.
        </p>
      </div>

      {ultimos.length === 0 ? (
        <p className="px-5 py-12 text-center text-[13px] text-fg-muted">
          Ninguém entrou ainda. A primeira leitura aparece aqui.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {ultimos.map((inscricao) => (
            <li
              key={inscricao.id}
              className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-surface-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {nomeCompleto(inscricao)}
                </span>
                <span className="block truncate text-[12px] text-fg-muted">
                  {inscricao.loteNome}
                </span>
              </span>
              <span className="shrink-0 text-[12px] tabular-nums text-fg-muted">
                {inscricao.checkInEm ? hora.format(inscricao.checkInEm) : '—'}
              </span>
              <button
                type="button"
                onClick={() => onDesfazer(inscricao.id)}
                disabled={desfazendoId === inscricao.id}
                className="shrink-0 text-[12px] font-medium text-fg-muted underline decoration-1 underline-offset-2 transition-colors hover:text-danger disabled:opacity-50"
              >
                Desfazer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
