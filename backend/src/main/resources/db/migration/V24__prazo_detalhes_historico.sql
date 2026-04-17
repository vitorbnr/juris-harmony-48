ALTER TABLE logs_auditoria
    ADD COLUMN IF NOT EXISTS referencia_tipo VARCHAR(40),
    ADD COLUMN IF NOT EXISTS referencia_id UUID;

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_referencia
    ON logs_auditoria (referencia_tipo, referencia_id, data_hora DESC);

CREATE TABLE IF NOT EXISTS prazo_comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prazo_id UUID NOT NULL REFERENCES prazos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    conteudo TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prazo_comentarios_prazo
    ON prazo_comentarios (prazo_id, criado_em DESC);
