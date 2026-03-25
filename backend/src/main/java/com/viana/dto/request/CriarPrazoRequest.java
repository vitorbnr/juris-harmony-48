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

    @NotBlank(message = "Título é obrigatório")
    private String titulo;

    private UUID processoId;

    @NotNull(message = "Data é obrigatória")
    private LocalDate data;

    private LocalTime hora;

    @NotBlank(message = "Tipo é obrigatório")
    private String tipo;

    @NotBlank(message = "Prioridade é obrigatória")
    private String prioridade;

    private UUID advogadoId;
    private String descricao;
    private UUID unidadeId;
}
