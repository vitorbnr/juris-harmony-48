CREATE TABLE fontes_sync (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fonte              VARCHAR(30)  NOT NULL,
    referencia_tipo    VARCHAR(30)  NOT NULL,
    referencia_id      UUID         NOT NULL,
    referencia_externa VARCHAR(255),
    status             VARCHAR(20)  NOT NULL DEFAULT 'PENDENTE',
    ultimo_sync_em     TIMESTAMP,
    ultimo_sucesso_em  TIMESTAMP,
    proximo_sync_em    TIMESTAMP,
    tentativas         INTEGER      NOT NULL DEFAULT 0,
    ultima_mensagem    TEXT,
    criado_em          TIMESTAMP    NOT NULL DEFAULT NOW(),
    atualizado_em      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fontes_sync UNIQUE (fonte, referencia_tipo, referencia_id)
);

CREATE INDEX idx_fontes_sync_status ON fontes_sync(status);
CREATE INDEX idx_fontes_sync_proximo ON fontes_sync(proximo_sync_em);
CREATE INDEX idx_fontes_sync_referencia ON fontes_sync(referencia_tipo, referencia_id);
