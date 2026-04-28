package com.viana.service;

import com.viana.dto.response.PublicacaoDouSyncResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PublicacaoDouSyncScheduler {

    private final PublicacaoDouColetaService publicacaoDouColetaService;

    @Scheduled(cron = "${app.sync.dou.cron:0 45 6 * * *}")
    public void sincronizarDou() {
        PublicacaoDouSyncResponse resumo = publicacaoDouColetaService.sincronizar(false);
        log.info(
                "[DOU_SYNC] enabled={}, configurada={}, secoes={}, cadernos={}, lidas={}, importadas={}, falhas={}",
                resumo.isEnabled(),
                resumo.isConfigurada(),
                resumo.getSecoes(),
                resumo.getCadernosConsultados(),
                resumo.getPublicacoesLidas(),
                resumo.getPublicacoesImportadas(),
                resumo.getFalhas()
        );
    }
}
