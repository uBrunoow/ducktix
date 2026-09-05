import 'server-only';
import { Resend } from 'resend';
import type { Evento } from '@/server/event/domain/evento';
import type { Ingresso } from '@/server/participation/domain/ingresso';
import { nomeDeExibicao } from '@/server/participation/domain/ingresso';
import type { Pedido } from '@/server/ticketing/domain/pedido';

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

const estilos = {
  corpo:
    'margin:0;background:#f5f5f7;color:#17181c;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;',
  cartao:
    'width:100%;max-width:604px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;',
  conteudo: 'padding:46px 52px 42px;',
  rodape: 'padding:34px 52px 38px;border-top:1px solid #e5e7eb;',
  titulo:
    'margin:0 0 22px;color:#111318;font-size:28px;font-weight:400;line-height:1.2;letter-spacing:-0.5px;',
  paragrafo: 'margin:0 0 18px;color:#4b4d54;font-size:15px;line-height:1.65;',
  botao:
    'display:inline-block;background:#ffd400;border-radius:4px;color:#0a0a0a;font-size:14px;font-weight:600;line-height:1;padding:13px 17px;text-decoration:none;',
  textoRodape: 'margin:0;color:#70727a;font-size:14px;line-height:1.6;',
};

function logoSvg(): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="Ducktix">
      <circle cx="12" cy="12" r="11" fill="#ffd400"/>
      <path d="M9.2 9.4a2.6 2.6 0 1 1 2.6 2.6H8.4l-1.9 2.2c1.4 2.1 3.6 3.2 6 3.2 3.4 0 5.8-2.3 5.8-5.6" fill="none" stroke="#0a0a0a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="10.4" cy="8.9" r="0.85" fill="#0a0a0a"/>
    </svg>
  `;
}

function templateDeEmail(conteudo: string, rodape: string): string {
  return `
    <!doctype html>
    <html lang="pt-BR">
      <body style="${estilos.corpo}">
        <div style="background:#f5f5f7;padding:48px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="${estilos.cartao}">
                  <tr>
                    <td style="height:4px;background:#1769d2;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="${estilos.conteudo}">
                      <div style="margin:0 0 36px;color:#111318;font-size:21px;font-weight:700;letter-spacing:-0.6px;">
                        <span style="display:inline-block;vertical-align:middle;margin-right:8px;line-height:0;">${logoSvg()}</span>
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
          <p style="margin:22px 0 0;text-align:center;color:#a0a2a8;font-size:11px;line-height:1.5;">
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
        <p style="margin:0;color:#70727a;font-size:13px;line-height:1.6;">
          Se você não solicitou essa alteração, pode ignorar este e-mail com segurança.
        </p>
      `,
      `
        <p style="${estilos.textoRodape}">
          Precisa de ajuda? Entre em contato com a equipe Ducktix.
        </p>
        <p style="margin:18px 0 0;color:#70727a;font-size:14px;line-height:1.6;">
          Até mais,<br />
          <strong style="color:#4b4d54;">Equipe Ducktix</strong>
        </p>
      `,
    ),
  });
}

export async function enviarEmailDeConfirmacaoDoPedido(dados: {
  readonly emails: readonly string[];
  readonly pedido: Pedido;
  readonly ingressos: readonly Ingresso[];
  readonly eventos: ReadonlyMap<string, Evento>;
}): Promise<void> {
  const itens = dados.ingressos
    .map((ingresso) => {
      const evento = dados.eventos.get(ingresso.eventoId);
      return `<li>${escaparHtml(nomeDeExibicao(ingresso))} - ${escaparHtml(evento?.nome ?? 'Evento')}</li>`;
    })
    .join('');
  const url = `${urlDaAplicacao()}/my-tickets/${dados.pedido.id}`;

  await enviarEmail({
    to: dados.emails,
    subject: 'Pedido confirmado - Ducktix',
    html: templateDeEmail(
      `
        <h1 style="${estilos.titulo}">Pedido confirmado</h1>
        <p style="${estilos.paragrafo}">
          Tudo certo! Os ingressos do pedido
          <strong style="color:#17181c;">${escaparHtml(dados.pedido.id)}</strong>
          já estão disponíveis na sua conta.
        </p>
        <div style="margin:26px 0 30px;padding:18px 20px;background:#f7f8fa;border:1px solid #e9ebef;border-radius:5px;">
          <p style="margin:0 0 10px;color:#70727a;font-size:12px;font-weight:700;letter-spacing:0.7px;text-transform:uppercase;">
            Seus ingressos
          </p>
          <ul style="margin:0;padding-left:20px;color:#4b4d54;font-size:14px;line-height:1.8;">
            ${itens}
          </ul>
        </div>
        <p style="margin:0 0 30px;">
          <a href="${url}" style="${estilos.botao}">Ver meus ingressos</a>
        </p>
        <p style="margin:0;color:#70727a;font-size:13px;line-height:1.6;">
          Apresente o QR code na entrada do evento. Ele também fica disponível
          a qualquer momento em "Meus ingressos".
        </p>
      `,
      `
        <p style="${estilos.textoRodape}">
          Obrigado por escolher a Ducktix.
        </p>
        <p style="margin:18px 0 0;color:#70727a;font-size:14px;line-height:1.6;">
          Até o evento,<br />
          <strong style="color:#4b4d54;">Equipe Ducktix</strong>
        </p>
      `,
    ),
  });
}
