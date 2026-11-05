CREATE TABLE "cancelamento_de_inscricao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inscricao_id" uuid NOT NULL,
	"motivo" varchar(200),
	"status" varchar(12) DEFAULT 'solicitado' NOT NULL,
	"solicitado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"resolvido_em" timestamp with time zone,
	CONSTRAINT "ck_cancelamento_status" CHECK ("cancelamento_de_inscricao"."status" IN ('solicitado', 'aprovado', 'negado'))
);
--> statement-breakpoint
CREATE TABLE "categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(60) NOT NULL,
	"slug" varchar(60) NOT NULL,
	CONSTRAINT "categoria_nome_unique" UNIQUE("nome"),
	CONSTRAINT "categoria_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "check_in" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingresso_id" uuid NOT NULL,
	"operador_id" uuid,
	"realizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_in_ingresso_id_unique" UNIQUE("ingresso_id")
);
--> statement-breakpoint
CREATE TABLE "cupom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(24) NOT NULL,
	"tipo_desconto" varchar(12) NOT NULL,
	"valor" integer NOT NULL,
	"valido_de" timestamp with time zone NOT NULL,
	"valido_ate" timestamp with time zone NOT NULL,
	"limite_uso" integer NOT NULL,
	"usos" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cupom_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "ck_cupom_tipo" CHECK ("cupom"."tipo_desconto" IN ('percentual', 'fixo')),
	CONSTRAINT "ck_cupom_valor" CHECK ("cupom"."valor" > 0),
	CONSTRAINT "ck_cupom_janela" CHECK ("cupom"."valido_ate" > "cupom"."valido_de"),
	CONSTRAINT "ck_cupom_limite" CHECK ("cupom"."limite_uso" > 0),
	CONSTRAINT "ck_cupom_usos" CHECK ("cupom"."usos" >= 0 AND "cupom"."usos" <= "cupom"."limite_uso"),
	CONSTRAINT "ck_cupom_percentual" CHECK ("cupom"."tipo_desconto" <> 'percentual' OR "cupom"."valor" <= 100)
);
--> statement-breakpoint
CREATE TABLE "cupom_evento" (
	"cupom_id" uuid NOT NULL,
	"evento_id" uuid NOT NULL,
	CONSTRAINT "cupom_evento_cupom_id_evento_id_pk" PRIMARY KEY("cupom_id","evento_id")
);
--> statement-breakpoint
CREATE TABLE "evento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizador_id" uuid NOT NULL,
	"slug" varchar(160) NOT NULL,
	"nome" varchar(140) NOT NULL,
	"descricao" text NOT NULL,
	"local" varchar(160),
	"modalidade" varchar(12) NOT NULL,
	"formato_online" varchar(20),
	"status" varchar(12) DEFAULT 'rascunho' NOT NULL,
	"visibilidade" varchar(12) DEFAULT 'publico' NOT NULL,
	"comeca_em" timestamp with time zone NOT NULL,
	"termina_em" timestamp with time zone NOT NULL,
	"imagem_url" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evento_slug_unique" UNIQUE("slug"),
	CONSTRAINT "ck_evento_modalidade" CHECK ("evento"."modalidade" IN ('presencial', 'online', 'hibrido')),
	CONSTRAINT "ck_evento_formato" CHECK ("evento"."formato_online" IS NULL OR "evento"."formato_online" IN ('ao-vivo', 'videoconferencia', 'desafio-virtual', 'conteudo-digital')),
	CONSTRAINT "ck_evento_status" CHECK ("evento"."status" IN ('rascunho', 'publicado', 'encerrado', 'cancelado')),
	CONSTRAINT "ck_evento_visibilidade" CHECK ("evento"."visibilidade" IN ('publico', 'nao-listado')),
	CONSTRAINT "ck_evento_periodo" CHECK ("evento"."termina_em" > "evento"."comeca_em"),
	CONSTRAINT "ck_evento_local_por_modalidade" CHECK (("evento"."modalidade" = 'online' AND "evento"."local" IS NULL) OR ("evento"."modalidade" <> 'online' AND "evento"."local" IS NOT NULL)),
	CONSTRAINT "ck_evento_formato_por_modalidade" CHECK (("evento"."modalidade" = 'presencial' AND "evento"."formato_online" IS NULL) OR ("evento"."modalidade" <> 'presencial' AND "evento"."formato_online" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "evento_categoria" (
	"evento_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	CONSTRAINT "evento_categoria_evento_id_categoria_id_pk" PRIMARY KEY("evento_id","categoria_id")
);
--> statement-breakpoint
CREATE TABLE "ingresso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inscricao_id" uuid NOT NULL,
	"codigo" varchar(64) NOT NULL,
	"status" varchar(12) DEFAULT 'emitido' NOT NULL,
	"emitido_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingresso_inscricao_id_unique" UNIQUE("inscricao_id"),
	CONSTRAINT "ingresso_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "ck_ingresso_status" CHECK ("ingresso"."status" IN ('emitido', 'utilizado', 'cancelado'))
);
--> statement-breakpoint
CREATE TABLE "inscricao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"participante_id" uuid NOT NULL,
	"item_pedido_id" uuid NOT NULL,
	"lote_id" uuid NOT NULL,
	"preco_pago_centavos" integer NOT NULL,
	"status" varchar(12) DEFAULT 'ativa' NOT NULL,
	"como_conheceu" varchar(120),
	"inscrito_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uk_inscricao" UNIQUE("evento_id","participante_id","item_pedido_id"),
	CONSTRAINT "ck_inscricao_status" CHECK ("inscricao"."status" IN ('ativa', 'cancelada')),
	CONSTRAINT "ck_inscricao_preco" CHECK ("inscricao"."preco_pago_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "item_pedido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"lote_id" uuid NOT NULL,
	"quantidade" integer NOT NULL,
	"preco_unitario_centavos" integer NOT NULL,
	CONSTRAINT "uk_item_pedido_lote" UNIQUE("pedido_id","lote_id"),
	CONSTRAINT "ck_item_quantidade" CHECK ("item_pedido"."quantidade" > 0),
	CONSTRAINT "ck_item_preco" CHECK ("item_pedido"."preco_unitario_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "lote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"nome" varchar(60) NOT NULL,
	"preco_centavos" integer NOT NULL,
	"vagas" integer NOT NULL,
	"vendidos" integer DEFAULT 0 NOT NULL,
	"inicia_em" timestamp with time zone,
	"encerra_em" timestamp with time zone,
	"ordem" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "uk_lote_nome" UNIQUE("evento_id","nome"),
	CONSTRAINT "ck_lote_preco" CHECK ("lote"."preco_centavos" >= 0),
	CONSTRAINT "ck_lote_vagas" CHECK ("lote"."vagas" > 0),
	CONSTRAINT "ck_lote_vendidos" CHECK ("lote"."vendidos" >= 0),
	CONSTRAINT "ck_lote_estoque" CHECK ("lote"."vendidos" <= "lote"."vagas"),
	CONSTRAINT "ck_lote_janela" CHECK ("lote"."inicia_em" IS NULL OR "lote"."encerra_em" IS NULL OR "lote"."encerra_em" > "lote"."inicia_em")
);
--> statement-breakpoint
CREATE TABLE "organizador" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"nome_fantasia" varchar(140) NOT NULL,
	"documento" varchar(14),
	"email_contato" varchar(160),
	CONSTRAINT "organizador_usuario_id_unique" UNIQUE("usuario_id")
);
--> statement-breakpoint
CREATE TABLE "pagamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"metodo" varchar(10) NOT NULL,
	"status" varchar(12) DEFAULT 'pendente' NOT NULL,
	"valor_centavos" integer NOT NULL,
	"codigo_externo" varchar(200),
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"pago_em" timestamp with time zone,
	CONSTRAINT "ck_pagamento_metodo" CHECK ("pagamento"."metodo" IN ('cartao', 'pix', 'boleto')),
	CONSTRAINT "ck_pagamento_status" CHECK ("pagamento"."status" IN ('pendente', 'aprovado', 'recusado', 'estornado')),
	CONSTRAINT "ck_pagamento_valor" CHECK ("pagamento"."valor_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "participante" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"nome" varchar(80) NOT NULL,
	"sobrenome" varchar(80) NOT NULL,
	"email" varchar(160) NOT NULL,
	"celular" varchar(20),
	"nome_cracha" varchar(80),
	"linkedin" varchar(200),
	"github" varchar(200),
	"empresa" varchar(140),
	"segmento" varchar(80),
	"cargo" varchar(80),
	"nivel" varchar(40)
);
--> statement-breakpoint
CREATE TABLE "pedido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comprador_id" uuid NOT NULL,
	"status" varchar(12) DEFAULT 'aberto' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"reservado_ate" timestamp with time zone,
	"confirmado_em" timestamp with time zone,
	"cobranca_cpf" varchar(11),
	"cobranca_cep" varchar(8),
	"cobranca_logradouro" varchar(160),
	"cobranca_numero" varchar(20),
	"cobranca_complemento" varchar(80),
	"cobranca_bairro" varchar(80),
	"cobranca_cidade" varchar(80),
	"cobranca_uf" char(2),
	"cupom_id" uuid,
	"participantes_rascunho" jsonb,
	CONSTRAINT "ck_pedido_status" CHECK ("pedido"."status" IN ('aberto', 'confirmado', 'cancelado')),
	CONSTRAINT "ck_pedido_cobranca" CHECK ("pedido"."status" <> 'confirmado' OR ("pedido"."cobranca_cpf" IS NOT NULL AND "pedido"."cobranca_cep" IS NOT NULL AND "pedido"."cobranca_logradouro" IS NOT NULL AND "pedido"."cobranca_cidade" IS NOT NULL AND "pedido"."cobranca_uf" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "token_redefinicao_senha" (
	"token" varchar(120) PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"expira_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uso_de_cupom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cupom_id" uuid NOT NULL,
	"pedido_id" uuid NOT NULL,
	"evento_id" uuid NOT NULL,
	"desconto_centavos" integer NOT NULL,
	"usado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uk_uso_cupom" UNIQUE("cupom_id","pedido_id","evento_id"),
	CONSTRAINT "ck_uso_desconto" CHECK ("uso_de_cupom"."desconto_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(120) NOT NULL,
	"email" varchar(160) NOT NULL,
	"senha_hash" varchar(255) NOT NULL,
	"papel" varchar(20) NOT NULL,
	"cpf_cnpj" varchar(14),
	"foto_url" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_email_unique" UNIQUE("email"),
	CONSTRAINT "ck_usuario_papel" CHECK ("usuario"."papel" IN ('participante', 'organizador')),
	CONSTRAINT "ck_usuario_documento" CHECK ("usuario"."cpf_cnpj" IS NULL OR length("usuario"."cpf_cnpj") IN (11, 14))
);
--> statement-breakpoint
ALTER TABLE "cancelamento_de_inscricao" ADD CONSTRAINT "cancelamento_de_inscricao_inscricao_id_inscricao_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_ingresso_id_ingresso_id_fk" FOREIGN KEY ("ingresso_id") REFERENCES "public"."ingresso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_operador_id_usuario_id_fk" FOREIGN KEY ("operador_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupom_evento" ADD CONSTRAINT "cupom_evento_cupom_id_cupom_id_fk" FOREIGN KEY ("cupom_id") REFERENCES "public"."cupom"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupom_evento" ADD CONSTRAINT "cupom_evento_evento_id_evento_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."evento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento" ADD CONSTRAINT "evento_organizador_id_organizador_id_fk" FOREIGN KEY ("organizador_id") REFERENCES "public"."organizador"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_categoria" ADD CONSTRAINT "evento_categoria_evento_id_evento_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."evento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_categoria" ADD CONSTRAINT "evento_categoria_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingresso" ADD CONSTRAINT "ingresso_inscricao_id_inscricao_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscricao" ADD CONSTRAINT "inscricao_evento_id_evento_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."evento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscricao" ADD CONSTRAINT "inscricao_participante_id_participante_id_fk" FOREIGN KEY ("participante_id") REFERENCES "public"."participante"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscricao" ADD CONSTRAINT "inscricao_item_pedido_id_item_pedido_id_fk" FOREIGN KEY ("item_pedido_id") REFERENCES "public"."item_pedido"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscricao" ADD CONSTRAINT "inscricao_lote_id_lote_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_pedido" ADD CONSTRAINT "item_pedido_pedido_id_pedido_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_pedido" ADD CONSTRAINT "item_pedido_lote_id_lote_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote" ADD CONSTRAINT "lote_evento_id_evento_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."evento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizador" ADD CONSTRAINT "organizador_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_pedido_id_pedido_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participante" ADD CONSTRAINT "participante_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_comprador_id_usuario_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_cupom_id_cupom_id_fk" FOREIGN KEY ("cupom_id") REFERENCES "public"."cupom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_redefinicao_senha" ADD CONSTRAINT "token_redefinicao_senha_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uso_de_cupom" ADD CONSTRAINT "uso_de_cupom_cupom_id_cupom_id_fk" FOREIGN KEY ("cupom_id") REFERENCES "public"."cupom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uso_de_cupom" ADD CONSTRAINT "uso_de_cupom_pedido_id_pedido_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uso_de_cupom" ADD CONSTRAINT "uso_de_cupom_evento_id_evento_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."evento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_check_in_ingresso" ON "check_in" USING btree ("ingresso_id");--> statement-breakpoint
CREATE INDEX "idx_evento_status_comeca" ON "evento" USING btree ("status","comeca_em");--> statement-breakpoint
CREATE INDEX "idx_evento_organizador" ON "evento" USING btree ("organizador_id");--> statement-breakpoint
CREATE INDEX "idx_evento_categoria_cat" ON "evento_categoria" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "idx_ingresso_codigo" ON "ingresso" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "idx_inscricao_evento" ON "inscricao" USING btree ("evento_id","status");--> statement-breakpoint
CREATE INDEX "idx_inscricao_participante" ON "inscricao" USING btree ("participante_id");--> statement-breakpoint
CREATE INDEX "idx_inscricao_lote" ON "inscricao" USING btree ("lote_id");--> statement-breakpoint
CREATE INDEX "idx_item_pedido_pedido" ON "item_pedido" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "idx_item_pedido_lote" ON "item_pedido" USING btree ("lote_id");--> statement-breakpoint
CREATE INDEX "idx_lote_evento" ON "lote" USING btree ("evento_id");--> statement-breakpoint
CREATE INDEX "idx_pagamento_pedido" ON "pagamento" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "idx_pedido_comprador" ON "pedido" USING btree ("comprador_id","status");--> statement-breakpoint
CREATE INDEX "idx_uso_cupom_cupom" ON "uso_de_cupom" USING btree ("cupom_id");--> statement-breakpoint
CREATE INDEX "idx_uso_cupom_evento" ON "uso_de_cupom" USING btree ("evento_id");