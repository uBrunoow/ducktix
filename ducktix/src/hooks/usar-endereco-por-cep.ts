'use client';

import { useState } from 'react';

export interface EnderecoPorCep {
  readonly logradouro: string;
  readonly bairro: string;
  readonly cidade: string;
  readonly uf: string;
}

/**
 * Busca endereço pelo CEP via ViaCEP (API pública, sem chave, CORS liberado
 * para uso direto no cliente). Se o ViaCEP cair, não há novo cadastro de
 * fallback nesta fase — o campo continua editável manualmente.
 */
export function useEnderecoPorCep() {
  const [buscando, setBuscando] = useState(false);

  async function buscar(cep: string): Promise<EnderecoPorCep | null> {
    const digitos = cep.replace(/\D/g, '');
    if (digitos.length !== 8) return null;

    setBuscando(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      if (!resposta.ok) return null;
      const dados = await resposta.json();
      if (dados.erro) return null;
      return {
        logradouro: dados.logradouro ?? '',
        bairro: dados.bairro ?? '',
        cidade: dados.localidade ?? '',
        uf: dados.uf ?? '',
      };
    } catch {
      return null;
    } finally {
      setBuscando(false);
    }
  }

  return { buscar, buscando };
}
