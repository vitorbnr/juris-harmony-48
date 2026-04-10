package com.viana.dto.request;

import jakarta.validation.constraints.Email;
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
public class CriarUsuarioRequest {

    @NotBlank(message = "Nome e obrigatorio")
    @Size(max = 150)
    private String nome;

    @NotBlank(message = "E-mail e obrigatorio")
    @Email(message = "E-mail invalido")
    private String email;

    @NotBlank(message = "Senha e obrigatoria")
    @Size(min = 8, message = "Senha deve ter no minimo 8 caracteres")
    private String senha;

    @Size(max = 100)
    private String cargo;

    @Size(max = 20)
    private String oab;

    private String cpf;

    private Boolean habilitadoDomicilio;

    @NotBlank(message = "Papel e obrigatorio")
    private String papel;

    @NotNull(message = "Unidade e obrigatoria")
    private UUID unidadeId;
}
