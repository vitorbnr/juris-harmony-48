ALTER TABLE publicacoes
    ADD COLUMN resumo_operacional TEXT,
    ADD COLUMN risco_prazo BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN score_prioridade INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN justificativa_prioridade VARCHAR(255),
    ADD COLUMN ia_confianca INTEGER,
    ADD COLUMN ia_trechos_relevantes TEXT,
    ADD COLUMN lado_processual_estimado VARCHAR(30);

CREATE INDEX idx_publicacoes_risco_prazo ON publicacoes(risco_prazo);
CREATE INDEX idx_publicacoes_score_prioridade ON publicacoes(score_prioridade DESC, data_publicacao DESC);
