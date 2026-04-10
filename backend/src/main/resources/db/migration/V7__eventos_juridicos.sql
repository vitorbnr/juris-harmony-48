CREATE TABLE eventos_juridicos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processo_id         UUID REFERENCES processos(id) ON DELETE CASCADE,
    fonte               VARCHAR(30)  NOT NULL,
    tipo                VARCHAR(30)  NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'NOVO',
    titulo              VARCHAR(255) NOT NULL,
    descricao           TEXT         NOT NULL,
    orgao_julgador      VARCHAR(255),
    referencia_externa  VARCHAR(255),
    hash_deduplicacao   VARCHAR(255) NOT NULL UNIQUE,
    data_evento         TIMESTAMP,
    criado_em           TIMESTAMP    NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eventos_juridicos_status ON eventos_juridicos(status);
CREATE INDEX idx_eventos_juridicos_fonte ON eventos_juridicos(fonte);
CREATE INDEX idx_eventos_juridicos_processo ON eventos_juridicos(processo_id);
CREATE INDEX idx_eventos_juridicos_data_evento ON eventos_juridicos(data_evento DESC);
