import { FormularioRedefinirSenha } from './formulario-reset-password';
import { CascaConta, LinkDeConta } from '@/components/casca-conta';

export const dynamic = 'force-dynamic';

export default async function PaginaRedefinirSenha({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const bruto = params.token;
  const token = typeof bruto === 'string' ? bruto.trim() : '';

  // Sem token não há formulário a mostrar: o caminho de volta é pedir outro
  // link, não deixar a pessoa preencher uma senha que não vai ser aceita.
  if (!token) {
    return (
      <CascaConta
        rotulo="Link inválido"
        titulo="Este link de redefinição não é válido."
        descricao="Links de redefinição valem por uma hora e só podem ser usados uma vez. Peça um novo para continuar."
      >
        <p className="text-sm text-fg-muted">
          <LinkDeConta href="/forgot-password">Pedir um novo link</LinkDeConta>
        </p>
      </CascaConta>
    );
  }

  return <FormularioRedefinirSenha token={token} />;
}
