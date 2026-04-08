package com.viana.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarProcessoRequest {
    private String tipo;
    private String vara;
    private String tribunal;

    /**
     * Se presente (não-null), substitui completamente a lista de advogados responsáveis.
     * Pode ser uma lista vazia para remover todos os advogados.
     */
    private List<UUID> advogadoIds;

    private String status;
    private LocalDate dataDistribuicao;
    private BigDecimal valorCausa;
    private String descricao;
    private UUID unidadeId;
}
