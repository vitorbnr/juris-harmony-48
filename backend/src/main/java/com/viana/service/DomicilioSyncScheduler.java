package com.viana.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class DomicilioSyncScheduler {

    private final DomicilioSyncService domicilioSyncService;

    @Scheduled(cron = "${app.sync.domicilio.cron:0 0 */2 * * *}")
    public void sincronizarComunicacoes() {
        if (!domicilioSyncService.isEnabled()) {
            return;
        }

        LocalDate hoje = LocalDate.now();
        LocalDate inicio = hoje.minusDays(1);

        try {
            int eventos = domicilioSyncService.sincronizar(inicio, hoje, null, true);
            log.info("[DOMICILIO_SYNC] Rotina read-only finalizada. Novos eventos: {}.", eventos);
        } catch (Exception ex) {
            log.warn("[DOMICILIO_SYNC] Falha na rotina read-only: {}", ex.getMessage());
        }
    }
}
