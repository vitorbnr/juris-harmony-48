ALTER TABLE eventos_juridicos
    ADD COLUMN responsavel_id UUID NULL REFERENCES usuarios(id);

CREATE INDEX idx_eventos_juridicos_responsavel ON eventos_juridicos(responsavel_id);
