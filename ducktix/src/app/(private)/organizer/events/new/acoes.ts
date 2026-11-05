'use server';

import { instanteNoBrasil } from '@/lib/fuso-horario';
import { redirect } from 'next/navigation';
import { criarEvento } from '@/server/event/application/criar-evento';
import { DadosDeEventoInvalidosError } from '@/server/event/domain/erros';
import type { Evento } from '@/server/event/domain/evento';
import { mongoCatalogoPublicoRepository as catalogoPublicoRepository } from '@/server/event/infrastructure/mongo-catalogo';
import { mongoUsuariosRepository as usuariosRepository } from '@/server/identity/infrastructure/mongo-usuarios';
import { sessaoAtual } from '@/server/identity/infrastructure/sessao';
import { enderecoParaTexto, esquemaCriarEvento } from './schemas';

export interface RespostaDeCriarEvento {
  readonly erro?: string;
}

function paraCentavos(reais: number): number {
  return Math.round(reais * 100);
}

/**
 * Converte a data do formulário (YYYY-MM-DD) para o instante correto, no
 * horário de Brasília: o servidor roda em UTC.
 *
 * A abertura vale a partir do primeiro minuto do dia e o encerramento até o
 * último — é o que o organizador entende ao digitar só a data.
 */
function paraInicioDoDia(valor: string | undefined): Date | null {
  if (!valor) return null;
  const data = instanteNoBrasil(`${valor}T00:00:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

function paraDataDeEncerramento(valor: string | undefined): Date | null {
  if (!valor) return null;
  const data = instanteNoBrasil(`${valor}T23:59:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

export async function acaoCriarEvento(
  dados: unknown,
  publicarAgora: boolean,
): Promise<RespostaDeCriarEvento> {
  const analise = esquemaCriarEvento.safeParse(dados);
  if (!analise.success) {
    const primeiraMensagem = analise.error.issues[0]?.message ?? 'Dados do evento inválidos.';
    return { erro: primeiraMensagem };
  }

  // Organizador vem sempre da sessão, nunca de um campo do formulário —
  // quando existir a entidade Organizador de verdade, isto vira o vínculo
  // por FK. O middleware já garante papel === 'organizador' nesta rota;
  // a checagem aqui é defesa em profundidade.
  const sessao = await sessaoAtual();
  if (!sessao || sessao.papel !== 'organizador') redirect('/login');
  const usuario = await usuariosRepository.buscarPorId(sessao.usuarioId);
  const organizador = usuario?.nome ?? 'Organizador';

  const comecaEm = instanteNoBrasil(analise.data.comecaEm);
  const terminaEm = instanteNoBrasil(analise.data.terminaEm);
  if (Number.isNaN(comecaEm.getTime()) || Number.isNaN(terminaEm.getTime())) {
    return { erro: 'Informe datas válidas de início e término.' };
  }

  const local = analise.data.modalidade === 'online' ? null : enderecoParaTexto(analise.data.endereco);

  let evento: Evento;
  try {
    evento = await criarEvento(catalogoPublicoRepository, {
      nome: analise.data.nome,
      organizador,
      organizadorUsuarioId: sessao.usuarioId,
      categoria: analise.data.categoria,
      modalidade: analise.data.modalidade,
      formatoOnline: analise.data.formatoOnline ?? null,
      local,
      comecaEm,
      terminaEm,
      descricao: analise.data.descricao,
      imagemUrl: analise.data.imagemUrl,
      visibilidade: analise.data.visibilidade,
      aceiteTermos: analise.data.aceiteTermos,
      publicarAgora,
      lotes: analise.data.lotes.map((lote) => ({
        nome: lote.nome,
        precoCentavos: paraCentavos(lote.precoReais),
        vagas: lote.vagas,
        iniciaEm: paraInicioDoDia(lote.iniciaEm),
        encerraEm: paraDataDeEncerramento(lote.encerraEm),
      })),
    });
  } catch (erro) {
    if (erro instanceof DadosDeEventoInvalidosError) return { erro: erro.message };
    throw erro;
  }

  redirect(
    publicarAgora ? `/events/${evento.slug}` : `/organizer/events?criado=${evento.id}`,
  );
}
