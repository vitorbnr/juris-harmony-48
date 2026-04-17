package com.viana.repository;

import com.viana.model.Cliente;
import com.viana.model.Unidade;
import com.viana.model.enums.TipoCliente;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class ClienteRepositoryTest {

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private UnidadeRepository unidadeRepository;

    private Unidade unidadeSede;
    private Unidade unidadeFilial;

    @BeforeEach
    void setUp() {
        unidadeSede = Unidade.builder().nome("Sede").cidade("Cidade A").estado("EX").build();
        unidadeFilial = Unidade.builder().nome("Filial").cidade("Cidade B").estado("EX").build();
        unidadeRepository.saveAll(List.of(unidadeSede, unidadeFilial));

        Cliente clienteA = Cliente.builder()
                .nome("Maria Oliveira")
                .email("maria@teste.com")
                .cpfCnpj("111.999.888-77")
                .tipo(TipoCliente.PESSOA_FISICA)
                .ativo(true)
                .unidade(unidadeSede)
                .build();

        Cliente clienteB = Cliente.builder()
                .nome("Empresa X")
                .email("contato@empresax.com")
                .cpfCnpj("00.111.222/0001-33")
                .tipo(TipoCliente.PESSOA_JURIDICA)
                .ativo(false)
                .unidade(unidadeSede)
                .build();

        Cliente clienteC = Cliente.builder()
                .nome("Carlos Eduardo")
                .email("carlos@teste.com")
                .cpfCnpj("222.333.444-55")
                .tipo(TipoCliente.PESSOA_FISICA)
                .ativo(true)
                .unidade(unidadeFilial)
                .build();

        clienteRepository.saveAll(List.of(clienteA, clienteB, clienteC));
    }

    @Test
    @DisplayName("Deve ignorar inativos e aplicar filtros opcionais")
    void findAllWithFilters() {
        Page<Cliente> todosAtivos = clienteRepository.findAllWithFilters(null, "", PageRequest.of(0, 10));
        assertThat(todosAtivos.getContent()).hasSize(2);

        Page<Cliente> somenteSede = clienteRepository.findAllWithFilters(unidadeSede.getId(), "", PageRequest.of(0, 10));
        assertThat(somenteSede.getContent()).hasSize(1);
        assertThat(somenteSede.getContent().get(0).getNome()).isEqualTo("Maria Oliveira");

        Page<Cliente> buscaNome = clienteRepository.findAllWithFilters(null, "CARLOS", PageRequest.of(0, 10));
        assertThat(buscaNome.getContent()).hasSize(1);
        assertThat(buscaNome.getContent().get(0).getEmail()).isEqualTo("carlos@teste.com");
    }

    @Test
    @DisplayName("Deve verificar existencia por CPF/CNPJ")
    void existsByCpfCnpj() {
        assertThat(clienteRepository.existsByCpfCnpj("111.999.888-77")).isTrue();
        assertThat(clienteRepository.existsByCpfCnpj("000.000.000-00")).isFalse();
    }

    @Test
    @DisplayName("Deve contar apenas clientes ativos")
    void countByAtivoTrue() {
        assertThat(clienteRepository.countByAtivoTrue()).isEqualTo(2L);
    }
}
