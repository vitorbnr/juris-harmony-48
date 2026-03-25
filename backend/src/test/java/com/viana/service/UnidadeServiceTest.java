package com.viana.service;

import com.viana.dto.response.UnidadeResponse;
import com.viana.model.Unidade;
import com.viana.repository.UnidadeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UnidadeServiceTest {

    @Mock
    private UnidadeRepository unidadeRepository;

    @InjectMocks
    private UnidadeService unidadeService;

    private Unidade unidade;
    private UUID id;

    @BeforeEach
    void setUp() {
        id = UUID.randomUUID();
        unidade = new Unidade();
        unidade.setId(id);
        unidade.setNome("Matriz");
        unidade.setCidade("São Paulo");
        unidade.setEstado("SP");
    }

    @Test
    @DisplayName("Deve listar todas as unidades")
    void listarTodas_Sucesso() {
        when(unidadeRepository.findAll()).thenReturn(List.of(unidade));

        List<UnidadeResponse> resultados = unidadeService.listarTodas();

        assertNotNull(resultados);
        assertEquals(1, resultados.size());
        assertEquals(id.toString(), resultados.get(0).getId());
        assertEquals("Matriz", resultados.get(0).getNome());
        assertEquals("São Paulo", resultados.get(0).getCidade());
        assertEquals("SP", resultados.get(0).getEstado());
    }
}
