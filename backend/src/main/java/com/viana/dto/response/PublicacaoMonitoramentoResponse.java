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
public class PublicacaoMonitoramentoResponse {
    private long fontesMonitoradas;
    private long fontesAtivas;
    private long publicacoesPendentes;
    private long publicacoesSemVinculo;
    private long publicacoesSemResponsavel;
    private FonteSaude datajud;
    private FonteSaude djen;
    private CapturaSlaResumo djenSla;
    private List<CapturaDiarioSaude> djenDiarios;
    private List<CapturaHistoricoDia> djenHistorico;
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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CapturaSlaResumo {
        private int total;
        private int saudaveis;
        private int atrasados;
        private int comErro;
        private int semCaderno;
        private int semMatch;
        private int nuncaExecutados;
        private int slaHoras;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CapturaDiarioSaude {
        private String codigo;
        private String nome;
        private String uf;
        private String status;
        private String ultimoStatus;
        private String dataReferencia;
        private String ultimoSyncEm;
        private Long horasDesdeUltimaExecucao;
        private Integer publicacoesLidas;
        private Integer publicacoesImportadas;
        private String mensagem;
        private String erroTipo;
        private Integer erroCodigoHttp;
        private boolean reprocessavel;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CapturaHistoricoDia {
        private String data;
        private int totalExecucoes;
        private int sucessos;
        private int erros;
        private int pendentes;
        private int cadernosConsultados;
        private int cadernosBaixados;
        private int publicacoesLidas;
        private int publicacoesImportadas;
        private int falhas;
        private Long duracaoMediaMs;
        private String status;
    }
}
