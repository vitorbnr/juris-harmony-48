package com.viana.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarPrazoRequest {
    private String titulo;
    private LocalDate data;
    private LocalTime hora;
    private String tipo;
    private String prioridade;
    private String etapa;
    private UUID processoId;
    private UUID advogadoId;
    private UUID unidadeId;
    private String descricao;
}
