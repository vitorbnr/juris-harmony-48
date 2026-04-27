package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicacaoResponse {
    private String id;
    private String npu;
    private String tribunalOrigem;
    private String teor;
    private String dataPublicacao;
    private String statusTratamento;
    private String processoId;
    private String processoNumero;
    private String dataCriacao;
    private String dataAtualizacao;
    private String iaAcaoSugerida;
    private Integer iaPrazoSugeridoDias;
    private String resumoOperacional;
    private Boolean riscoPrazo;
    private Integer scorePrioridade;
    private String justificativaPrioridade;
    private Integer iaConfianca;
    private String iaTrechosRelevantes;
    private String ladoProcessualEstimado;
}
