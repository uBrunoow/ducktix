/**
 * Domínio de eventos. Sem dependência de Postgres, Drizzle, HTTP ou React —
 * ver docs/guidelines.md, "Camadas".
 */

export type Modalidade = 'presencial' | 'online' | 'hibrido';

/**
 * Status de publicação — distinto do status comercial (`StatusLote`). Um
 * evento nasce `rascunho`: só o organizador o vê, a vitrine pública nunca
 * lista rascunhos (ver `application/vitrine.ts`).
 */
export type StatusEvento = 'rascunho' | 'publicado' | 'encerrado' | 'cancelado';

/** Visibilidade na vitrine pública — distinta de `status`: um evento
 *  "não listado" já está publicado (compra funciona por link direto), só
 *  não aparece em listagens/busca. */
export type Visibilidade = 'publico' | 'nao-listado';

/** Só se aplica a `modalidade` 'online' ou 'hibrido' — detalha como a
 *  parte online do evento acontece. */
export type FormatoOnline = 'ao-vivo' | 'videoconferencia' | 'desafio-virtual' | 'conteudo-digital';

export type StatusLote =
  | 'a-venda'
  | 'ultimo-lote'
  | 'em-breve'
  | 'esgotado'
  | 'encerrado';

export interface Lote {
  readonly id: string;
  readonly nome: string;
  readonly precoCentavos: number;
  readonly vagas: number;
  readonly vendidos: number;
  /**
   * Quando a venda deste lote abre. `null` significa "já aberto desde
   * sempre" — é o caso do lote único e do primeiro lote de uma fila.
   *
   * Existe porque o organizador programa a fila inteira na criação do
   * evento: o Lote 2 não deve vender antes da data em que o Lote 1 encerra.
   * Sem a data de início, "lote vigente" seria só "o primeiro com vaga", e o
   * Lote 2 canibalizaria o Lote 1 no minuto em que o primeiro esgotasse.
   */
  readonly iniciaEm: Date | null;
  /** Quando a venda deste lote fecha. `null` = fica aberto até o evento. */
  readonly encerraEm: Date | null;
}

export interface Evento {
  readonly id: string;
  readonly slug: string;
  readonly nome: string;
  readonly organizador: string;
  /** Dono real da conta que criou o evento — `null` só para os poucos
   *  eventos cujo organizador não tem `usuario_id` (ver
   *  docs/modelo-mudancas.md). É o que decide o que aparece em `/organizer`. */
  readonly organizadorUsuarioId: string | null;
  readonly categoria: string;
  readonly modalidade: Modalidade;
  /** Endereço/local em texto livre para presencial e híbrido; `null` para evento online. */
  readonly local: string | null;
  readonly comecaEm: Date;
  readonly terminaEm: Date;
  /** Descrição em HTML (editor WYSIWYG) — sanitizar na borda antes de renderizar. */
  readonly descricao: string;
  readonly lotes: readonly Lote[];
  readonly status: StatusEvento;
  readonly visibilidade: Visibilidade;
  /** `null` quando `modalidade` é 'presencial'. */
  readonly formatoOnline: FormatoOnline | null;
  /** Banner do evento como data URL; `null` até o organizador enviar um. */
  readonly imagemUrl: string | null;
  /** Controlado administrativamente no banco; define a vitrine "Em destaque". */
  readonly isHighlighted: boolean;
}

const MODALIDADE_ROTULO: Record<Modalidade, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrido: 'Híbrido',
};

const STATUS_ROTULO: Record<StatusLote, string> = {
  'a-venda': 'À venda',
  'ultimo-lote': 'Último lote',
  'em-breve': 'Vendas em breve',
  esgotado: 'Esgotado',
  encerrado: 'Encerrado',
};

export function rotuloModalidade(modalidade: Modalidade): string {
  return MODALIDADE_ROTULO[modalidade];
}

export function rotuloStatus(status: StatusLote): string {
  return STATUS_ROTULO[status];
}

const STATUS_EVENTO_ROTULO: Record<StatusEvento, string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  encerrado: 'Encerrado',
  cancelado: 'Cancelado',
};

export function rotuloStatusEvento(status: StatusEvento): string {
  return STATUS_EVENTO_ROTULO[status];
}

const VISIBILIDADE_ROTULO: Record<Visibilidade, string> = {
  publico: 'Público',
  'nao-listado': 'Não listado',
};

export function rotuloVisibilidade(visibilidade: Visibilidade): string {
  return VISIBILIDADE_ROTULO[visibilidade];
}

const FORMATO_ONLINE_ROTULO: Record<FormatoOnline, string> = {
  'ao-vivo': 'Ao vivo (livestream)',
  videoconferencia: 'Videoconferência',
  'desafio-virtual': 'Desafio virtual',
  'conteudo-digital': 'Conteúdo digital (sob demanda)',
};

export function rotuloFormatoOnline(formato: FormatoOnline): string {
  return FORMATO_ONLINE_ROTULO[formato];
}

/** Slug determinístico a partir do nome — minúsculo, sem acento, hífens no
 *  lugar de espaço/pontuação. Não garante unicidade: quem persiste decide o
 *  que fazer com colisão (ver `application/criar-evento.ts`). */
export function gerarSlug(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Onde o evento acontece, já resolvido para exibição. Online não tem local. */
export function localDeExibicao(evento: Evento): string {
  return evento.local ?? 'Transmissão ao vivo';
}

/** A venda deste lote ainda não abriu — tem data de início no futuro. */
export function loteAindaNaoAbriu(lote: Lote, agora: Date): boolean {
  return lote.iniciaEm !== null && lote.iniciaEm > agora;
}

/** Um lote pode ser vendido agora: já abriu, tem vaga e não passou do prazo. */
export function loteEstaAberto(lote: Lote, agora: Date): boolean {
  return (
    !loteAindaNaoAbriu(lote, agora) &&
    lote.vendidos < lote.vagas &&
    (lote.encerraEm === null || lote.encerraEm > agora)
  );
}

/**
 * Situação de um lote isolado — o que a tabela de lotes do organizador
 * mostra por linha. Diferente de `statusDoEvento`, que resume o evento
 * inteiro numa palavra só para a vitrine.
 */
export function statusDoLote(lote: Lote, agora: Date): StatusLote {
  if (loteAindaNaoAbriu(lote, agora)) return 'em-breve';
  if (lote.vendidos >= lote.vagas) return 'esgotado';
  if (lote.encerraEm !== null && lote.encerraEm <= agora) return 'encerrado';
  return 'a-venda';
}

export function loteVigente(evento: Evento, agora: Date): Lote | null {
  const abertos = evento.lotes.filter((lote) => loteEstaAberto(lote, agora));
  return abertos[0] ?? null;
}

/**
 * Status comercial do evento. É o domínio que decide o que "último lote"
 * significa — a home apenas desenha o resultado.
 */
export function statusDoEvento(evento: Evento, agora: Date): StatusLote {
  if (evento.terminaEm <= agora) return 'encerrado';

  const vigente = loteVigente(evento, agora);
  if (vigente === null) {
    // Sem lote aberto há dois motivos opostos, e confundi-los mente para o
    // comprador: ou a fila acabou (esgotado), ou o próximo lote ainda tem
    // data de abertura no futuro (a venda volta, é só esperar).
    const abreDepois = evento.lotes.some(
      (lote) => loteAindaNaoAbriu(lote, agora) && lote.vendidos < lote.vagas,
    );
    return abreDepois ? 'em-breve' : 'esgotado';
  }

  const ehUltimoLote = vigente === evento.lotes[evento.lotes.length - 1];
  const sobra = (vigente.vagas - vigente.vendidos) / vigente.vagas;

  // Urgência é escassez real, não a mera existência de um único lote: um
  // evento com lote único e metade das vagas abertas está só à venda.
  const escasso = sobra <= 0.2;
  const ultimoEEnchendo = ehUltimoLote && sobra <= 0.4;

  return escasso || ultimoEEnchendo ? 'ultimo-lote' : 'a-venda';
}

export function ingressosVendidos(evento: Evento): number {
  return evento.lotes.reduce((total, lote) => total + lote.vendidos, 0);
}

/** Capacidade não é um campo próprio — é a soma das vagas de todos os
 *  lotes, para nunca divergir do que de fato está à venda. */
export function capacidadeTotal(evento: Evento): number {
  return evento.lotes.reduce((total, lote) => total + lote.vagas, 0);
}

/** Receita realizada até agora: soma de vendidos × preço em todos os lotes. */
export function receitaCentavos(evento: Evento): number {
  return evento.lotes.reduce((total, lote) => total + lote.vendidos * lote.precoCentavos, 0);
}

/** Menor preço ainda disponível, em centavos. `null` quando não há lote aberto. */
export function precoAPartirDe(evento: Evento, agora: Date): number | null {
  const vigente = loteVigente(evento, agora);
  return vigente?.precoCentavos ?? null;
}
