ALTER TABLE movimentacoes
    ADD COLUMN origem VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN codigo_externo INTEGER,
    ADD COLUMN chave_externa VARCHAR(255),
    ADD COLUMN orgao_julgador VARCHAR(255),
    ADD COLUMN data_hora_original TIMESTAMP;

CREATE INDEX idx_movimentacoes_data_hora_original ON movimentacoes(data_hora_original);

CREATE UNIQUE INDEX uk_movimentacoes_processo_chave_externa
    ON movimentacoes(processo_id, chave_externa)
    WHERE chave_externa IS NOT NULL;
