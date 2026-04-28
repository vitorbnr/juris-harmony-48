CREATE TABLE publicacoes_capturas_execucoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fonte VARCHAR(30) NOT NULL,
    diario_codigo VARCHAR(40) NOT NULL,
    data_referencia DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    cadernos_consultados INTEGER NOT NULL DEFAULT 0,
    cadernos_baixados INTEGER NOT NULL DEFAULT 0,
    publicacoes_lidas INTEGER NOT NULL DEFAULT 0,
    publicacoes_importadas INTEGER NOT NULL DEFAULT 0,
    falhas INTEGER NOT NULL DEFAULT 0,
    mensagem TEXT,
    iniciado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finalizado_em TIMESTAMP,
    duracao_ms BIGINT
);

CREATE INDEX idx_publicacoes_capturas_execucoes_fonte_status
    ON publicacoes_capturas_execucoes(fonte, status);

CREATE INDEX idx_publicacoes_capturas_execucoes_diario_data
    ON publicacoes_capturas_execucoes(diario_codigo, data_referencia DESC);

CREATE INDEX idx_publicacoes_capturas_execucoes_iniciado
    ON publicacoes_capturas_execucoes(iniciado_em DESC);
