package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicacaoMonitoramentoResponse {
    private long fontesMonitoradas;
    private long fontesAtivas;
    private long publicacoesPendentes;
    private long publicacoesSemVinculo;
    private long publicacoesSemResponsavel;
    private FonteSaude datajud;
    private FonteSaude djen;
    private FonteSaude dou;
    private String orientacaoOperacional;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FonteSaude {
        private String fonte;
        private String status;
        private boolean configurada;
        private long monitorados;
        private long saudaveis;
        private long comErro;
        private String ultimoSyncEm;
        private String proximoSyncEm;
        private String mensagem;
    }
}
