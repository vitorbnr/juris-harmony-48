package com.viana.service;

import com.viana.dto.request.CriarPrazoRequest;
import com.viana.dto.response.PrazoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Prazo;
import com.viana.model.Processo;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.PrioridadePrazo;
import com.viana.model.enums.TipoPrazo;
import com.viana.model.enums.UserRole;
import com.viana.repository.PrazoRepository;
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

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrazoServiceTest {

    @Mock
    private PrazoRepository prazoRepository;

    @Mock
    private ProcessoRepository processoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private UnidadeRepository unidadeRepository;

    @Mock
    private LogAuditoriaService logAuditoriaService;

    @Mock
    private NotificacaoService notificacaoService;

    @InjectMocks
    private PrazoService prazoService;

    private UUID prazoId;
    private Usuario advogado;
    private Usuario secretaria;
    private Prazo prazoMock;

    @BeforeEach
    void setUp() {
        prazoId = UUID.randomUUID();
        
        advogado = Usuario.builder()
                .id(UUID.randomUUID())
                .nome("Dr. João")
                .papel(UserRole.ADVOGADO)
                .build();

        secretaria = Usuario.builder()
                .id(UUID.randomUUID())
                .nome("Maria Sec")
                .papel(UserRole.SECRETARIA)
                .build();

        prazoMock = Prazo.builder()
                .id(prazoId)
                .titulo("Audiência Cível")
                .data(LocalDate.now())
                .tipo(TipoPrazo.AUDIENCIA)
                .prioridade(PrioridadePrazo.ALTA)
                .advogado(advogado)
                .concluido(false)
                .build();
    }

    @Test
    @DisplayName("getCalendario: Advogado deve ver os prazos pelo calendário")
    void getCalendario_ParaAdvogado() {
        when(prazoRepository.findCalendario(any(), any(), eq(advogado.getId()), any()))
                .thenReturn(List.of(prazoMock));

        List<PrazoResponse> result = prazoService.getCalendario(
                advogado.getId(), null, LocalDate.now().minusDays(1), LocalDate.now().plusDays(1));

        assertEquals(1, result.size());
        assertEquals(prazoId.toString(), result.get(0).getId());
        verify(prazoRepository, times(1)).findCalendario(any(), any(), eq(advogado.getId()), any());
    }

    @Test
    @DisplayName("getCalendario: Secretaria/Admin deve ver TODOS os prazos com base no filtro")
    void getCalendario_ParaSecretariaOuAdmin() {
        when(prazoRepository.findCalendario(any(), any(), any(), any()))
                .thenReturn(List.of(prazoMock));

        List<PrazoResponse> result = prazoService.getCalendario(
                secretaria.getId(), null, LocalDate.now().minusDays(1), LocalDate.now().plusDays(1));

        assertEquals(1, result.size());
        verify(prazoRepository, times(1)).findCalendario(any(), any(), any(), any());
    }

    @Test
    @DisplayName("criar: Deve criar um prazo com sucesso")
    void criar_ComSucesso() {
        CriarPrazoRequest req = new CriarPrazoRequest();
        req.setTitulo("Petição");
        req.setData(LocalDate.now());
        req.setTipo("PRAZO_PROCESSUAL");
        req.setPrioridade("MEDIA");

        when(usuarioRepository.findById(advogado.getId())).thenReturn(Optional.of(advogado));
        when(prazoRepository.save(any(Prazo.class))).thenReturn(prazoMock);

        PrazoResponse response = prazoService.criar(req, advogado.getId());

        assertNotNull(response);
        assertEquals(prazoId.toString(), response.getId());
        verify(prazoRepository, times(1)).save(any(Prazo.class));
    }

    @Test
    @DisplayName("marcarConcluido: Deve inverter o status de conclusão do prazo (para o dono)")
    void marcarConcluido_Success() {
        when(prazoRepository.findById(prazoId)).thenReturn(Optional.of(prazoMock));
        when(prazoRepository.save(any(Prazo.class))).thenReturn(prazoMock);

        boolean initialStatus = prazoMock.getConcluido();
        // Passar o ID do próprio advogado (dono do prazo)
        PrazoResponse response = prazoService.marcarConcluido(prazoId, advogado.getId());

        assertNotEquals(initialStatus, response.isConcluido());
        verify(prazoRepository, times(1)).save(prazoMock);
    }
}
