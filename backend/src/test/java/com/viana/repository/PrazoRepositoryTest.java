package com.viana.repository;

import com.viana.model.Prazo;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.PrioridadePrazo;
import com.viana.model.enums.TipoPrazo;
import com.viana.model.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class PrazoRepositoryTest {

    @Autowired
    private PrazoRepository prazoRepository;

    @Autowired
    private UnidadeRepository unidadeRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Unidade unidade;
    private Usuario advogado1;
    private Usuario advogado2;
    private LocalDate hoje;

    @BeforeEach
    void setUp() {
        unidade = Unidade.builder().nome("Matriz").cidade("São Paulo").estado("SP").build();
        unidadeRepository.save(unidade);

        advogado1 = Usuario.builder().nome("Adv 1").email("a1@teste.com").senhaHash("hash").papel(UserRole.ADVOGADO).unidade(unidade).build();
        advogado2 = Usuario.builder().nome("Adv 2").email("a2@teste.com").senhaHash("hash").papel(UserRole.ADVOGADO).unidade(unidade).build();
        usuarioRepository.saveAll(List.of(advogado1, advogado2));

        hoje = LocalDate.of(2025, 1, 15);

        Prazo p1 = Prazo.builder()
                .titulo("Audiencia Incial")
                .advogado(advogado1)
                .unidade(unidade)
                .data(hoje)
                .hora(LocalTime.of(14, 0))
                .tipo(TipoPrazo.AUDIENCIA)
                .prioridade(PrioridadePrazo.ALTA)
                .concluido(false)
                .build();

        Prazo p2 = Prazo.builder()
                .titulo("Contestacao")
                .advogado(advogado2)
                .unidade(unidade)
                .data(hoje.plusDays(2))
                .hora(LocalTime.of(10, 0))
                .tipo(TipoPrazo.PRAZO_PROCESSUAL)
                .prioridade(PrioridadePrazo.MEDIA) // Correção: Campo obrigatório preenchido
                .concluido(true)
                .build();

        Prazo p3 = Prazo.builder()
                .titulo("Despacho")
                .advogado(advogado1)
                .unidade(unidade)
                .data(hoje.plusDays(4))
                .tipo(TipoPrazo.TAREFA_INTERNA)
                .prioridade(PrioridadePrazo.BAIXA)
                .concluido(false)
                .build();

        prazoRepository.saveAll(List.of(p1, p2, p3));
    }

    @Test
    @DisplayName("Recupera calendário do administrador/secretária")
    void findCalendario() {
        List<Prazo> prazosDoAdvogado1 = prazoRepository.findCalendario(
                hoje,
                hoje.plusDays(4),
                advogado1.getId(),
                null,
                null
        );
        assertThat(prazosDoAdvogado1).hasSize(2);
        assertThat(prazosDoAdvogado1).extracting(Prazo::getTitulo)
                .containsExactly("Audiencia Incial", "Despacho");

        List<Prazo> apenasAdv1 = prazoRepository.findCalendario(
                hoje,
                hoje.plusDays(4),
                advogado1.getId(),
                unidade.getId(),
                advogado1.getId()
        );
        assertThat(apenasAdv1).hasSize(2);
        assertThat(apenasAdv1.get(0).getTitulo()).isEqualTo("Audiencia Incial");
    }

    @Test
    @DisplayName("Aplica filtros múltiplos na listagem paginada de prazos")
    void findAllWithFilters() {
        Page<Prazo> concluidos = prazoRepository.findAllWithFilters(
                unidade.getId(),
                null,
                true,
                advogado2.getId(),
                null,
                PageRequest.of(0, 10)
        );
        assertThat(concluidos.getContent()).hasSize(1);
        assertThat(concluidos.getContent().get(0).getTitulo()).isEqualTo("Contestacao");

        Page<Prazo> audiencias = prazoRepository.findAllWithFilters(
                unidade.getId(),
                TipoPrazo.AUDIENCIA,
                null,
                advogado1.getId(),
                null,
                PageRequest.of(0, 10)
        );
        assertThat(audiencias.getContent()).hasSize(1);
        assertThat(audiencias.getContent().get(0).getTitulo()).isEqualTo("Audiencia Incial");
    }

    @Test
    @DisplayName("Retorna Top 5 prazos pendentes futuros e de hoje para um advogado")
    void findTop5ByAdvogadoIdAndConcluidoFalseAndDataGreaterThanEqualOrderByDataAsc() {
        List<Prazo> dashboard = prazoRepository.findTop5ByAdvogadoIdAndConcluidoFalseAndDataGreaterThanEqualOrderByDataAsc(advogado1.getId(), hoje);
        assertThat(dashboard).hasSize(2);
        assertThat(dashboard.get(0).getData()).isEqualTo(hoje); // p1 vem primeiro
        assertThat(dashboard.get(1).getData()).isEqualTo(hoje.plusDays(4)); // p3 vem depois
    }
}
