package com.viana.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CalcularPrazoRequest {

    @NotNull(message = "Data inicial e obrigatoria")
    private LocalDate dataInicial;

    @Min(value = 1, message = "Quantidade de dias uteis deve ser maior que zero")
    private int quantidadeDiasUteis;

    private Boolean contarDiaInicial;

    private List<LocalDate> feriadosExtras;

    private List<LocalDate> feriadosLocais;

    private List<PeriodoSuspensaoRequest> suspensoes;
}
