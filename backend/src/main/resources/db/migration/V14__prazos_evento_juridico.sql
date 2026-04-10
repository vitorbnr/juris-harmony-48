ALTER TABLE prazos
    ADD COLUMN evento_juridico_id UUID REFERENCES eventos_juridicos(id);

CREATE INDEX idx_prazos_evento_juridico ON prazos(evento_juridico_id);
