ALTER TABLE "evento"
ADD COLUMN "is_highlighted" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE INDEX "idx_evento_highlighted"
ON "evento" ("is_highlighted", "status", "visibilidade", "comeca_em");
