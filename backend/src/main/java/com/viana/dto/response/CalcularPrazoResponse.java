package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalcularPrazoResponse {
    private String dataSugerida;
    private int quantidadeDiasUteis;
    private boolean contarDiaInicial;
    private List<String> feriadosNacionaisConsiderados;
    private List<String> feriadosExtrasConsiderados;
    private String observacao;
}
