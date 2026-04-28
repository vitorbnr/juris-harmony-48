package com.viana.service;

import com.viana.dto.response.PublicacaoDjenSyncResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PublicacaoDjenSyncScheduler {

    private final PublicacaoDjenColetaService publicacaoDjenColetaService;

    @Scheduled(cron = "${app.sync.djen.cron:0 30 6 * * *}")
    public void sincronizarDjen() {
        PublicacaoDjenSyncResponse resumo = publicacaoDjenColetaService.sincronizar(false);
        log.info(
                "[DJEN_SYNC] enabled={}, tribunais={}, cadernos={}, lidas={}, importadas={}, falhas={}",
                resumo.isEnabled(),
                resumo.getTribunais(),
                resumo.getCadernosConsultados(),
                resumo.getPublicacoesLidas(),
                resumo.getPublicacoesImportadas(),
                resumo.getFalhas()
        );
    }
}
