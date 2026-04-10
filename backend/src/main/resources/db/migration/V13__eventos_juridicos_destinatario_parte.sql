ALTER TABLE eventos_juridicos
    ADD COLUMN destinatario VARCHAR(255),
    ADD COLUMN parte_relacionada VARCHAR(200);

CREATE INDEX idx_eventos_juridicos_destinatario ON eventos_juridicos(destinatario);
