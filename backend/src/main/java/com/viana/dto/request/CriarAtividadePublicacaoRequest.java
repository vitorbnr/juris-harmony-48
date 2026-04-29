package com.viana.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
public class CriarAtividadePublicacaoRequest {

    @NotBlank(message = "Titulo e obrigatorio")
    private String titulo;

    @NotNull(message = "Data e obrigatoria")
    private LocalDate data;

    private LocalTime hora;
    private String prioridade;
    private String etapa;
    private UUID advogadoId;
    private String descricao;
}
