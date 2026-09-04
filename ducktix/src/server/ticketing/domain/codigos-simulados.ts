/**
 * DADOS SINTÉTICOS — códigos de cobrança de demonstração.
 *
 * Não existe integração com PSP nesta fase. Estas funções produzem um código
 * Pix "copia e cola" e uma linha digitável de boleto com o formato e o
 * comprimento certos, derivados do pedido, só para a interface de pagamento
 * ter o que exibir e copiar. Nenhum dos dois é cobrável em banco nenhum — a
 * tela diz isso ao participante. Substituir pelo retorno real do provedor.
 */

function digitos(semente: string, quantidade: number): string {
  let valor = 0;
  for (let i = 0; i < semente.length; i += 1) {
    valor = (valor * 31 + semente.charCodeAt(i)) % 1_000_000_007;
  }
  let saida = '';
  while (saida.length < quantidade) {
    valor = (valor * 1_103_515_245 + 12_345) % 2_147_483_648;
    saida += String(valor % 10);
  }
  return saida.slice(0, quantidade);
}

/** Código Pix no formato "copia e cola" (BR Code / EMV) — simulado. */
export function codigoPixSimulado(pedidoId: string, totalCentavos: number): string {
  const valor = (totalCentavos / 100).toFixed(2);
  const referencia = `DUCKTIX${digitos(pedidoId, 10)}`;
  return [
    '00020126',
    `58BR.GOV.BCB.PIX0136${digitos(`${pedidoId}pix`, 32)}`,
    '52040000',
    '5303986',
    `54${String(valor.length).padStart(2, '0')}${valor}`,
    '5802BR',
    '5907DUCKTIX',
    '6009SAO PAULO',
    `62${String(referencia.length + 4).padStart(2, '0')}05${String(referencia.length).padStart(2, '0')}${referencia}`,
    `6304${digitos(`${pedidoId}crc`, 4)}`,
  ].join('');
}

/** Linha digitável de boleto: 47 dígitos em 5 blocos — simulada. */
export function linhaDigitavelSimulada(pedidoId: string): string {
  const bruto = digitos(`${pedidoId}boleto`, 47);
  return [
    `${bruto.slice(0, 5)}.${bruto.slice(5, 10)}`,
    `${bruto.slice(10, 15)}.${bruto.slice(15, 21)}`,
    `${bruto.slice(21, 26)}.${bruto.slice(26, 32)}`,
    bruto.slice(32, 33),
    bruto.slice(33, 47),
  ].join(' ');
}

/** Vencimento do boleto: 3 dias úteis a partir de `a partir de`. */
export function vencimentoDoBoleto(apartirDe: Date): Date {
  const data = new Date(apartirDe);
  let uteis = 0;
  while (uteis < 3) {
    data.setDate(data.getDate() + 1);
    const diaDaSemana = data.getDay();
    if (diaDaSemana !== 0 && diaDaSemana !== 6) uteis += 1;
  }
  return data;
}
