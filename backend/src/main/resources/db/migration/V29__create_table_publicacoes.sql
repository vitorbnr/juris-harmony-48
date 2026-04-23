CREATE TABLE publicacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npu VARCHAR(30),
    tribunal_origem VARCHAR(150) NOT NULL,
    teor TEXT NOT NULL,
    data_publicacao TIMESTAMP NOT NULL,
    status_tratamento VARCHAR(20) NOT NULL CHECK (status_tratamento IN ('PENDENTE', 'TRATADA', 'DESCARTADA')),
    processo_id UUID REFERENCES processos(id),
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ia_acao_sugerida VARCHAR(120),
    ia_prazo_sugerido_dias INTEGER
);

CREATE INDEX idx_publicacoes_status ON publicacoes(status_tratamento);
CREATE INDEX idx_publicacoes_data_publicacao ON publicacoes(data_publicacao DESC);
CREATE INDEX idx_publicacoes_processo ON publicacoes(processo_id);
