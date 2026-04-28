CREATE TABLE publicacoes_fontes_monitoradas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(20) NOT NULL,
    nome_exibicao VARCHAR(180) NOT NULL,
    valor_monitorado VARCHAR(180) NOT NULL,
    uf VARCHAR(2),
    observacao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por_usuario_id UUID REFERENCES usuarios(id),
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_publicacoes_fontes_monitoradas_ativas
    ON publicacoes_fontes_monitoradas(tipo, UPPER(valor_monitorado), COALESCE(UPPER(uf), ''))
    WHERE ativo = TRUE;

CREATE INDEX idx_publicacoes_fontes_monitoradas_ativo
    ON publicacoes_fontes_monitoradas(ativo);

CREATE INDEX idx_publicacoes_fontes_monitoradas_tipo
    ON publicacoes_fontes_monitoradas(tipo);
