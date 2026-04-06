-- ============================================================================
-- V3__refresh_token_blacklist.sql
-- Blacklist de Refresh Tokens para suporte a logout efetivo
-- ============================================================================

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64)  NOT NULL UNIQUE,   -- SHA-256 hex do token JWT
    expira_em   TIMESTAMP    NOT NULL,
    revogado    BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rt_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_rt_usuario    ON refresh_tokens(usuario_id);
CREATE INDEX idx_rt_expira_em  ON refresh_tokens(expira_em);

-- Limpeza automática de tokens expirados (executar via job agendado ou pg_cron)
-- DELETE FROM refresh_tokens WHERE expira_em < NOW();
