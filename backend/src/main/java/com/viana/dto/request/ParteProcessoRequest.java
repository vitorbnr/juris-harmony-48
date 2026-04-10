package com.viana.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParteProcessoRequest {
    private String nome;
    private String documento;
    private String tipo;
    private String polo;
    private Boolean principal;
    private String observacao;
    private List<RepresentanteParteRequest> representantes;
}
