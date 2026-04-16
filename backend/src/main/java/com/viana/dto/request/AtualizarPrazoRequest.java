package com.viana.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarPrazoRequest {
    private String titulo;
    private LocalDate data;
    private LocalTime hora;
    private LocalDate dataFim;
    private LocalTime horaFim;
    private Boolean diaInteiro;
    private String tipo;
    private String prioridade;
    private String etapa;
    private UUID processoId;
    private UUID advogadoId;
    private List<UUID> participantesIds;
    private String etiqueta;
    private UUID unidadeId;
    private String descricao;
    private String local;
    private String modalidade;
    private String sala;
    private Integer alertaValor;
    private String alertaUnidade;
    private String vinculoTipo;
    private UUID vinculoReferenciaId;
    private String quadroKanban;
}
