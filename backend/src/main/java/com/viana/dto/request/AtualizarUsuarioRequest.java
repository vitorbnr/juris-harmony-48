package com.viana.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarUsuarioRequest {

    @Size(max = 150)
    private String nome;

    @Email(message = "E-mail invalido")
    private String email;

    @Size(max = 100)
    private String cargo;

    @Size(max = 20)
    private String oab;

    private String cpf;

    private Boolean habilitadoDomicilio;

    private String papel;

    private UUID unidadeId;

    private Boolean ativo;
}
