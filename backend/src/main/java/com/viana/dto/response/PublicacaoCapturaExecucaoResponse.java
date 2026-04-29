package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicacaoCapturaExecucaoResponse {
    private String id;
    private String fonte;
    private String diarioCodigo;
    private String dataReferencia;
    private String status;
    private Integer cadernosConsultados;
    private Integer cadernosBaixados;
    private Integer publicacoesLidas;
    private Integer publicacoesImportadas;
    private Integer falhas;
    private String mensagem;
    private String erroTipo;
    private Integer erroCodigoHttp;
    private String iniciadoEm;
    private String finalizadoEm;
    private Long duracaoMs;
}
