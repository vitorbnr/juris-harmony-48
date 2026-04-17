package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMovimentacaoRecenteDTO {
    private UUID processoId;
    private String processoNumero;
    private String clienteNome;
    private LocalDate data;
    private LocalDateTime dataHora;
    private String descricao;
    private String tipo;
    private String origem;
}
