ALTER TABLE publicacoes
    ADD COLUMN fonte VARCHAR(30),
    ADD COLUMN identificador_externo VARCHAR(180),
    ADD COLUMN captada_em_nome VARCHAR(180),
    ADD COLUMN oab_monitorada VARCHAR(30),
    ADD COLUMN hash_deduplicacao VARCHAR(120),
    ADD COLUMN status_fluxo VARCHAR(30) NOT NULL DEFAULT 'RECEBIDA',
    ADD COLUMN responsavel_processo_id UUID REFERENCES usuarios(id),
    ADD COLUMN atribuida_para_usuario_id UUID REFERENCES usuarios(id),
    ADD COLUMN assumida_por_usuario_id UUID REFERENCES usuarios(id),
    ADD COLUMN tratada_por_usuario_id UUID REFERENCES usuarios(id),
    ADD COLUMN data_atribuicao TIMESTAMP,
    ADD COLUMN data_assuncao TIMESTAMP,
    ADD COLUMN data_tratamento TIMESTAMP,
    ADD COLUMN motivo_descarte VARCHAR(255);

CREATE UNIQUE INDEX ux_publicacoes_hash_deduplicacao
    ON publicacoes(hash_deduplicacao)
    WHERE hash_deduplicacao IS NOT NULL;

CREATE INDEX idx_publicacoes_status_fluxo ON publicacoes(status_fluxo);
CREATE INDEX idx_publicacoes_atribuida_para ON publicacoes(atribuida_para_usuario_id);
CREATE INDEX idx_publicacoes_assumida_por ON publicacoes(assumida_por_usuario_id);

CREATE TABLE publicacoes_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publicacao_id UUID NOT NULL REFERENCES publicacoes(id) ON DELETE CASCADE,
    acao VARCHAR(40) NOT NULL,
    usuario_id UUID REFERENCES usuarios(id),
    usuario_destino_id UUID REFERENCES usuarios(id),
    observacao TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_publicacoes_historico_publicacao ON publicacoes_historico(publicacao_id, criado_em DESC);
