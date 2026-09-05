'use client';

import { useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useEnderecoPorCep } from '@/hooks/usar-endereco-por-cep';
import { formatarCep } from '@/lib/formatadores';

/**
 * CEP + logradouro/número/complemento/bairro/cidade/UF, com autopreenchimento
 * via ViaCEP quando o CEP tem 8 dígitos. `prefix` é o caminho do react-hook-form
 * até o objeto de endereço (ex.: `"endereco."` ou `"participantes.0.endereco."`)
 * — o componente lê o formulário do `FormProvider` mais próximo, então o pai
 * só precisa envolver tudo em `<Form {...formulario}>`.
 */
export function CamposDeEndereco({ prefix }: { prefix: string }) {
  const formulario = useFormContext();
  const { buscar, buscando } = useEnderecoPorCep();

  async function aoSairDoCep(cep: string) {
    const encontrado = await buscar(cep);
    if (!encontrado) {
      if (cep.replace(/\D/g, '').length === 8) toast.error('CEP não encontrado.');
      return;
    }
    formulario.setValue(`${prefix}logradouro`, encontrado.logradouro, { shouldValidate: true });
    formulario.setValue(`${prefix}bairro`, encontrado.bairro, { shouldValidate: true });
    formulario.setValue(`${prefix}cidade`, encontrado.cidade, { shouldValidate: true });
    formulario.setValue(`${prefix}uf`, encontrado.uf, { shouldValidate: true });
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <FormField
          control={formulario.control}
          name={`${prefix}cep`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  placeholder="00000-000"
                  maxLength={9}
                  {...field}
                  onChange={(e) => field.onChange(formatarCep(e.target.value))}
                  onBlur={(e) => {
                    field.onBlur();
                    aoSairDoCep(e.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[12px] text-fg-muted">{buscando ? 'Buscando endereço…' : ' '}</p>
        </div>
      </div>

      <FormField
        control={formulario.control}
        name={`${prefix}logradouro`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Endereço</FormLabel>
            <FormControl>
              <Input placeholder="Rua, avenida…" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={formulario.control}
          name={`${prefix}numero`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formulario.control}
          name={`${prefix}complemento`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Complemento (opcional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={formulario.control}
        name={`${prefix}bairro`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Bairro</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <FormField
          control={formulario.control}
          name={`${prefix}cidade`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={formulario.control}
          name={`${prefix}uf`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>UF</FormLabel>
              <FormControl>
                <Input maxLength={2} className="uppercase" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
