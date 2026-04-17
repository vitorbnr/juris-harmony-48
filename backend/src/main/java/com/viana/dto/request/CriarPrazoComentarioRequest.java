package com.viana.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CriarPrazoComentarioRequest {

    @NotBlank(message = "O conteudo do comentario e obrigatorio.")
    @Size(max = 2000, message = "O comentario deve ter no maximo 2000 caracteres.")
    private String conteudo;
}
