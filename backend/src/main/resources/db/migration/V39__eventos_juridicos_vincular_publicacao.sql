ALTER TABLE eventos_juridicos
    ADD COLUMN publicacao_id UUID REFERENCES publicacoes(id);

CREATE INDEX idx_eventos_juridicos_publicacao
    ON eventos_juridicos(publicacao_id);

CREATE UNIQUE INDEX ux_eventos_juridicos_publicacao
    ON eventos_juridicos(publicacao_id)
    WHERE publicacao_id IS NOT NULL;
