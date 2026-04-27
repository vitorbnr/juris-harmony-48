package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicacaoMetricasResponse {
    private long naoTratadasHoje;
    private long tratadasHoje;
    private long descartadasHoje;
    private long naoTratadas;
    private long prazoSuspeito;
    private long semVinculo;
}
