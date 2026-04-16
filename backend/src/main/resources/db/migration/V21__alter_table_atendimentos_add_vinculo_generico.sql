ALTER TABLE atendimentos
    ADD COLUMN vinculo_tipo VARCHAR(30),
    ADD COLUMN vinculo_referencia_id UUID;

CREATE INDEX idx_atendimentos_vinculo ON atendimentos(vinculo_tipo, vinculo_referencia_id);
