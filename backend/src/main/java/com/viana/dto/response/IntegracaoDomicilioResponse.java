package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntegracaoDomicilioResponse {
    private boolean enabled;
    private boolean readOnly;
    private boolean prontaParaConsumo;
    private String baseUrl;
    private boolean baseUrlConfigurada;
    private boolean tokenUrlConfigurada;
    private boolean clientIdConfigurado;
    private boolean clientSecretConfigurado;
    private boolean tenantIdConfigurado;
    private boolean fallbackOnBehalfOfConfigurado;
    private String tenantIdOrigem;
    private String cron;
    private Integer lookbackDays;
    private OperadorResumo operadorInstitucional;
    private boolean operadorInstitucionalValido;
    private String mensagemOperador;
    private String origemOnBehalfOf;
    private String onBehalfOfMascarado;
    private SyncResumo ultimoSync;
    private java.util.List<String> pendencias;
    private java.util.List<String> checklistAtivacao;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OperadorResumo {
        private String id;
        private String nome;
        private String email;
        private String cpfMascarado;
    }

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
}
