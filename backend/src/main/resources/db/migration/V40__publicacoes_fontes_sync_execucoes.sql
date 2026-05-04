CREATE TABLE publicacoes_fontes_sync_execucoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fonte_monitorada_id UUID NOT NULL REFERENCES publicacoes_fontes_monitoradas(id) ON DELETE CASCADE,
    tipo_execucao VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    data_inicio DATE,
    data_fim DATE,
    cadernos_consultados INTEGER NOT NULL DEFAULT 0,
    cadernos_baixados INTEGER NOT NULL DEFAULT 0,
    publicacoes_lidas INTEGER NOT NULL DEFAULT 0,
    publicacoes_importadas INTEGER NOT NULL DEFAULT 0,
    falhas INTEGER NOT NULL DEFAULT 0,
    mensagem TEXT,
    iniciado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finalizado_em TIMESTAMP,
    proxima_execucao_em TIMESTAMP,
    duracao_ms BIGINT
);

CREATE INDEX idx_publicacoes_fontes_sync_fonte_inicio
    ON publicacoes_fontes_sync_execucoes(fonte_monitorada_id, iniciado_em DESC);

CREATE INDEX idx_publicacoes_fontes_sync_tipo_status
    ON publicacoes_fontes_sync_execucoes(tipo_execucao, status);
