-- ─── V4: Múltiplos advogados por processo ─────────────────────────────────────
-- Substitui a coluna advogado_id (FK simples) por uma tabela de junção N:M

-- 1. Cria a tabela de junção
CREATE TABLE processo_advogados (
    processo_id UUID NOT NULL,
    usuario_id  UUID NOT NULL,
    PRIMARY KEY (processo_id, usuario_id),
    CONSTRAINT fk_pa_processo FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE,
    CONSTRAINT fk_pa_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE
);

-- 2. Migra os registros existentes: cada processo com advogado_id ganha um registro na junção
INSERT INTO processo_advogados (processo_id, usuario_id)
SELECT id, advogado_id
FROM processos
WHERE advogado_id IS NOT NULL;

-- 3. Remove o índice e a coluna antiga (a FK é inline, PostgreSQL nomeia como processos_advogado_id_fkey)
DROP INDEX IF EXISTS idx_processos_advogado;
ALTER TABLE processos DROP COLUMN IF EXISTS advogado_id;
