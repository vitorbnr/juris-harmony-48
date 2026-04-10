package com.viana.service;

import com.viana.dto.request.CriarMovimentacaoRequest;
import com.viana.dto.request.CriarProcessoRequest;
import com.viana.dto.request.AtualizarProcessoRequest;
import com.viana.dto.response.ProcessoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Cliente;
import com.viana.model.Movimentacao;
import com.viana.model.Processo;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.StatusProcesso;
import com.viana.model.enums.TipoMovimentacao;
import com.viana.model.enums.TipoProcesso;
import com.viana.repository.ClienteRepository;
import com.viana.repository.MovimentacaoRepository;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.UnidadeRepository;
import com.viana.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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

    @Mock
    private LogAuditoriaService logAuditoriaService;

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
        clienteDefault = Cliente.builder().id(UUID.randomUUID()).nome("Joao").build();
        advogadoDefault = Usuario.builder().id(UUID.randomUUID()).nome("Dr. Pedro").build();

        requestValida = new CriarProcessoRequest();
        requestValida.setNumero("1234567-89.2024.8.26.0000");
        requestValida.setClienteId(clienteDefault.getId());
        requestValida.setAdvogadoIds(List.of(advogadoDefault.getId()));
        requestValida.setUnidadeId(unidadeDefault.getId());
        requestValida.setStatus("EM_ANDAMENTO");
        requestValida.setTipo("CIVEL");
        requestValida.setValorCausa(new BigDecimal("10000.00"));

        processoSalvo = Processo.builder()
                .id(processoId)
                .numero(requestValida.getNumero())
                .cliente(clienteDefault)
                .advogados(Set.of(advogadoDefault))
                .unidade(unidadeDefault)
                .status(StatusProcesso.EM_ANDAMENTO)
                .tipo(TipoProcesso.CIVEL)
                .build();
    }

    @Test
    @DisplayName("Deve criar um processo com sucesso")
    void criarProcesso_ComSucesso() {
        when(clienteRepository.findById(requestValida.getClienteId())).thenReturn(Optional.of(clienteDefault));
        when(usuarioRepository.findById(advogadoDefault.getId())).thenReturn(Optional.of(advogadoDefault));
        when(unidadeRepository.findById(requestValida.getUnidadeId())).thenReturn(Optional.of(unidadeDefault));
        when(processoRepository.save(any(Processo.class))).thenReturn(processoSalvo);

        ProcessoResponse response = processoService.criar(requestValida);

        assertNotNull(response);
        assertEquals(processoSalvo.getId().toString(), response.getId());
        assertEquals("EM_ANDAMENTO", response.getStatus());
        assertEquals("CIVEL", response.getTipo());
        assertEquals(1, response.getAdvogados().size());
        verify(processoRepository, times(1)).save(any(Processo.class));
    }

    @Test
    @DisplayName("Deve exigir ao menos um advogado responsavel ao criar processo")
    void criarProcesso_SemAdvogados() {
        requestValida.setAdvogadoIds(List.of());
        when(clienteRepository.findById(requestValida.getClienteId())).thenReturn(Optional.of(clienteDefault));
        when(unidadeRepository.findById(requestValida.getUnidadeId())).thenReturn(Optional.of(unidadeDefault));

        BusinessException exception = assertThrows(BusinessException.class, () -> processoService.criar(requestValida));

        assertEquals("Pelo menos um advogado responsÃ¡vel Ã© obrigatÃ³rio", exception.getMessage());
        verify(processoRepository, never()).save(any(Processo.class));
    }

    @Test
    @DisplayName("Deve lancar BusinessException para Status invalido")
    void criarProcesso_StatusInvalido() {
        when(clienteRepository.findById(requestValida.getClienteId())).thenReturn(Optional.of(clienteDefault));
        when(unidadeRepository.findById(requestValida.getUnidadeId())).thenReturn(Optional.of(unidadeDefault));

        requestValida.setStatus("STATUS_INEXISTENTE");

        BusinessException exception = assertThrows(BusinessException.class, () -> processoService.criar(requestValida));
        assertTrue(exception.getMessage().contains("Status inv"));
    }

    @Test
    @DisplayName("Deve buscar processo por ID e retornar DTO")
    void buscarPorId_ComSucesso() {
        when(processoRepository.findById(processoId)).thenReturn(Optional.of(processoSalvo));
        when(movimentacaoRepository.findTimelineByProcessoId(processoId)).thenReturn(Collections.emptyList());

        ProcessoResponse response = processoService.buscarPorId(processoId);

        assertNotNull(response);
        assertEquals(processoId.toString(), response.getId());
    }

    @Test
    @DisplayName("Deve lancar ResourceNotFoundException ao buscar processo inexistente")
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
    @DisplayName("Deve impedir atualizacao que remova todos os advogados responsaveis")
    void atualizar_RemovendoTodosAdvogados() {
        AtualizarProcessoRequest request = new AtualizarProcessoRequest();
        request.setAdvogadoIds(List.of());

        when(processoRepository.findById(processoId)).thenReturn(Optional.of(processoSalvo));

        BusinessException exception = assertThrows(BusinessException.class, () -> processoService.atualizar(processoId, request));

        assertEquals("Pelo menos um advogado responsÃ¡vel Ã© obrigatÃ³rio", exception.getMessage());
        verify(processoRepository, never()).save(any(Processo.class));
    }

    @Test
    @DisplayName("Deve adicionar movimentacao e atualizar ultima movimentacao do processo")
    void adicionarMovimentacao_ComSucesso() {
        CriarMovimentacaoRequest movRequest = new CriarMovimentacaoRequest();
        movRequest.setData(LocalDate.now());
        movRequest.setDescricao("Peticao Inicial protocolada");
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

        assertEquals(movRequest.getData(), processoSalvo.getUltimaMovimentacao());
        verify(processoRepository, times(1)).save(processoSalvo);
    }
}
