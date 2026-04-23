ALTER TABLE prazos
    ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_prazos_concluido_em
    ON prazos (concluido_em);

ALTER TABLE movimentacoes
    ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES usuarios(id),
    ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_criado_por_em
    ON movimentacoes (criado_por, criado_em DESC);
