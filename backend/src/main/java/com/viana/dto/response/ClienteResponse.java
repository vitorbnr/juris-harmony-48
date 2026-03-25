package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteResponse {
    private String id;
    private String nome;
    private String tipo;
    private String cpfCnpj;
    private String email;
    private String telefone;
    private String cidade;
    private String estado;
    private String dataCadastro;
    private long processos;
    private String advogadoResponsavel;
    private String initials;
    private String unidadeId;
    private String unidadeNome;
    private boolean ativo;
}
