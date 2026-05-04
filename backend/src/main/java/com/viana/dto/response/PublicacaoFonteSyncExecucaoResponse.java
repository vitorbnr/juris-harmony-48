package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicacaoFonteSyncExecucaoResponse {
    private String id;
    private String tipoExecucao;
    private String status;
    private String dataInicio;
    private String dataFim;
    private Integer cadernosConsultados;
    private Integer cadernosBaixados;
    private Integer publicacoesLidas;
    private Integer publicacoesImportadas;
    private Integer falhas;
    private String mensagem;
    private String iniciadoEm;
    private String finalizadoEm;
    private String proximaExecucaoEm;
    private Long duracaoMs;
}
