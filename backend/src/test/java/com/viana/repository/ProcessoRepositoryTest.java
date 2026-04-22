package com.viana.repository;

import com.viana.model.Cliente;
import com.viana.model.Processo;
import com.viana.model.ProcessoParte;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.PoloProcessual;
import com.viana.model.enums.StatusProcesso;
import com.viana.model.enums.TipoParteProcessual;
import com.viana.model.enums.TipoCliente;
import com.viana.model.enums.TipoProcesso;
import com.viana.model.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class ProcessoRepositoryTest {

    @Autowired
    private ProcessoRepository processoRepository;

    @Autowired
    private UnidadeRepository unidadeRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Unidade unidade;
    private Cliente cliente;
    private Usuario advogado;
    private Processo processoComPartes;

    @BeforeEach
    void setUp() {
        unidade = Unidade.builder()
                .nome("Sede Central")
                .cidade("São Paulo")
                .estado("SP")
                .build();
        unidade = unidadeRepository.save(unidade);

        advogado = Usuario.builder()
                .nome("Dr. Teste")
                .email("advogado@teste.com")
                .senhaHash("hash")
                .papel(UserRole.ADVOGADO)
                .unidade(unidade)
                .build();
        advogado = usuarioRepository.save(advogado);

        cliente = Cliente.builder()
                .nome("Cliente Teste")
                .tipo(TipoCliente.PESSOA_FISICA)
                .cpfCnpj("111.222.333-44")
                .unidade(unidade)
                .advogadoResponsavel(advogado)
                .build();
        cliente = clienteRepository.save(cliente);

        Processo p1 = Processo.builder()
                .numero("0000001-00.2024.8.26.0000")
                .cliente(cliente)
                .advogados(Set.of(advogado))
                .unidade(unidade)
                .tipo(TipoProcesso.CIVEL)
                .status(StatusProcesso.EM_ANDAMENTO)
                .dataDistribuicao(LocalDate.of(2024, 1, 10))
                .ultimaMovimentacao(LocalDate.of(2024, 4, 10))
                .valorCausa(new BigDecimal("1000"))
                .build();

        p1.getPartes().add(ProcessoParte.builder()
                .processo(p1)
                .nome("Cliente Teste")
                .tipo(TipoParteProcessual.PESSOA_FISICA)
                .polo(PoloProcessual.ATIVO)
                .principal(true)
                .build());

        Processo p2 = Processo.builder()
                .numero("0000002-00.2024.8.26.0000")
                .cliente(cliente)
                .advogados(Set.of(advogado))
                .unidade(unidade)
                .tipo(TipoProcesso.TRABALHISTA)
                .status(StatusProcesso.CONCLUIDO)
                .dataDistribuicao(LocalDate.of(2024, 1, 11))
                .ultimaMovimentacao(LocalDate.of(2024, 4, 15))
                .valorCausa(new BigDecimal("2000"))
                .build();

        List<Processo> salvos = processoRepository.saveAll(List.of(p1, p2));
        processoComPartes = salvos.stream()
                .filter(processo -> "0000001-00.2024.8.26.0000".equals(processo.getNumero()))
                .findFirst()
                .orElseThrow();
    }

    @Test
    @DisplayName("Deve buscar processos aplicando os filtros opcionais corretamente")
    void findAllWithFilters() {
        // Busca sem nenhum filtro (apenas a unidade correta)
        Page<Processo> resultTodos = processoRepository.findAllWithFilters(
                unidade.getId(), null, null, null, null, "", "", PageRequest.of(0, 10));
        assertThat(resultTodos.getContent()).hasSize(2);
        assertThat(resultTodos.getContent().get(0).getNumero()).isEqualTo("0000002-00.2024.8.26.0000");
        assertThat(resultTodos.getContent().get(1).getNumero()).isEqualTo("0000001-00.2024.8.26.0000");

        // Filtro por STATUS = EM_ANDAMENTO
        Page<Processo> resultStatus = processoRepository.findAllWithFilters(
                unidade.getId(), null, StatusProcesso.EM_ANDAMENTO.name(), null, null, "", "", PageRequest.of(0, 10));
        assertThat(resultStatus.getContent()).hasSize(1);
        assertThat(resultStatus.getContent().get(0).getNumero()).isEqualTo("0000001-00.2024.8.26.0000");

        // Filtro por BUSCA (Numero do processo p2)
        Page<Processo> resultBusca = processoRepository.findAllWithFilters(
                unidade.getId(), null, null, null, null, "0000002", "0000002", PageRequest.of(0, 10));
        assertThat(resultBusca.getContent()).hasSize(1);
        assertThat(resultBusca.getContent().get(0).getTipo()).isEqualTo(TipoProcesso.TRABALHISTA);
    }

    @Test
    @DisplayName("Deve contar os processos por Id do cliente")
    void countByClienteId() {
        long contagem = processoRepository.countByClienteId(cliente.getId());
        assertThat(contagem).isEqualTo(2L);
    }

    @Test
    @DisplayName("Deve carregar o detalhe do processo com as partes em uma unica consulta")
    void findDetalheById() {
        Processo result = processoRepository.findDetalheById(processoComPartes.getId()).orElseThrow();

        assertThat(result.getId()).isEqualTo(processoComPartes.getId());
        assertThat(result.getPartes()).hasSize(1);
        assertThat(result.getPartes().get(0).getNome()).isEqualTo("Cliente Teste");
    }
}
