ALTER TABLE notificacoes
    ADD COLUMN IF NOT EXISTS chave_externa VARCHAR(160),
    ADD COLUMN IF NOT EXISTS referencia_tipo VARCHAR(40),
    ADD COLUMN IF NOT EXISTS referencia_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uk_notificacoes_usuario_chave_externa
    ON notificacoes(usuario_id, chave_externa)
    WHERE chave_externa IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notificacoes_referencia
    ON notificacoes(referencia_tipo, referencia_id);
