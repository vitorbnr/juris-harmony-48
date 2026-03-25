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

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 150)
    private String nome;

    @NotBlank(message = "E-mail é obrigatório")
    @Email(message = "E-mail inválido")
    private String email;

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 8, message = "Senha deve ter no mínimo 8 caracteres")
    private String senha;

    @Size(max = 100)
    private String cargo;

    @Size(max = 20)
    private String oab;

    @NotBlank(message = "Papel é obrigatório")
    private String papel; // ADMINISTRADOR, ADVOGADO, SECRETARIA

    @NotNull(message = "Unidade é obrigatória")
    private UUID unidadeId;
}
