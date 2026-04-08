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
public class DatajudCapaResponse {
    private String numeroCnj;
    private String classe;
    private String assunto;
    private String tribunal;
    private String orgaoJulgador;
    private String dataDistribuicao;
    private String valorCausa;
    private List<DatajudMovimentacaoResponse> movimentacoes;
}
