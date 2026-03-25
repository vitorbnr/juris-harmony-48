package com.viana.service;

import com.viana.dto.request.CriarMovimentacaoRequest;
import com.viana.dto.request.CriarProcessoRequest;
import com.viana.dto.response.ProcessoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.*;
import com.viana.model.enums.StatusProcesso;
import com.viana.model.enums.TipoMovimentacao;
import com.viana.model.enums.TipoProcesso;
import com.viana.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProcessoServiceTest {

    @Mock
    private ProcessoRepository processoRepository;

    @Mock
    private ClienteRepository clienteRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private UnidadeRepository unidadeRepository;

    @Mock
    private MovimentacaoRepository movimentacaoRepository;

    @InjectMocks
    private ProcessoService processoService;

    private UUID processoId;
    private CriarProcessoRequest requestValida;
    private Cliente clienteDefault;
    private Usuario advogadoDefault;
    private Unidade unidadeDefault;
    private Processo processoSalvo;

    @BeforeEach
    void setUp() {
        processoId = UUID.randomUUID();

        unidadeDefault = Unidade.builder().id(UUID.randomUUID()).nome("Sede").build();
        clienteDefault = Cliente.builder().id(UUID.randomUUID()).nome("João").build();
        advogadoDefault = Usuario.builder().id(UUID.randomUUID()).nome("Dr. Pedro").build();

        requestValida = new CriarProcessoRequest();
        requestValida.setNumero("1234567-89.2024.8.26.0000");
        requestValida.setClienteId(clienteDefault.getId());
        requestValida.setAdvogadoId(advogadoDefault.getId());
        requestValida.setUnidadeId(unidadeDefault.getId());
        requestValida.setStatus("EM_ANDAMENTO");
        requestValida.setTipo("CIVEL");
        requestValida.setValorCausa(new BigDecimal("10000.00"));

        processoSalvo = Processo.builder()
                .id(processoId)
                .numero(requestValida.getNumero())
                .cliente(clienteDefault)
                .advogado(advogadoDefault)
                .unidade(unidadeDefault)
                .status(StatusProcesso.EM_ANDAMENTO)
                .tipo(TipoProcesso.CIVEL)
                .build();
    }

    @Test
    @DisplayName("Deve criar um processo com sucesso")
    void criarProcesso_ComSucesso() {
        when(clienteRepository.findById(requestValida.getClienteId())).thenReturn(Optional.of(clienteDefault));
        when(usuarioRepository.findById(requestValida.getAdvogadoId())).thenReturn(Optional.of(advogadoDefault));
        when(unidadeRepository.findById(requestValida.getUnidadeId())).thenReturn(Optional.of(unidadeDefault));
        when(processoRepository.save(any(Processo.class))).thenReturn(processoSalvo);

        ProcessoResponse response = processoService.criar(requestValida);

        assertNotNull(response);
        assertEquals(processoSalvo.getId().toString(), response.getId());
        assertEquals("EM_ANDAMENTO", response.getStatus());
        assertEquals("CIVEL", response.getTipo());
        verify(processoRepository, times(1)).save(any(Processo.class));
    }

    @Test
    @DisplayName("Deve lançar BusinessException para Status inválido")
    void criarProcesso_StatusInvalido() {
        when(clienteRepository.findById(requestValida.getClienteId())).thenReturn(Optional.of(clienteDefault));
        when(usuarioRepository.findById(requestValida.getAdvogadoId())).thenReturn(Optional.of(advogadoDefault));
        when(unidadeRepository.findById(requestValida.getUnidadeId())).thenReturn(Optional.of(unidadeDefault));
        
        requestValida.setStatus("STATUS_INEXISTENTE");

        BusinessException exception = assertThrows(BusinessException.class, () -> processoService.criar(requestValida));
        assertTrue(exception.getMessage().contains("Status inválido"));
    }

    @Test
    @DisplayName("Deve buscar processo por ID e retornar DTO")
    void buscarPorId_ComSucesso() {
        when(processoRepository.findById(processoId)).thenReturn(Optional.of(processoSalvo));
        when(movimentacaoRepository.findByProcessoIdOrderByDataDesc(processoId)).thenReturn(java.util.Collections.emptyList());

        ProcessoResponse response = processoService.buscarPorId(processoId);

        assertNotNull(response);
        assertEquals(processoId.toString(), response.getId());
    }

    @Test
    @DisplayName("Deve lançar ResourceNotFoundException ao buscar processo inexistente")
    void buscarPorId_NaoEncontrado() {
        when(processoRepository.findById(processoId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> processoService.buscarPorId(processoId));
    }

    @Test
    @DisplayName("Deve alterar status de um processo com sucesso")
    void alterarStatus_ComSucesso() {
        when(processoRepository.findById(processoId)).thenReturn(Optional.of(processoSalvo));
        when(processoRepository.save(processoSalvo)).thenReturn(processoSalvo);

        ProcessoResponse response = processoService.alterarStatus(processoId, "CONCLUIDO");

        assertEquals(StatusProcesso.CONCLUIDO, processoSalvo.getStatus());
        assertEquals("CONCLUIDO", response.getStatus());
    }

    @Test
    @DisplayName("Deve adicionar movimentação e atualizar última movimentação do processo")
    void adicionarMovimentacao_ComSucesso() {
        CriarMovimentacaoRequest movRequest = new CriarMovimentacaoRequest();
        movRequest.setData(LocalDate.now());
        movRequest.setDescricao("Petição Inicial protocolada");
        movRequest.setTipo("PETICAO");

        Movimentacao movSalva = Movimentacao.builder()
                .id(UUID.randomUUID())
                .processo(processoSalvo)
                .data(movRequest.getData())
                .descricao(movRequest.getDescricao())
                .tipo(TipoMovimentacao.PETICAO)
                .build();

        when(processoRepository.findById(processoId)).thenReturn(Optional.of(processoSalvo));
        when(movimentacaoRepository.save(any(Movimentacao.class))).thenReturn(movSalva);

        processoService.adicionarMovimentacao(processoId, movRequest);

        // Verifica se a última movimentação foi gravada no processo
        assertEquals(movRequest.getData(), processoSalvo.getUltimaMovimentacao());
        verify(processoRepository, times(1)).save(processoSalvo);
    }
}
