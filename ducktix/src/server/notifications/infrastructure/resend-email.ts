import 'server-only';
import { Resend } from 'resend';
import type { Evento } from '@/server/event/domain/evento';
import type { Ingresso } from '@/server/participation/domain/ingresso';
import { nomeDeExibicao } from '@/server/participation/domain/ingresso';
import {
  totalBrutoCentavos,
  totalComDescontoCentavos,
  type Pedido,
} from '@/server/ticketing/domain/pedido';
import type { Cupom } from '@/server/ticketing/domain/cupom';

function clienteResend(): Resend {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    throw new Error('RESEND_API_KEY não está configurada.');
  }
  return new Resend(chave);
}

function remetente(): string {
  return process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
}

function urlDaAplicacao(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function escaparHtml(valor: string): string {
  return valor.replace(
    /[&<>"']/g,
    (caractere) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[caractere] ?? caractere,
  );
}

function moeda(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

function dataHora(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

function dataDoEvento(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(data);
}

function rotuloDoPagamento(metodo: Pedido['metodoPagamento']): string {
  if (metodo === 'cartao') return 'Cartão';
  if (metodo === 'pix') return 'Pix';
  if (metodo === 'boleto') return 'Boleto';
  return 'Não informado';
}

function imagemDoEvento(url: string | null): string {
  if (!url || (!url.startsWith('https://') && !url.startsWith('data:image/'))) return '';
  return `<img src="${escaparHtml(url)}" alt="" width="100%" style="display:block;width:100%;height:auto;max-height:180px;object-fit:cover;border-radius:4px 4px 0 0;" />`;
}

const estilos = {
  corpo:
    'margin:0;background:#eff1e7;color:#26262b;font-family:"Inter Tight","Trebuchet MS",Arial,sans-serif;font-size:15px;line-height:1.6;',
  cartao:
    'width:100%;max-width:604px;margin:0 auto;background:#ffffff;border:1px solid #dfe1d6;border-radius:8px;overflow:hidden;',
  conteudo: 'padding:46px 52px 42px;',
  rodape: 'padding:34px 52px 38px;border-top:1px solid #dfe1d6;',
  titulo:
    'margin:0 0 22px;color:#26262b;font-size:28px;font-weight:400;line-height:1.2;letter-spacing:-0.5px;',
  paragrafo: 'margin:0 0 18px;color:#6b6b73;font-size:15px;line-height:1.65;',
  botao:
    'display:inline-block;background:#ffd400;border-radius:4px;color:#0a0a0a;font-size:14px;font-weight:600;line-height:1;padding:13px 17px;text-decoration:none;',
  textoRodape: 'margin:0;color:#6b6b73;font-size:14px;line-height:1.6;',
};

function logoEmail(): string {
  return `${urlDaAplicacao()}/logo-email.svg`;
}

function templateDeEmail(conteudo: string, rodape: string): string {
  return `
    <!doctype html>
    <html lang="pt-BR">
      <body style="${estilos.corpo}">
        <div style="background:#eff1e7;padding:48px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="${estilos.cartao}">
                  <tr>
                    <td style="height:4px;background:#ffd400;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="${estilos.conteudo}">
                      <div style="margin:0 0 36px;color:#26262b;font-size:21px;font-weight:700;letter-spacing:-0.6px;">
                        <img src="${logoEmail()}" width="24" height="24" alt="Ducktix" style="display:inline-block;vertical-align:middle;margin-right:8px;border:0;" />
                        <span style="vertical-align:middle;">Ducktix</span>
                      </div>
                      ${conteudo}
                    </td>
                  </tr>
                  <tr>
                    <td style="${estilos.rodape}">
                      ${rodape}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="margin:22px 0 0;text-align:center;color:#6b6b73;font-size:11px;line-height:1.5;">
            Ducktix · Gestão e venda de ingressos
          </p>
        </div>
      </body>
    </html>
  `;
}

async function enviarEmail(dados: {
  readonly to: string | readonly string[];
  readonly subject: string;
  readonly html: string;
}): Promise<void> {
  const { error } = await clienteResend().emails.send({
    from: remetente(),
    to: typeof dados.to === 'string' ? dados.to : [...dados.to],
    subject: dados.subject,
    html: dados.html,
  });
  if (error) throw new Error(`Resend não enviou o e-mail: ${error.message}`);
}

export async function enviarEmailDeRedefinicao(dados: {
  readonly nome: string;
  readonly email: string;
  readonly token: string;
}): Promise<void> {
  const url = `${urlDaAplicacao()}/reset-password?token=${encodeURIComponent(dados.token)}`;
  await enviarEmail({
    to: dados.email,
    subject: 'Redefinição de senha - Ducktix',
    html: templateDeEmail(
      `
        <h1 style="${estilos.titulo}">Redefina sua senha</h1>
        <p style="${estilos.paragrafo}">Olá, ${escaparHtml(dados.nome)}.</p>
        <p style="${estilos.paragrafo}">
          Recebemos uma solicitação para criar uma nova senha para sua conta Ducktix.
          O link abaixo é válido por uma hora e pode ser usado uma única vez.
        </p>
        <p style="margin:28px 0 30px;">
          <a href="${url}" style="${estilos.botao}">Redefinir minha senha</a>
        </p>
        <p style="margin:0;color:#6b6b73;font-size:13px;line-height:1.6;">
          Se você não solicitou essa alteração, pode ignorar este e-mail com segurança.
        </p>
      `,
      `
        <p style="${estilos.textoRodape}">
          Precisa de ajuda? Entre em contato com a equipe Ducktix.
        </p>
        <p style="margin:18px 0 0;color:#6b6b73;font-size:14px;line-height:1.6;">
          Até mais,<br />
          <strong style="color:#26262b;">Equipe Ducktix</strong>
        </p>
      `,
    ),
  });
}

export async function enviarEmailDeConfirmacaoDoPedido(dados: {
  readonly emails: readonly string[];
  readonly comprador: { readonly nome: string; readonly email: string };
  readonly pedido: Pedido;
  readonly compradoEm: Date;
  readonly ingressos: readonly Ingresso[];
  readonly eventos: ReadonlyMap<string, Evento>;
  readonly cupom: Cupom | null;
}): Promise<void> {
  const bruto = totalBrutoCentavos(dados.pedido);
  const total = totalComDescontoCentavos(dados.pedido, dados.cupom);
  const desconto = Math.max(0, bruto - total);
  const ingressosPorItem = new Map<string, Ingresso[]>();
  for (const ingresso of dados.ingressos) {
    const lista = ingressosPorItem.get(ingresso.itemPedidoId) ?? [];
    lista.push(ingresso);
    ingressosPorItem.set(ingresso.itemPedidoId, lista);
  }
  const itens = dados.pedido.itens
    .map((item) => {
      const evento = dados.eventos.get(item.eventoId);
      const ingressos = ingressosPorItem.get(item.id) ?? [];
      const nomes = ingressos.map(nomeDeExibicao).join(', ');
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #dfe1d6;color:#26262b;font-size:14px;line-height:1.5;">
            <strong>${escaparHtml(evento?.nome ?? 'Evento')}</strong><br />
            <span style="color:#6b6b73;">${item.quantidade} ingresso(s) · ${moeda(item.precoUnitarioCentavos)} cada</span>
            ${nomes ? `<br /><span style="color:#6b6b73;">Participante(s): ${escaparHtml(nomes)}</span>` : ''}
          </td>
          <td align="right" valign="top" style="padding:12px 0;border-bottom:1px solid #dfe1d6;color:#26262b;font-size:14px;white-space:nowrap;">
            ${moeda(item.quantidade * item.precoUnitarioCentavos)}
          </td>
        </tr>
      `;
    })
    .join('');
  const eventos = [...new Set(dados.pedido.itens.map((item) => item.eventoId))]
    .map((eventoId) => dados.eventos.get(eventoId))
    .filter((evento): evento is Evento => evento !== undefined)
    .map(
      (evento) => `
        <div style="margin:0 0 18px;border:1px solid #dfe1d6;border-radius:5px;overflow:hidden;">
          ${imagemDoEvento(evento.imagemUrl)}
          <div style="padding:16px 18px;background:#ffffff;">
            <h3 style="margin:0 0 8px;color:#26262b;font-size:16px;line-height:1.3;">${escaparHtml(evento.nome)}</h3>
            <p style="margin:0;color:#6b6b73;font-size:13px;line-height:1.6;">
              ${escaparHtml(dataDoEvento(evento.comecaEm))}<br />
              ${escaparHtml(evento.local ?? 'Evento online')}
            </p>
          </div>
        </div>
      `,
    )
    .join('');
  const url = `${urlDaAplicacao()}/my-tickets/${dados.pedido.id}`;

  await enviarEmail({
    to: dados.emails,
    subject: 'Pedido confirmado - Ducktix',
    html: templateDeEmail(
      `
        <h1 style="${estilos.titulo}">Pedido confirmado</h1>
        <p style="${estilos.paragrafo}">
          Olá, ${escaparHtml(dados.comprador.nome)}. Seu pedido foi confirmado e os ingressos já estão disponíveis.
        </p>
        <div style="margin:24px 0 30px;padding:18px 20px;background:#fff6cc;border:1px solid #dfe1d6;border-radius:5px;">
          <p style="margin:0;color:#7a5c00;font-size:12px;font-weight:700;letter-spacing:0.7px;text-transform:uppercase;">
            Resumo da compra
          </p>
          <p style="margin:10px 0 0;color:#26262b;font-size:14px;line-height:1.8;">
            <strong>Pedido:</strong> ${escaparHtml(dados.pedido.id)}<br />
            <strong>Comprador:</strong> ${escaparHtml(dados.comprador.nome)}<br />
            <strong>E-mail:</strong> ${escaparHtml(dados.comprador.email)}<br />
            <strong>Comprado em:</strong> ${escaparHtml(dataHora(dados.compradoEm))}<br />
            <strong>Pagamento:</strong> ${rotuloDoPagamento(dados.pedido.metodoPagamento)}
          </p>
        </div>
        <p style="margin:0 0 12px;color:#7a5c00;font-size:12px;font-weight:700;letter-spacing:0.7px;text-transform:uppercase;">
          Eventos
        </p>
        ${eventos}
        <div style="margin:26px 0 30px;padding:18px 20px;background:#e7e9de;border:1px solid #dfe1d6;border-radius:5px;">
          <p style="margin:0 0 10px;color:#7a5c00;font-size:12px;font-weight:700;letter-spacing:0.7px;text-transform:uppercase;">
            Ingressos e valores
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tbody>${itens}</tbody>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;color:#26262b;font-size:14px;line-height:1.8;">
            <tr><td>Subtotal</td><td align="right">${moeda(bruto)}</td></tr>
            ${desconto > 0 ? `<tr><td>Desconto${dados.cupom ? ` (${escaparHtml(dados.cupom.codigo)})` : ''}</td><td align="right">- ${moeda(desconto)}</td></tr>` : ''}
            <tr><td style="padding-top:8px;border-top:1px solid #c9ccbc;font-size:16px;"><strong>Total</strong></td><td align="right" style="padding-top:8px;border-top:1px solid #c9ccbc;font-size:16px;"><strong>${moeda(total)}</strong></td></tr>
          </table>
        </div>
        <p style="margin:0 0 30px;">
          <a href="${url}" style="${estilos.botao}">Ver meus ingressos</a>
        </p>
        <p style="margin:0;color:#6b6b73;font-size:13px;line-height:1.6;">
          Apresente o QR code na entrada do evento. Ele também fica disponível
          a qualquer momento em "Meus ingressos".
        </p>
      `,
      `
        <p style="${estilos.textoRodape}">
          Obrigado por escolher a Ducktix.
        </p>
        <p style="margin:18px 0 0;color:#6b6b73;font-size:14px;line-height:1.6;">
          Até o evento,<br />
          <strong style="color:#26262b;">Equipe Ducktix</strong>
        </p>
      `,
    ),
  });
}
