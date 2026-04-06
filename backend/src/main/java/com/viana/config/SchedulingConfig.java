package com.viana.config;

import com.viana.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * Job agendado para limpeza de tokens expirados da blacklist (PATCH-009).
 *
 * Executa diariamente às 03:00 para manter a tabela refresh_tokens enxuta.
 */
@Slf4j
@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class SchedulingConfig {

    private final RefreshTokenRepository refreshTokenRepository;

    /**
     * Limpa refresh tokens expirados da blacklist todos os dias às 03:00.
     * Cron: segundos minutos horas dia-mês mês dia-semana
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void limparRefreshTokensExpirados() {
        try {
            int removidos = refreshTokenRepository.limparExpirados();
            if (removidos > 0) {
                log.info("[SCHEDULED] Blacklist refresh tokens: {} registros expirados removidos.", removidos);
            }
        } catch (Exception e) {
            log.error("[SCHEDULED] Erro ao limpar blacklist de refresh tokens: {}", e.getMessage());
        }
    }
}
