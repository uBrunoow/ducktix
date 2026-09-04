import QRCode from 'qrcode';

/**
 * QR renderizado como SVG inline. A tinta usa `--fg`, não preto puro, para
 * casar com o resto da paleta; o fundo fica transparente para herdar o
 * `--surface` do cartão que o envolve.
 */
export async function gerarQrSvg(valor: string): Promise<string> {
  return QRCode.toString(valor, {
    type: 'svg',
    margin: 0,
    color: { dark: '#26262b', light: '#0000' },
  });
}

/** Envelope de exibição — aceita o SVG já gerado (para uso em componente
 *  cliente) ou gera na hora a partir de `valor`. */
export function QrSvg({
  svg,
  tamanho = 168,
  rotulo = 'QR code',
}: {
  svg: string;
  tamanho?: number;
  rotulo?: string;
}) {
  return (
    <div
      role="img"
      aria-label={rotulo}
      className="[&_svg]:block [&_svg]:h-full [&_svg]:w-full"
      style={{ width: tamanho, height: tamanho }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export async function CodigoQR({ valor, tamanho = 168 }: { valor: string; tamanho?: number }) {
  const svg = await gerarQrSvg(valor);
  return <QrSvg svg={svg} tamanho={tamanho} rotulo="QR code de validação do ingresso" />;
}
