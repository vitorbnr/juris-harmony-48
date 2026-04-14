ALTER TABLE pastas
    ADD COLUMN unidade_id UUID REFERENCES unidades(id);

UPDATE pastas p
SET unidade_id = c.unidade_id
FROM clientes c
WHERE p.cliente_id = c.id
  AND p.unidade_id IS NULL;

UPDATE pastas p
SET unidade_id = pr.unidade_id
FROM processos pr
WHERE p.processo_id = pr.id
  AND p.unidade_id IS NULL;

UPDATE pastas p
SET unidade_id = parent.unidade_id
FROM pastas parent
WHERE p.parent_id = parent.id
  AND p.unidade_id IS NULL;

CREATE INDEX idx_pastas_unidade ON pastas(unidade_id);
