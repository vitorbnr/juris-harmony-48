package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IndicadorResponsavelDTO {
    private UUID usuarioId;
    private String nomeUsuario;
    private Integer processosSobResponsabilidade;
    private Integer prazosPendentes;
    private Integer prazosConcluidosNoPrazo;
    private Integer prazosConcluidosAtrasados;
    private Integer movimentacoesRegistadas;
}
