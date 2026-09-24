-- Bancos criados a partir de db/schema.sql têm a unicidade global do código
-- com o nome gerado pelo Postgres, que a 0001 não remove. O código é único
-- apenas dentro de cada evento, regra validada ao criar o cupom.
ALTER TABLE "cupom" DROP CONSTRAINT IF EXISTS "cupom_codigo_key";
