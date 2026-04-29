package com.viana.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DescartarPublicacaoRequest {

    @NotBlank(message = "Motivo do descarte e obrigatorio")
    private String motivo;
}
