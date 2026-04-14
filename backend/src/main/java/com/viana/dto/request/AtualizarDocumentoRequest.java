package com.viana.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarDocumentoRequest {

    @Size(max = 300)
    private String nome;

    private String categoria;
}
