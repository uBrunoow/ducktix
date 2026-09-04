import Link from 'next/link';
import { Cabecalho } from '@/components/cabecalho';
import { Seta } from '@/components/marca';
import { Faixa, Moldura, Rotulo } from '@/components/moldura';
import { Rodape } from '@/components/rodape';
import { Button } from '@/components/ui/button';

/**
 * Marcador honesto de rota. Existe para que nenhum link da navegação nasça
 * morto enquanto as telas de verdade são construídas — e para dizer ao
 * visitante o que vai estar aqui, não fingir que a página está pronta.
 */
export function EmConstrucao({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <Moldura>
      <Cabecalho />
      <Faixa className="py-24 md:py-32">
        <div className="mx-auto max-w-[42rem] text-center">
          <Rotulo>Em construção</Rotulo>
          <h1 className="display mt-6 text-[clamp(2rem,4.5vw,3rem)] text-balance">
            {titulo}
          </h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-[15px] text-fg-muted">
            {descricao}
          </p>
          <Button asChild className="mt-8">
            <Link href="/">
              Voltar para a home
              <Seta />
            </Link>
          </Button>
        </div>
      </Faixa>
      <Rodape />
    </Moldura>
  );
}
