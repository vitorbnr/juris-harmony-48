package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicacaoTratamentoResponse {
    private PublicacaoResponse publicacao;
    private PrazoResponse atividade;
    private String eventoJuridicoId;
    private String mensagem;
}
