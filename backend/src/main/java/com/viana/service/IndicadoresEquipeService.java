package com.viana.service;

import com.viana.dto.response.EvolucaoProdutividadeDTO;
import com.viana.dto.response.IndicadorResponsavelDTO;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.enums.PeriodoIndicadorEquipe;
import com.viana.repository.MovimentacaoRepository;
import com.viana.repository.PrazoRepository;
import com.viana.repository.UsuarioRepository;
import com.viana.repository.projection.EvolucaoProdutividadeProjection;
import com.viana.repository.projection.TotalPorUsuarioProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IndicadoresEquipeService {

    private static final DateTimeFormatter DATA_FORMATTER = DateTimeFormatter.ofPattern("dd/MM");

    private final UsuarioRepository usuarioRepository;
    private final PrazoRepository prazoRepository;
    private final MovimentacaoRepository movimentacaoRepository;

    @Transactional(readOnly = true)
    public List<IndicadorResponsavelDTO> listarVisaoGlobal(String periodo) {
        PeriodoIndicadorEquipe filtro = PeriodoIndicadorEquipe.from(periodo);
        PeriodoIndicadorEquipe.Intervalo intervalo = filtro.resolverIntervalo(LocalDate.now());

        Map<UUID, Integer> processosPorResponsavel = toIntegerMap(usuarioRepository.countProcessosAtivosPorResponsavel());
        Map<UUID, Integer> prazosPendentesPorResponsavel = toIntegerMap(prazoRepository.countPrazosPendentesPorResponsavel());
        Map<UUID, Integer> prazosNoPrazoPorResponsavel = toIntegerMap(
                prazoRepository.countPrazosConcluidosNoPrazoPorResponsavel(intervalo.inicio(), intervalo.fimExclusivo())
        );
        Map<UUID, Integer> prazosAtrasadosPorResponsavel = toIntegerMap(
                prazoRepository.countPrazosConcluidosAtrasadosPorResponsavel(intervalo.inicio(), intervalo.fimExclusivo())
        );
        Map<UUID, Integer> movimentacoesPorResponsavel = toIntegerMap(
                movimentacaoRepository.countMovimentacoesRegistradasPorUsuario(intervalo.inicio(), intervalo.fimExclusivo())
        );

        return usuarioRepository.findByAtivoTrueOrderByNomeAsc().stream()
                .map(usuario -> IndicadorResponsavelDTO.builder()
                        .usuarioId(usuario.getId())
                        .nomeUsuario(usuario.getNome())
                        .processosSobResponsabilidade(processosPorResponsavel.getOrDefault(usuario.getId(), 0))
                        .prazosPendentes(prazosPendentesPorResponsavel.getOrDefault(usuario.getId(), 0))
                        .prazosConcluidosNoPrazo(prazosNoPrazoPorResponsavel.getOrDefault(usuario.getId(), 0))
                        .prazosConcluidosAtrasados(prazosAtrasadosPorResponsavel.getOrDefault(usuario.getId(), 0))
                        .movimentacoesRegistadas(movimentacoesPorResponsavel.getOrDefault(usuario.getId(), 0))
                        .build())
                .sorted(Comparator
                        .comparing(IndicadorResponsavelDTO::getPrazosPendentes, Comparator.reverseOrder())
                        .thenComparing(IndicadorResponsavelDTO::getProcessosSobResponsabilidade, Comparator.reverseOrder())
                        .thenComparing(IndicadorResponsavelDTO::getNomeUsuario, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EvolucaoProdutividadeDTO> listarEvolucao(UUID usuarioId, String periodo) {
        if (!usuarioRepository.existsById(usuarioId)) {
            throw new ResourceNotFoundException("Usuario nao encontrado");
        }

        PeriodoIndicadorEquipe filtro = PeriodoIndicadorEquipe.from(periodo);
        PeriodoIndicadorEquipe.Intervalo intervaloGrafico = filtro.resolverIntervaloGrafico(LocalDate.now());
        List<EvolucaoProdutividadeProjection> agregados = prazoRepository.countConclusoesSemanaisByResponsavel(
                usuarioId,
                intervaloGrafico.inicio(),
                intervaloGrafico.fimExclusivo()
        );

        Map<LocalDate, Integer> totaisPorSemana = new HashMap<>();
        for (EvolucaoProdutividadeProjection agregado : agregados) {
            totaisPorSemana.put(agregado.getPeriodo(), safeToInt(agregado.getTarefasConcluidas()));
        }

        LocalDate dataFinal = intervaloGrafico.dataFinalInclusiva();
        LocalDate inicioUltimaSemana = dataFinal.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate inicioPrimeiraSemana = inicioUltimaSemana.minusWeeks(3);

        List<EvolucaoProdutividadeDTO> series = new ArrayList<>();
        for (LocalDate inicioSemana = inicioPrimeiraSemana;
             !inicioSemana.isAfter(inicioUltimaSemana);
             inicioSemana = inicioSemana.plusWeeks(1)) {
            LocalDate fimSemana = inicioSemana.plusDays(6);
            LocalDate fimApresentado = fimSemana.isAfter(dataFinal) ? dataFinal : fimSemana;

            series.add(EvolucaoProdutividadeDTO.builder()
                    .data(formatarFaixaSemanal(inicioSemana, fimApresentado))
                    .tarefasConcluidas(totaisPorSemana.getOrDefault(inicioSemana, 0))
                    .build());
        }

        return series;
    }

    private Map<UUID, Integer> toIntegerMap(List<TotalPorUsuarioProjection> projections) {
        Map<UUID, Integer> totais = new HashMap<>();
        for (TotalPorUsuarioProjection projection : projections) {
            totais.put(projection.getUsuarioId(), safeToInt(projection.getTotal()));
        }
        return totais;
    }

    private Integer safeToInt(Long value) {
        return value == null ? 0 : Math.toIntExact(value);
    }

    private String formatarFaixaSemanal(LocalDate inicio, LocalDate fim) {
        return DATA_FORMATTER.format(inicio) + " - " + DATA_FORMATTER.format(fim);
    }
}
