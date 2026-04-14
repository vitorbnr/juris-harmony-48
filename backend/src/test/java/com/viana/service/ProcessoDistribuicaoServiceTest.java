package com.viana.service;

import com.viana.model.EventoJuridico;
import com.viana.model.Processo;
import com.viana.model.ProcessoParte;
import com.viana.model.ProcessoParteRepresentante;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.PoloProcessual;
import com.viana.model.enums.StatusEventoJuridico;
import com.viana.model.enums.StatusProcesso;
import com.viana.model.enums.TipoEventoJuridico;
import com.viana.model.enums.TipoParteProcessual;
import com.viana.model.enums.TipoProcesso;
import com.viana.model.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProcessoDistribuicaoServiceTest {

    private final ProcessoDistribuicaoService service = new ProcessoDistribuicaoService();

    private Usuario advogadoA;
    private Usuario advogadoB;
    private Usuario advogadoC;
    private Processo processoComRepresentacao;

    @BeforeEach
    void setUp() {
        Unidade unidade = Unidade.builder()
                .id(UUID.randomUUID())
                .nome("Salvador")
                .build();

        advogadoA = criarUsuario("Dr. Alvaro Costa", "BA12345", "11111111111", unidade);
        advogadoB = criarUsuario("Dra. Bianca Lima", "BA98765", "22222222222", unidade);
        advogadoC = criarUsuario("Dr. Carlos Rocha", "BA54321", "33333333333", unidade);

        processoComRepresentacao = Processo.builder()
                .id(UUID.randomUUID())
                .numero("8001693-35.2025.8.05.0051")
                .tipo(TipoProcesso.CIVEL)
                .status(StatusProcesso.EM_ANDAMENTO)
                .unidade(unidade)
                .advogados(new HashSet<>(List.of(advogadoA, advogadoB, advogadoC)))
                .partes(new ArrayList<>())
                .build();

        ProcessoParte autor = ProcessoParte.builder()
                .id(UUID.randomUUID())
                .processo(processoComRepresentacao)
                .nome("Fulano de Tal")
                .tipo(TipoParteProcessual.PESSOA_FISICA)
                .polo(PoloProcessual.ATIVO)
                .principal(true)
                .representantes(new ArrayList<>())
                .build();
        autor.getRepresentantes().add(ProcessoParteRepresentante.builder()
                .id(UUID.randomUUID())
                .parte(autor)
                .nome("Dr. Alvaro Costa")
                .oab("BA12345")
                .usuarioInterno(advogadoA)
                .principal(true)
                .build());
        autor.getRepresentantes().add(ProcessoParteRepresentante.builder()
                .id(UUID.randomUUID())
                .parte(autor)
                .nome("Dra. Bianca Lima")
                .oab("BA98765")
                .usuarioInterno(advogadoB)
                .principal(false)
                .build());

        ProcessoParte reu = ProcessoParte.builder()
                .id(UUID.randomUUID())
                .processo(processoComRepresentacao)
                .nome("Telefonica Brasil S.A.")
                .tipo(TipoParteProcessual.PESSOA_JURIDICA)
                .polo(PoloProcessual.PASSIVO)
                .principal(true)
                .representantes(new ArrayList<>())
                .build();

        processoComRepresentacao.getPartes().add(autor);
        processoComRepresentacao.getPartes().add(reu);
    }

    @Test
    @DisplayName("Deve resolver distribuicao automatica pelo representante interno da parte")
    void deveResolverDistribuicaoAutomaticaPeloRepresentanteDaParte() {
        ProcessoDistribuicaoService.DistribuicaoAutomatica distribuicao =
                service.resolveDistribuicaoAutomatica(processoComRepresentacao, "OAB/BA 12345");

        assertNotNull(distribuicao);
        assertEquals(advogadoA.getId(), distribuicao.responsavel().getId());
        assertEquals("Fulano de Tal", distribuicao.parteRelacionada());
    }

    @Test
    @DisplayName("Deve notificar todos os representantes internos da parte relacionada")
    void deveNotificarTodosRepresentantesDaParteRelacionada() {
        EventoJuridico evento = EventoJuridico.builder()
                .id(UUID.randomUUID())
                .processo(processoComRepresentacao)
                .fonte(FonteIntegracao.DOMICILIO)
                .tipo(TipoEventoJuridico.INTIMACAO)
                .status(StatusEventoJuridico.NOVO)
                .titulo("Nova intimacao")
                .descricao("Teste")
                .parteRelacionada("Fulano de Tal")
                .build();

        List<Usuario> destinatarios = service.resolveDestinatariosNotificacao(evento);

        assertEquals(2, destinatarios.size());
        assertEquals(advogadoA.getId(), destinatarios.get(0).getId());
        assertEquals(advogadoB.getId(), destinatarios.get(1).getId());
    }

    @Test
    @DisplayName("Deve priorizar representantes internos do processo antes de outros advogados")
    void devePriorizarRepresentantesInternosDoProcesso() {
        List<Usuario> destinatarios = service.resolveDestinatariosProcesso(processoComRepresentacao);

        assertEquals(2, destinatarios.size());
        assertEquals(advogadoA.getId(), destinatarios.get(0).getId());
        assertEquals(advogadoB.getId(), destinatarios.get(1).getId());
        assertTrue(destinatarios.stream().noneMatch(usuario -> usuario.getId().equals(advogadoC.getId())));
    }

    @Test
    @DisplayName("Deve usar advogados do processo como fallback quando nao houver representantes internos")
    void deveUsarAdvogadosComoFallback() {
        Processo processoSemRepresentacao = Processo.builder()
                .id(UUID.randomUUID())
                .numero("0000000-00.2026.8.05.0001")
                .tipo(TipoProcesso.CIVEL)
                .status(StatusProcesso.EM_ANDAMENTO)
                .unidade(processoComRepresentacao.getUnidade())
                .advogados(new HashSet<>(List.of(advogadoC, advogadoA)))
                .partes(new ArrayList<>())
                .build();

        List<Usuario> destinatarios = service.resolveDestinatariosProcesso(processoSemRepresentacao);

        assertEquals(2, destinatarios.size());
        assertEquals(advogadoA.getId(), destinatarios.get(0).getId());
        assertEquals(advogadoC.getId(), destinatarios.get(1).getId());
    }

    @Test
    @DisplayName("Deve retornar nulo quando nao houver destinatario utilizavel para distribuicao automatica")
    void deveRetornarNuloSemDestinatarioUtilizavel() {
        ProcessoDistribuicaoService.DistribuicaoAutomatica distribuicao =
                service.resolveDistribuicaoAutomatica(processoComRepresentacao, "  ");

        assertNull(distribuicao);
    }

    private Usuario criarUsuario(String nome, String oab, String cpf, Unidade unidade) {
        return Usuario.builder()
                .id(UUID.randomUUID())
                .nome(nome)
                .email(UUID.randomUUID() + "@teste.local")
                .senhaHash("hash")
                .papel(UserRole.ADVOGADO)
                .oab(oab)
                .cpf(cpf)
                .ativo(true)
                .unidade(unidade)
                .build();
    }
}
