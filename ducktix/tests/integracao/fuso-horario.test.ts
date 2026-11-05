import { describe, expect, it } from 'vitest';
import { FUSO_HORARIO, dataHoraNoBrasil, diaNoBrasil, instanteNoBrasil } from '@/lib/fuso-horario';

describe('horário de Brasília', () => {
  it('lê o que foi digitado como hora de Brasília, qualquer que seja o fuso do servidor', () => {
    expect(instanteNoBrasil('2026-12-12T19:00').toISOString()).toBe('2026-12-12T22:00:00.000Z');
  });

  it('devolve ao formulário a mesma hora digitada', () => {
    expect(dataHoraNoBrasil(instanteNoBrasil('2026-12-12T19:00'))).toBe('2026-12-12T19:00');
  });

  it('o fim do dia não vira o dia seguinte', () => {
    expect(diaNoBrasil(instanteNoBrasil('2026-12-12T23:59:59'))).toBe('2026-12-12');
  });

  it('formata no fuso de Brasília mesmo com o processo em UTC', () => {
    const hora = new Intl.DateTimeFormat('pt-BR', {
      timeZone: FUSO_HORARIO,
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(hora.format(new Date('2026-11-05T19:47:00Z'))).toBe('16:47');
  });
});
