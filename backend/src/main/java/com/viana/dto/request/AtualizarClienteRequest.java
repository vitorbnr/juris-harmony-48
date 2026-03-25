package com.viana.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarClienteRequest {

    @Size(max = 200)
    private String nome;

    private String tipo;
    private String cpfCnpj;
    private String email;
    private String telefone;
    private String cidade;
    private String estado;
    private UUID advogadoId;
    private UUID unidadeId;
}
