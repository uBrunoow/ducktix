import {
  avaliarCheckIn,
  mensagemDeRecusa,
  normalizarCodigo,
  type MotivoDeRecusa,
} from '../domain/check-in';
import { type Inscricao, nomeCompleto, resumirParticipacao } from '../domain/inscricao';
import type { InscricoesRepository } from '../ports/inscricoes';

/** O que a tela da portaria mostra depois de cada leitura. */
export interface LeituraDaPortaria {
  readonly aceito: boolean;
  readonly mensagem: string;
  readonly motivo: MotivoDeRecusa | null;
  readonly nome: string | null;
  readonly loteNome: string | null;
  readonly codigo: string;
  /** Preenchido só quando aceito — permite desfazer a entrada errada. */
  readonly inscricaoId: string | null;
}

function paraLeitura(
  codigo: string,
  inscricao: Inscricao | null,
  aceito: boolean,
  mensagem: string,
  motivo: MotivoDeRecusa | null,
): LeituraDaPortaria {
  return {
    aceito,
    mensagem,
    motivo,
    nome: inscricao ? nomeCompleto(inscricao) : null,
    loteNome: inscricao?.loteNome ?? null,
    codigo,
    inscricaoId: aceito && inscricao ? inscricao.id : null,
  };
}

/**
 * Processo de negócio do check-in (associativa `check_in`): lê um código,
 * valida contra as regras do domínio e, se passar, registra a entrada.
 *
 * A gravação só acontece depois de `avaliarCheckIn` aprovar — a decisão é do
 * domínio, a escrita é do repositório, e esta função só costura as duas.
 */
export async function realizarCheckIn(
  inscricoes: InscricoesRepository,
  eventoId: string,
  codigoBruto: string,
  agora: Date,
): Promise<LeituraDaPortaria> {
  const codigo = normalizarCodigo(codigoBruto);
  if (!codigo) {
    return paraLeitura('', null, false, 'Leia um QR ou digite o código do ingresso.', 'nao-encontrado');
  }

  const encontrada = await inscricoes.buscarPorCodigo(codigo);
  const avaliacao = avaliarCheckIn(encontrada, eventoId);

  if (!avaliacao.aceito) {
    return paraLeitura(codigo, avaliacao.inscricao, false, mensagemDeRecusa(avaliacao), avaliacao.motivo);
  }

  const gravada = await inscricoes.registrarCheckIn(avaliacao.inscricao.id, agora);
  if (!gravada) {
    return paraLeitura(codigo, avaliacao.inscricao, false, 'Não foi possível registrar a entrada. Tente de novo.', 'nao-encontrado');
  }

  return paraLeitura(codigo, gravada, true, `Entrada liberada — ${nomeCompleto(gravada)}.`, null);
}

/** Desfaz uma entrada registrada por engano (a portaria erra, e a fila anda). */
export async function desfazerCheckIn(
  inscricoes: InscricoesRepository,
  inscricaoId: string,
): Promise<boolean> {
  return (await inscricoes.desfazerCheckIn(inscricaoId)) !== null;
}

export interface PainelDaPortaria {
  readonly inscritos: number;
  readonly presentes: number;
  readonly ausentes: number;
  readonly cancelados: number;
  readonly taxaDePresenca: number;
  /** Entradas registradas na última hora — o ritmo atual da fila. */
  readonly naUltimaHora: number;
  /** Maior número de entradas dentro de um mesmo minuto. */
  readonly picoPorMinuto: number;
  readonly ultimos: readonly Inscricao[];
}

/**
 * Números da portaria. O pico por minuto e o ritmo da última hora existem
 * porque quem opera a entrada precisa saber se a fila está andando — a taxa
 * de presença acumulada só responde isso depois que acabou.
 */
export async function montarPainelDaPortaria(
  inscricoes: InscricoesRepository,
  eventoId: string,
  agora: Date,
): Promise<PainelDaPortaria> {
  const todas = await inscricoes.todasDoEvento(eventoId);
  const resumo = resumirParticipacao(todas);

  const umaHoraAtras = agora.getTime() - 60 * 60 * 1000;
  const entradas = todas.filter((i) => i.checkInEm !== null);

  const porMinuto = new Map<number, number>();
  for (const entrada of entradas) {
    const minuto = Math.floor(entrada.checkInEm!.getTime() / 60_000);
    porMinuto.set(minuto, (porMinuto.get(minuto) ?? 0) + 1);
  }

  return {
    inscritos: resumo.inscritos,
    presentes: resumo.presentes,
    ausentes: resumo.ausentes,
    cancelados: resumo.cancelados,
    taxaDePresenca: resumo.taxaDePresenca,
    naUltimaHora: entradas.filter((i) => i.checkInEm!.getTime() >= umaHoraAtras).length,
    picoPorMinuto: porMinuto.size === 0 ? 0 : Math.max(...porMinuto.values()),
    ultimos: await inscricoes.ultimosCheckIns(eventoId, 12),
  };
}
