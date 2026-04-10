ALTER TABLE prazos
    ADD COLUMN etapa VARCHAR(20) NOT NULL DEFAULT 'A_FAZER';

ALTER TABLE prazos
    ADD CONSTRAINT chk_prazos_etapa
        CHECK (etapa IN ('A_FAZER', 'EM_ANDAMENTO', 'CONCLUIDO'));

CREATE INDEX idx_prazos_etapa ON prazos(etapa);
