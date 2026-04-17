package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessoResumoDTO {
    private UUID id;
    private String numero;
    private String clienteNome;
    private LocalDate ultimaMovimentacao;
    private long diasParados;
}
