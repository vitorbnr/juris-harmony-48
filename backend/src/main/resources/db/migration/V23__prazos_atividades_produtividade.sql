ALTER TABLE prazos
    ADD COLUMN IF NOT EXISTS etiqueta VARCHAR(80),
    ADD COLUMN IF NOT EXISTS data_fim DATE,
    ADD COLUMN IF NOT EXISTS hora_fim TIME,
    ADD COLUMN IF NOT EXISTS dia_inteiro BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS local VARCHAR(255),
    ADD COLUMN IF NOT EXISTS modalidade VARCHAR(20),
    ADD COLUMN IF NOT EXISTS sala VARCHAR(120),
    ADD COLUMN IF NOT EXISTS alerta_valor INTEGER,
    ADD COLUMN IF NOT EXISTS alerta_unidade VARCHAR(10),
    ADD COLUMN IF NOT EXISTS vinculo_tipo VARCHAR(20),
    ADD COLUMN IF NOT EXISTS vinculo_referencia_id UUID,
    ADD COLUMN IF NOT EXISTS quadro_kanban VARCHAR(80) NOT NULL DEFAULT 'Operacional';

ALTER TABLE prazos
    DROP CONSTRAINT IF EXISTS chk_prazos_modalidade;

ALTER TABLE prazos
    ADD CONSTRAINT chk_prazos_modalidade
        CHECK (modalidade IS NULL OR modalidade IN ('PRESENCIAL', 'ONLINE', 'HIBRIDO'));

ALTER TABLE prazos
    DROP CONSTRAINT IF EXISTS chk_prazos_alerta_unidade;

ALTER TABLE prazos
    ADD CONSTRAINT chk_prazos_alerta_unidade
        CHECK (alerta_unidade IS NULL OR alerta_unidade IN ('HORAS', 'DIAS'));

ALTER TABLE prazos
    DROP CONSTRAINT IF EXISTS chk_prazos_vinculo_tipo;

ALTER TABLE prazos
    ADD CONSTRAINT chk_prazos_vinculo_tipo
        CHECK (vinculo_tipo IS NULL OR vinculo_tipo IN ('PROCESSO', 'CASO', 'ATENDIMENTO'));

ALTER TABLE prazos
    DROP CONSTRAINT IF EXISTS chk_prazos_alerta_valor;

ALTER TABLE prazos
    ADD CONSTRAINT chk_prazos_alerta_valor
        CHECK (alerta_valor IS NULL OR alerta_valor >= 0);

CREATE INDEX IF NOT EXISTS idx_prazos_data_fim ON prazos(data_fim);
CREATE INDEX IF NOT EXISTS idx_prazos_quadro_kanban ON prazos(quadro_kanban);
CREATE INDEX IF NOT EXISTS idx_prazos_vinculo ON prazos(vinculo_tipo, vinculo_referencia_id);

CREATE TABLE IF NOT EXISTS prazos_participantes (
    prazo_id UUID NOT NULL REFERENCES prazos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    PRIMARY KEY (prazo_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_prazos_participantes_usuario ON prazos_participantes(usuario_id);
