package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntegracaoDatajudResponse {
    private boolean prontaParaConsumo;
    private String baseUrl;
    private boolean baseUrlConfigurada;
    private boolean apiKeyConfigurada;
    private String cron;
    private Integer staleHours;
    private long processosMonitorados;
    private long processosSaudaveis;
    private long processosComErro;
    private long processosPendentes;
    private SyncResumo ultimoSync;
    private List<FalhaResumo> falhasRecentes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncResumo {
        private String status;
        private String ultimoSyncEm;
        private String ultimoSucessoEm;
        private String proximoSyncEm;
        private Integer tentativas;
        private String mensagem;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FalhaResumo {
        private String syncId;
        private String processoId;
        private String processoNumero;
        private String clienteNome;
        private String status;
        private String ultimoSyncEm;
        private String proximoSyncEm;
        private Integer tentativas;
        private String mensagem;
    }
}
