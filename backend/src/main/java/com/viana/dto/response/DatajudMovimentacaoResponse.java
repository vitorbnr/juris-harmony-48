package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DatajudMovimentacaoResponse {
    private Integer codigo;
    private String nome;
    private String descricao;
    private String data;
    private String dataHora;
    private String orgaoJulgador;
    private String tipo;
    private String chaveExterna;
}
