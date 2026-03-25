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
    private Cliente clienteA;
    private Cliente clienteB;

    @BeforeEach
    void setUp() {
        unidadeSede = Unidade.builder().nome("Sede").cidade("Cidades").estado("EX").build();
        unidadeFilial = Unidade.builder().nome("Filial").cidade("Cidades 2").estado("EX").build();
        unidadeRepository.saveAll(List.of(unidadeSede, unidadeFilial));

        clienteA = Cliente.builder()
                .nome("Maria Oliveira")
                .email("maria@teste.com")
                .cpfCnpj("111.999.888-77")
                .tipo(TipoCliente.PESSOA_FISICA)
                .ativo(true)
                .unidade(unidadeSede)
                .build();

        clienteB = Cliente.builder()
                .nome("Empresa X")
                .email("contato@empresax.com")
                .cpfCnpj("00.111.222/0001-33")
                .tipo(TipoCliente.PESSOA_JURIDICA)
                .ativo(false) // Este será ignorado pela query findAllWithFilters
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
    @DisplayName("Garante que findAllWithFilters ignora inativos e aplica filtros opcionais")
    void findAllWithFilters() {
        // Busca todos os ativos da base inteira
        Page<Cliente> todosAtivos = clienteRepository.findAllWithFilters(null, null, PageRequest.of(0, 10));
        assertThat(todosAtivos.getContent()).hasSize(2); // A e C
        
        // Busca pela Unidade Sede (apenas o ativo da sede)
        Page<Cliente> somenteSede = clienteRepository.findAllWithFilters(unidadeSede.getId(), null, PageRequest.of(0, 10));
        assertThat(somenteSede.getContent()).hasSize(1);
        assertThat(somenteSede.getContent().get(0).getNome()).isEqualTo("Maria Oliveira");

        // Busca textual (insensitive) sobre a filial
        Page<Cliente> buscaNome = clienteRepository.findAllWithFilters(null, "CARLOS", PageRequest.of(0, 10));
        assertThat(buscaNome.getContent()).hasSize(1);
        assertThat(buscaNome.getContent().get(0).getEmail()).isEqualTo("carlos@teste.com");
    }

    @Test
    @DisplayName("Verifica existencia por CPF/CNPJ corretamente")
    void existsByCpfCnpj() {
        boolean existe = clienteRepository.existsByCpfCnpj("111.999.888-77");
        boolean naoExiste = clienteRepository.existsByCpfCnpj("000.000.000-00");
        
        assertThat(existe).isTrue();
        assertThat(naoExiste).isFalse();
    }

    @Test
    @DisplayName("Conta apenas a quantidade de clientes ativos")
    void countByAtivoTrue() {
        long contagem = clienteRepository.countByAtivoTrue();
        assertThat(contagem).isEqualTo(2L);
    }
}
