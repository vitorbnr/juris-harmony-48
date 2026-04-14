package com.viana.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CriarPastaInternaRequest {

    @NotBlank(message = "Nome da pasta e obrigatorio")
    @Size(max = 200, message = "Nome da pasta deve ter no maximo 200 caracteres")
    private String nome;

    private UUID parentId;
}
