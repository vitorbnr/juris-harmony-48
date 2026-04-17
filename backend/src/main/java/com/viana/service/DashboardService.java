package com.viana.service;

import com.viana.dto.response.DashboardMovimentacaoRecenteDTO;
import com.viana.dto.response.DashboardMetricasResponse;
import com.viana.dto.response.ProcessoResumoDTO;
import com.viana.dto.response.ProcessosPorAreaDTO;
import com.viana.model.Movimentacao;
import com.viana.model.Processo;
import com.viana.model.enums.StatusProcesso;
import com.viana.repository.ClienteRepository;
import com.viana.repository.MovimentacaoRepository;
import com.viana.repository.PrazoRepository;
import com.viana.repository.ProcessoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final List<StatusProcesso> STATUSS_PROCESSOS_ATIVOS = List.of(
            StatusProcesso.EM_ANDAMENTO,
            StatusProcesso.URGENTE,
            StatusProcesso.AGUARDANDO
    );

    private final ClienteRepository clienteRepository;
    private final ProcessoRepository processoRepository;
    private final MovimentacaoRepository movimentacaoRepository;
    private final PrazoRepository prazoRepository;
    private final PrazoService prazoService;
    private final ProcessoService processoService;

    @Transactional(readOnly = true)
    public DashboardMetricasResponse obterMetricas(UUID usuarioId) {
        LocalDate hoje = LocalDate.now();
        LocalDate inicioSemana = hoje.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate fimSemana = hoje.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        LocalDate dataLimiteParados = hoje.minusDays(60);

        long totalClientes = clienteRepository.countByAtivoTrue();
        long processosAtivos = processoRepository.countByStatusInExcluindoAtendimentoSintetico(STATUSS_PROCESSOS_ATIVOS);

        return DashboardMetricasResponse.builder()
                .totalClientes(totalClientes)
                .processosAtivos(processosAtivos)
                .prazosSemana(prazoRepository.countByAdvogadoIdAndConcluidoFalseAndDataBetween(usuarioId, inicioSemana, fimSemana))
                .prazosAtrasados(prazoService.contarAtrasados(usuarioId))
                .prazosHoje(prazoService.contarVencendoHoje(usuarioId))
                .tarefasAbertas(prazoService.contarTarefasAbertas(usuarioId))
                .proximosPrazos(prazoService.listarProximos(usuarioId, 5))
                .processosRecentes(processoService.listarRecentes(5))
                .ultimasMovimentacoes(mapearUltimasMovimentacoes(
                        movimentacaoRepository.findRecentesDashboard(STATUSS_PROCESSOS_ATIVOS, PageRequest.of(0, 6))
                ))
                .processosPorCidade(processoRepository.countProcessosAtivosPorCidadeUnidade(STATUSS_PROCESSOS_ATIVOS))
                .processosPorArea(consolidarProcessosPorArea(
                        processoRepository.countProcessosAtivosPorArea(STATUSS_PROCESSOS_ATIVOS)
                ))
                .processosParados(mapearProcessosParados(
                        processoRepository.findProcessosAtivosParadosDesde(
                                STATUSS_PROCESSOS_ATIVOS,
                                dataLimiteParados,
                                PageRequest.of(0, 5)
                        ),
                        hoje
                ))
                .build();
    }

    private List<DashboardMovimentacaoRecenteDTO> mapearUltimasMovimentacoes(List<Movimentacao> movimentacoes) {
        return movimentacoes.stream()
                .map(movimentacao -> DashboardMovimentacaoRecenteDTO.builder()
                        .processoId(movimentacao.getProcesso() != null ? movimentacao.getProcesso().getId() : null)
                        .processoNumero(movimentacao.getProcesso() != null ? movimentacao.getProcesso().getNumero() : null)
                        .clienteNome(
                                movimentacao.getProcesso() != null && movimentacao.getProcesso().getCliente() != null
                                        ? movimentacao.getProcesso().getCliente().getNome()
                                        : null
                        )
                        .data(movimentacao.getData())
                        .dataHora(movimentacao.getDataHoraOriginal())
                        .descricao(movimentacao.getDescricao())
                        .tipo(movimentacao.getTipo() != null ? movimentacao.getTipo().name() : null)
                        .origem(movimentacao.getOrigem() != null ? movimentacao.getOrigem().name() : null)
                        .build())
                .toList();
    }

    private List<ProcessosPorAreaDTO> consolidarProcessosPorArea(List<ProcessosPorAreaDTO> areas) {
        if (areas == null || areas.isEmpty()) {
            return List.of();
        }

        if (areas.size() <= 5) {
            return areas;
        }

        List<ProcessosPorAreaDTO> principais = new ArrayList<>(areas.subList(0, 4));
        long quantidadeOutros = areas.stream()
                .skip(4)
                .map(ProcessosPorAreaDTO::quantidade)
                .filter(java.util.Objects::nonNull)
                .mapToLong(Long::longValue)
                .sum();

        if (quantidadeOutros > 0) {
            principais.add(new ProcessosPorAreaDTO("Outros", quantidadeOutros));
        }

        return principais;
    }

    private List<ProcessoResumoDTO> mapearProcessosParados(List<Processo> processos, LocalDate dataReferencia) {
        return processos.stream()
                .filter(processo -> processo.getUltimaMovimentacao() != null)
                .map(processo -> ProcessoResumoDTO.builder()
                        .id(processo.getId())
                        .numero(processo.getNumero())
                        .clienteNome(processo.getCliente() != null ? processo.getCliente().getNome() : null)
                        .ultimaMovimentacao(processo.getUltimaMovimentacao())
                        .diasParados(ChronoUnit.DAYS.between(processo.getUltimaMovimentacao(), dataReferencia))
                        .build())
                .toList();
    }
}
