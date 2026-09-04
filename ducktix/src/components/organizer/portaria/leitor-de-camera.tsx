'use client';

import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { FlashlightIcon, FlashlightOffIcon, VideoOffIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type EstadoDaCamera = 'iniciando' | 'ativa' | 'negada' | 'indisponivel';

/**
 * Viewfinder da portaria. Decodifica QR continuamente da câmera traseira e
 * devolve cada leitura ao pai — não decide sozinho se o código é válido,
 * isso é do domínio (`avaliarCheckIn`).
 *
 * `travado` pausa a decodificação sem desmontar a câmera: enquanto o
 * servidor confirma uma leitura, reabrir o obturador imediatamente faria a
 * mesma pessoa ser lida duas vezes antes do resultado voltar.
 */
export function LeitorDeCamera({
  travado,
  onLeitura,
  className,
}: {
  travado: boolean;
  onLeitura: (codigo: string) => void;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onLeituraRef = useRef(onLeitura);
  onLeituraRef.current = onLeitura;
  const travadoRef = useRef(travado);
  travadoRef.current = travado;

  const [estado, setEstado] = useState<EstadoDaCamera>('iniciando');
  const [tocha, setTocha] = useState<{ suportada: boolean; ligada: boolean }>({
    suportada: false,
    ligada: false,
  });

  useEffect(() => {
    let cancelado = false;
    const leitor = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 200,
      delayBetweenScanSuccess: 500,
    });

    leitor
      .decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        videoRef.current ?? undefined,
        (resultado) => {
          if (cancelado || travadoRef.current || !resultado) return;
          onLeituraRef.current(resultado.getText());
        },
      )
      .then((controls) => {
        if (cancelado) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setEstado('ativa');

        const faixa = (videoRef.current?.srcObject as MediaStream | null)
          ?.getVideoTracks()
          .at(0);
        if (
          faixa &&
          BrowserQRCodeReader.mediaStreamIsTorchCompatibleTrack(faixa)
        ) {
          setTocha({ suportada: true, ligada: false });
        }
      })
      .catch((erro: unknown) => {
        if (cancelado) return;
        const nome = erro instanceof Error ? erro.name : '';
        setEstado(nome === 'NotAllowedError' ? 'negada' : 'indisponivel');
      });

    return () => {
      cancelado = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  async function alternarTocha() {
    const faixa = (videoRef.current?.srcObject as MediaStream | null)
      ?.getVideoTracks()
      .at(0);
    if (!faixa || !controlsRef.current?.switchTorch) return;
    const ligar = !tocha.ligada;
    await controlsRef.current.switchTorch(ligar);
    setTocha((atual) => ({ ...atual, ligada: ligar }));
  }

  return (
    <div
      className={cn(
        'relative aspect-square w-full overflow-hidden rounded-card border border-line bg-[#111110] shadow-card',
        className,
      )}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        className={cn(
          'size-full object-cover transition-[filter,opacity] duration-300',
          estado === 'ativa' ? 'opacity-100' : 'opacity-0',
          travado && 'blur-[3px] brightness-75',
        )}
      />

      {estado !== 'ativa' ? (
        <div className="absolute inset-0 grid place-items-center px-8 text-center">
          {estado === 'negada' || estado === 'indisponivel' ? (
            <div className="grid justify-items-center gap-2 text-[#e7e5da]">
              <VideoOffIcon
                className="size-6"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <p className="text-[13px] font-medium">
                {estado === 'negada'
                  ? 'Câmera bloqueada. Autorize o acesso ou use o código manual abaixo.'
                  : 'Nenhuma câmera disponível neste aparelho.'}
              </p>
            </div>
          ) : (
            <p className="text-[13px] font-medium text-[#e7e5da]/70">
              Ligando a câmera…
            </p>
          )}
        </div>
      ) : null}

      {estado === 'ativa' ? (
        <>
          {/* Alvo de mira — puramente decorativo, a decodificação lê o
              quadro inteiro; existe para dizer ao operador onde apontar.
              As quatro bordas grossas nos cantos formam o retículo de
              scanner (câmera/QR), não um acento de cartão — exceção
              deliberada ao "sem borda lateral grossa" do design system. */}
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-[12%] rounded-2xl border-2 transition-colors duration-200',
              travado ? 'border-brand' : 'border-white/70',
            )}
          >
            <span className="absolute -top-px -left-px size-6 rounded-tl-2xl border-t-4 border-l-4 border-brand" />
            <span className="absolute -top-px -right-px size-6 rounded-tr-2xl border-t-4 border-r-4 border-brand" />
            <span className="absolute -bottom-px -left-px size-6 rounded-bl-2xl border-b-4 border-l-4 border-brand" />
            <span className="absolute -bottom-px -right-px size-6 rounded-br-2xl border-r-4 border-b-4 border-brand" />
          </div>

          {tocha.suportada ? (
            <button
              type="button"
              onClick={alternarTocha}
              aria-pressed={tocha.ligada}
              aria-label={tocha.ligada ? 'Desligar lanterna' : 'Ligar lanterna'}
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/60"
            >
              {tocha.ligada ? (
                <FlashlightOffIcon
                  className="size-4"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : (
                <FlashlightIcon
                  className="size-4"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
