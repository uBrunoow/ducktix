import { FormularioLogin } from './formulario-login';

export const dynamic = 'force-dynamic';

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;
  return <FormularioLogin redefinida={params.redefinida === '1'} next={next} />;
}
