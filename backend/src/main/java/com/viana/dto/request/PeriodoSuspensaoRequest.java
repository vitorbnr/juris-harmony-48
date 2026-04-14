package com.viana.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PeriodoSuspensaoRequest {

    @NotNull(message = "Data inicial da suspensao e obrigatoria")
    private LocalDate dataInicio;

    @NotNull(message = "Data final da suspensao e obrigatoria")
    private LocalDate dataFim;
}
