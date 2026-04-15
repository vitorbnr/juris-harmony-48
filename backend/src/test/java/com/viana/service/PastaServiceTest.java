package com.viana.service;

import com.viana.exception.BusinessException;
import com.viana.model.Pasta;
import com.viana.model.Unidade;
import com.viana.repository.DocumentoRepository;
import com.viana.repository.PastaRepository;
import com.viana.repository.UnidadeRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PastaServiceTest {

    @Mock
    private PastaRepository pastaRepository;

    @Mock
    private DocumentoRepository documentoRepository;

    @Mock
    private UnidadeRepository unidadeRepository;

    @InjectMocks
    private PastaService pastaService;

    @Test
    @DisplayName("Deve excluir pasta interna vazia dentro do escopo da unidade")
    void excluirInternaSucesso() {
        UUID unidadeId = UUID.randomUUID();
        UUID pastaId = UUID.randomUUID();

        Unidade unidade = new Unidade();
        unidade.setId(unidadeId);

        Pasta pasta = Pasta.builder()
                .id(pastaId)
                .nome("Financeiro")
                .unidade(unidade)
                .build();

        when(pastaRepository.findByIdAndUnidadeId(pastaId, unidadeId)).thenReturn(Optional.of(pasta));
        when(pastaRepository.existsByParentId(pastaId)).thenReturn(false);
        when(documentoRepository.existsByPastaId(pastaId)).thenReturn(false);

        pastaService.excluirInterna(pastaId, unidadeId, false);

        verify(pastaRepository).delete(pasta);
    }

    @Test
    @DisplayName("Nao deve excluir pasta interna com documentos vinculados")
    void excluirInternaComDocumentos() {
        UUID unidadeId = UUID.randomUUID();
        UUID pastaId = UUID.randomUUID();

        Unidade unidade = new Unidade();
        unidade.setId(unidadeId);

        Pasta pasta = Pasta.builder()
                .id(pastaId)
                .nome("Financeiro")
                .unidade(unidade)
                .build();

        when(pastaRepository.findByIdAndUnidadeId(pastaId, unidadeId)).thenReturn(Optional.of(pasta));
        when(pastaRepository.existsByParentId(pastaId)).thenReturn(false);
        when(documentoRepository.existsByPastaId(pastaId)).thenReturn(true);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> pastaService.excluirInterna(pastaId, unidadeId, false));

        assertEquals("A pasta possui documentos vinculados. Exclua ou mova os documentos primeiro.", exception.getMessage());
        verify(pastaRepository, never()).delete(pasta);
    }
}
