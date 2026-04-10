package com.viana.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RepresentanteParteRequest {
    private String nome;
    private String cpf;
    private String oab;
    private UUID usuarioInternoId;
    private Boolean principal;
}
