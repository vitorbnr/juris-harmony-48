package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioResponse {
    private String id;
    private String nome;
    private String email;
    private String cargo;
    private String oab;
    private String cpf;
    private Boolean habilitadoDomicilio;
    private String papel;
    private boolean ativo;
    private String initials;
    private String unidadeId;
    private String unidadeNome;
    private String criadoEm;
}
