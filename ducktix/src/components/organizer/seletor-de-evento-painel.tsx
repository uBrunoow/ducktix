'use client';

import { ArrowRightIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { EventoNoSeletor } from '@/components/organizer/cabecalho-organizador';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

/**
 * Porta de entrada do /organizer: escolher o evento é o primeiro passo
 * obrigatório, já que toda a navegação daqui pra frente é escopada por
 * evento. A escolha só navega ao confirmar — trocar no dropdown e já sair
 * da tela some com a chance de olhar a lista e mudar de ideia antes de ir.
 */
export function SeletorDeEventoPainel({
  eventos,
}: {
  eventos: readonly EventoNoSeletor[];
}) {
  const router = useRouter();
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const proximos = eventos.filter((e) => !e.jaAconteceu);
  const realizados = eventos.filter((e) => e.jaAconteceu);

  return (
    <div className="grid gap-3">
      <Select onValueChange={setSelecionado}>
        <SelectTrigger className="w-full min-w-0" size="default">
          <SelectValue
            placeholder="Selecione um evento"
            className="min-w-0 truncate"
          />
        </SelectTrigger>
        <SelectContent>
          {proximos.length > 0 ? (
            <SelectGroup>
              <SelectLabel>Por vir</SelectLabel>
              {proximos.map((evento) => (
                <SelectItem key={evento.id} value={evento.id}>
                  {evento.nome} · {evento.quando}
                  {evento.rascunho ? ' · rascunho' : ''}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
          {realizados.length > 0 ? (
            <SelectGroup>
              <SelectLabel>Já realizados</SelectLabel>
              {realizados.map((evento) => (
                <SelectItem key={evento.id} value={evento.id}>
                  {evento.nome} · {evento.quando}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
        </SelectContent>
      </Select>

      <Button
        type="button"
        size="lg"
        disabled={!selecionado}
        onClick={() =>
          selecionado && router.push(`/organizer/events/${selecionado}`)
        }
        className="w-full"
      >
        Confirmar
        <ArrowRightIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
