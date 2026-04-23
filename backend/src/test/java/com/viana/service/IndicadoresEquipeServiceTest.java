package com.viana.service;

import com.viana.dto.response.EvolucaoProdutividadeDTO;
import com.viana.dto.response.IndicadorResponsavelDTO;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.PeriodoIndicadorEquipe;
import com.viana.model.enums.UserRole;
import com.viana.repository.MovimentacaoRepository;
import com.viana.repository.PrazoRepository;
import com.viana.repository.UsuarioRepository;
import com.viana.repository.projection.EvolucaoProdutividadeProjection;
import com.viana.repository.projection.TotalPorUsuarioProjection;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IndicadoresEquipeServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PrazoRepository prazoRepository;

    @Mock
    private MovimentacaoRepository movimentacaoRepository;

    @InjectMocks
    private IndicadoresEquipeService indicadoresEquipeService;

    @Test
    @DisplayName("Consolida a visao global da equipe sem lacunas entre agregacoes")
    void listarVisaoGlobal_ComDadosParciais() {
        Unidade unidade = Unidade.builder().id(UUID.randomUUID()).nome("Sede").build();
        Usuario ana = Usuario.builder()
                .id(UUID.randomUUID())
                .nome("Ana Ribeiro")
                .email("ana@teste.com")
                .senhaHash("hash")
                .papel(UserRole.ADVOGADO)
                .unidade(unidade)
                .build();
        Usuario bruno = Usuario.builder()
                .id(UUID.randomUUID())
                .nome("Bruno Lima")
                .email("bruno@teste.com")
                .senhaHash("hash")
                .papel(UserRole.ADVOGADO)
                .unidade(unidade)
                .build();

        when(usuarioRepository.findByAtivoTrueOrderByNomeAsc()).thenReturn(List.of(ana, bruno));
        when(usuarioRepository.countProcessosAtivosPorResponsavel()).thenReturn(List.of(
                totalPorUsuario(ana.getId(), 8L),
                totalPorUsuario(bruno.getId(), 3L)
        ));
        when(prazoRepository.countPrazosPendentesPorResponsavel()).thenReturn(List.of(
                totalPorUsuario(ana.getId(), 56L),
                totalPorUsuario(bruno.getId(), 14L)
        ));
        when(prazoRepository.countPrazosConcluidosNoPrazoPorResponsavel(any(), any())).thenReturn(List.of(
                totalPorUsuario(ana.getId(), 11L)
        ));
        when(prazoRepository.countPrazosConcluidosAtrasadosPorResponsavel(any(), any())).thenReturn(List.of(
                totalPorUsuario(ana.getId(), 2L),
                totalPorUsuario(bruno.getId(), 5L)
        ));
        when(movimentacaoRepository.countMovimentacoesRegistradasPorUsuario(any(), any())).thenReturn(List.of(
                totalPorUsuario(bruno.getId(), 9L)
        ));

        List<IndicadorResponsavelDTO> indicadores = indicadoresEquipeService.listarVisaoGlobal("ESTE_MES");

        assertThat(indicadores).hasSize(2);
        assertThat(indicadores.get(0).getNomeUsuario()).isEqualTo("Ana Ribeiro");
        assertThat(indicadores.get(0).getPrazosPendentes()).isEqualTo(56);
        assertThat(indicadores.get(0).getPrazosConcluidosNoPrazo()).isEqualTo(11);
        assertThat(indicadores.get(0).getMovimentacoesRegistadas()).isZero();

        assertThat(indicadores.get(1).getNomeUsuario()).isEqualTo("Bruno Lima");
        assertThat(indicadores.get(1).getProcessosSobResponsabilidade()).isEqualTo(3);
        assertThat(indicadores.get(1).getPrazosConcluidosNoPrazo()).isZero();
        assertThat(indicadores.get(1).getMovimentacoesRegistadas()).isEqualTo(9);
    }

    @Test
    @DisplayName("Preenche as ultimas quatro semanas com zeros quando nao houver conclusoes")
    void listarEvolucao_ComSemanasVazias() {
        UUID usuarioId = UUID.randomUUID();
        PeriodoIndicadorEquipe.Intervalo intervaloGrafico = PeriodoIndicadorEquipe.ESTE_MES.resolverIntervaloGrafico(LocalDate.now());
        LocalDate dataFinal = intervaloGrafico.dataFinalInclusiva();
        LocalDate inicioUltimaSemana = dataFinal.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate inicioSemanaComEntrega = inicioUltimaSemana.minusWeeks(2);

        when(usuarioRepository.existsById(usuarioId)).thenReturn(true);
        when(prazoRepository.countConclusoesSemanaisByResponsavel(eq(usuarioId), any(), any())).thenReturn(List.of(
                evolucaoSemanal(inicioSemanaComEntrega, 4L),
                evolucaoSemanal(inicioUltimaSemana, 7L)
        ));

        List<EvolucaoProdutividadeDTO> evolucao = indicadoresEquipeService.listarEvolucao(usuarioId, "ESTE_MES");

        assertThat(evolucao).hasSize(4);
        assertThat(evolucao).extracting(EvolucaoProdutividadeDTO::getTarefasConcluidas)
                .containsExactly(0, 4, 0, 7);
    }

    private TotalPorUsuarioProjection totalPorUsuario(UUID usuarioId, Long total) {
        return new TotalPorUsuarioProjection() {
            @Override
            public UUID getUsuarioId() {
                return usuarioId;
            }

            @Override
            public Long getTotal() {
                return total;
            }
        };
    }

    private EvolucaoProdutividadeProjection evolucaoSemanal(LocalDate periodo, Long total) {
        return new EvolucaoProdutividadeProjection() {
            @Override
            public LocalDate getPeriodo() {
                return periodo;
            }

            @Override
            public Long getTarefasConcluidas() {
                return total;
            }
        };
    }
}
