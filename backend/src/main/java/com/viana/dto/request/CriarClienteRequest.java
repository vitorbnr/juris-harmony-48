package com.viana.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CriarClienteRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 200)
    private String nome;

    @NotBlank(message = "Tipo é obrigatório")
    private String tipo; // PESSOA_FISICA, PESSOA_JURIDICA

    @NotBlank(message = "CPF/CNPJ é obrigatório")
    @Size(min = 11, max = 20, message = "CPF deve ter 11 dígitos e CNPJ 14 dígitos")
    private String cpfCnpj;

    private String email;
    private String telefone;
    private String cidade;
    private String estado;

    private UUID advogadoId;

    @NotNull(message = "Unidade é obrigatória")
    private UUID unidadeId;
}
