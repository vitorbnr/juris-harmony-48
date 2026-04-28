package com.viana.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarAtivoFontePublicacaoRequest {

    @NotNull
    private Boolean ativo;
}
