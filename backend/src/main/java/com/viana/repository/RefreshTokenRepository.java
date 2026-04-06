package com.viana.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Repositório para a blacklist de refresh tokens (PATCH-009).
 *
 * Usa JdbcTemplate diretamente para operações simples na tabela refresh_tokens
 * (criada em V3__refresh_token_blacklist.sql).
 * Não usa JPA para evitar overhead de entidade em operações de alta frequência.
 */
@Repository
@RequiredArgsConstructor
public class RefreshTokenRepository {

    private final JdbcTemplate jdbc;

    /**
     * Salva o hash SHA-256 do refresh token emitido.
     * Chamado no login e no refresh.
     */
    public void salvar(UUID usuarioId, String tokenHash, LocalDateTime expiraEm) {
        jdbc.update("""
                INSERT INTO refresh_tokens (usuario_id, token_hash, expira_em, revogado)
                VALUES (?, ?, ?, FALSE)
                ON CONFLICT (token_hash) DO NOTHING
                """,
                usuarioId, tokenHash, expiraEm);
    }

    /**
     * Verifica se um token foi revogado ou nunca existiu (seguro por default).
     * Um token ausente da tabela também é tratado como revogado (fail-safe).
     */
    public boolean isRevogado(String tokenHash) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM refresh_tokens
                WHERE token_hash = ? AND revogado = FALSE AND expira_em > NOW()
                """,
                Integer.class, tokenHash);
        // Se não encontrou registro válido (não revogado + não expirado), considera revogado
        return count == null || count == 0;
    }

    /**
     * Marca um token como revogado (soft delete).
     * Chamado no logout e na rotação de tokens (refresh).
     */
    public void revogar(String tokenHash) {
        jdbc.update("""
                UPDATE refresh_tokens SET revogado = TRUE WHERE token_hash = ?
                """,
                tokenHash);
    }

    /**
     * Limpeza de tokens expirados — chamar via @Scheduled periodicamente.
     * Mantém a tabela enxuta sem crescimento ilimitado.
     */
    public int limparExpirados() {
        return jdbc.update("DELETE FROM refresh_tokens WHERE expira_em < NOW()");
    }
}
