CREATE TABLE processo_etiquetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    nome VARCHAR(40) NOT NULL,
    nome_normalizado VARCHAR(40) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_processo_etiqueta UNIQUE (processo_id, nome_normalizado)
);

CREATE INDEX idx_processo_etiquetas_processo ON processo_etiquetas(processo_id);
CREATE INDEX idx_processo_etiquetas_normalizado ON processo_etiquetas(nome_normalizado);
