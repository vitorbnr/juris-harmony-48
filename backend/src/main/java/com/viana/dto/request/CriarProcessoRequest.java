package com.viana.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
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

    @NotBlank(message = "Numero do processo e obrigatorio")
    private String numero;

    @NotNull(message = "Cliente e obrigatorio")
    private UUID clienteId;

    @NotBlank(message = "Tipo e obrigatorio")
    private String tipo;

    private String vara;
    private String tribunal;

    @NotEmpty(message = "Pelo menos um advogado responsavel e obrigatorio")
    private List<UUID> advogadoIds;

    @NotBlank(message = "Status e obrigatorio")
    private String status;

    private LocalDate dataDistribuicao;
    private BigDecimal valorCausa;
    private String descricao;
    private List<String> etiquetas;
    private List<ParteProcessoRequest> partes;

    @NotNull(message = "Unidade e obrigatoria")
    private UUID unidadeId;
}
