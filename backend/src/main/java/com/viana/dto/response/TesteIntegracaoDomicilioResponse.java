package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TesteIntegracaoDomicilioResponse {
    private boolean sucesso;
    private boolean readOnly;
    private int comunicacoesEncontradas;
    private String dataInicio;
    private String dataFim;
    private String origemOnBehalfOf;
    private String onBehalfOfMascarado;
}
