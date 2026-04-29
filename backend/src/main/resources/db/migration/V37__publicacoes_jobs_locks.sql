CREATE TABLE publicacoes_jobs_locks (
    nome VARCHAR(80) PRIMARY KEY,
    locked_at TIMESTAMP,
    locked_until TIMESTAMP NOT NULL,
    locked_by VARCHAR(180),
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_publicacoes_jobs_locks_locked_until
    ON publicacoes_jobs_locks(locked_until);

INSERT INTO publicacoes_jobs_locks (nome, locked_until, atualizado_em)
VALUES ('PUBLICACOES_DJEN_SYNC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (nome) DO NOTHING;
