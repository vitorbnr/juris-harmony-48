package com.viana.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatajudSyncScheduler {

    private final ProcessoService processoService;

    @Scheduled(cron = "${app.sync.datajud.cron:0 0 */4 * * *}")
    public void sincronizarProcessosAtivos() {
        ProcessoService.DatajudSyncResumo resumo = processoService.sincronizarProcessosAtivosDatajud(true);

        log.info(
                "[DATAJUD_SYNC] Rotina finalizada. Processos avaliados: {}. Processos com novidade: {}. Novas movimentacoes: {}. Falhas: {}.",
                resumo.processosAvaliados(),
                resumo.processosComNovidade(),
                resumo.movimentacoesNovas(),
                resumo.falhas()
        );
    }
}
