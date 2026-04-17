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
public class ProcessosPorCidadeDTO {
    private String cidade;
    private String estado;
    private UUID unidadeId;
    private String unidadeNome;
    private Long totalProcessos;
}
