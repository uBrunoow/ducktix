import { FormularioRegistrar } from './formulario-register';

export const dynamic = 'force-dynamic';

export default async function PaginaRegistrar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;
  return <FormularioRegistrar next={next} />;
}
