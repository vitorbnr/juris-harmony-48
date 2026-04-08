package com.viana.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CriarProcessoRequest {

    @NotBlank(message = "Número do processo é obrigatório")
    private String numero;

    @NotNull(message = "Cliente é obrigatório")
    private UUID clienteId;

    @NotBlank(message = "Tipo é obrigatório")
    private String tipo;

    private String vara;
    private String tribunal;

    /**
     * Lista de IDs dos advogados responsáveis (opcional — pode ser null ou vazia).
     */
    private List<UUID> advogadoIds;

    @NotBlank(message = "Status é obrigatório")
    private String status;

    private LocalDate dataDistribuicao;
    private BigDecimal valorCausa;
    private String descricao;

    @NotNull(message = "Unidade é obrigatória")
    private UUID unidadeId;
}
