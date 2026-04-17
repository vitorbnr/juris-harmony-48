package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMetricasResponse {
    private long totalClientes;
    private long processosAtivos;
    private long prazosSemana;
    private long prazosAtrasados;
    private long prazosHoje;
    private long tarefasAbertas;
    private List<PrazoResponse> proximosPrazos;
    private List<ProcessoResponse> processosRecentes;
    private List<DashboardMovimentacaoRecenteDTO> ultimasMovimentacoes;
    private List<ProcessosPorCidadeDTO> processosPorCidade;
    private List<ProcessosPorAreaDTO> processosPorArea;
    private List<ProcessoResumoDTO> processosParados;
}
