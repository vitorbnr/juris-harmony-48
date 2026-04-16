ALTER TABLE atendimentos
    ADD COLUMN processo_id UUID REFERENCES processos(id);

CREATE INDEX idx_atendimentos_processo ON atendimentos(processo_id);
