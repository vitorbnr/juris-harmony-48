package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicacaoDiarioOficialResponse {
    private String id;
    private String codigo;
    private String nome;
    private String uf;
    private String grupo;
    private String estrategiaColeta;
    private String status;
    private Boolean coletavelAgora;
    private String statusCaptura;
    private Boolean requerScraping;
    private String custoEstimado;
    private String observacao;
    private Boolean ativo;
}
