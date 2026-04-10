package com.viana.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CriarPrazoRequest {

    @NotBlank(message = "Titulo e obrigatorio")
    private String titulo;

    private UUID processoId;

    @NotNull(message = "Data e obrigatoria")
    private LocalDate data;

    private LocalTime hora;

    @NotBlank(message = "Tipo e obrigatorio")
    private String tipo;

    @NotBlank(message = "Prioridade e obrigatoria")
    private String prioridade;

    private String etapa;
    private UUID advogadoId;
    private String descricao;
    private UUID unidadeId;
}
