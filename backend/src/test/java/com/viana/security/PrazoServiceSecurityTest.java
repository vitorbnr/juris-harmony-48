package com.viana.security;

import com.viana.exception.BusinessException;
import com.viana.model.Prazo;
import com.viana.model.Usuario;
import com.viana.model.enums.PrioridadePrazo;
import com.viana.model.enums.TipoPrazo;
import com.viana.model.enums.UserRole;
import com.viana.repository.PrazoRepository;
import com.viana.repository.UsuarioRepository;
import com.viana.service.PrazoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Testes de segurança IDOR para PrazoService.
 *
 * Cobre:
 *  - VUL-007: IDOR no marcarConcluido (qualquer usuário tentando alterar prazo de outro)
 *  - Regra de negócio: prazos são ESTRITAMENTE pessoais.
 *    Nem ADMINISTRADOR tem permissão para alterar prazo que não é seu.
 */
@ExtendWith(MockitoExtension.class)
class PrazoServiceSecurityTest {

    @Mock
    private PrazoRepository prazoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private com.viana.repository.ProcessoRepository processoRepository;

    @Mock
    private com.viana.repository.UnidadeRepository unidadeRepository;

    @Mock
    private com.viana.service.LogAuditoriaService logAuditoriaService;

    @Mock
    private com.viana.service.NotificacaoService notificacaoService;

    @InjectMocks
    private PrazoService prazoService;

    private UUID prazoId;
    private UUID donoPrazoId;
    private UUID outroAdvogadoId;
    private UUID adminId;
    private Prazo prazoMock;

    @BeforeEach
    void setUp() {
        prazoId = UUID.randomUUID();
        donoPrazoId = UUID.randomUUID();
        outroAdvogadoId = UUID.randomUUID();
        adminId = UUID.randomUUID();

        // Criar usuário dono do prazo
        Usuario dono = new Usuario();
        dono.setId(donoPrazoId);
        dono.setPapel(UserRole.ADVOGADO);
        dono.setAtivo(true);

        // Criar o prazo
        prazoMock = Prazo.builder()
                .titulo("Prazo crítico processual")
                .data(LocalDate.now().plusDays(7))
                .tipo(TipoPrazo.AUDIENCIA)
                .prioridade(PrioridadePrazo.ALTA)
                .concluido(false)
                .advogado(dono)
                .build();
        // Simular ID via reflexão
        org.springframework.test.util.ReflectionTestUtils.setField(prazoMock, "id", prazoId);

        when(prazoRepository.findById(prazoId)).thenReturn(Optional.of(prazoMock));
    }

    @Test
    @DisplayName("VUL-007: IDOR — Outro advogado NÃO deve poder concluir prazo alheio")
    void outroAdvogadoNaoDeveConcluirPrazoAlheio() {
        // Act + Assert: deve lançar BusinessException sem consulta ao repositório de usuários
        BusinessException ex = assertThrows(BusinessException.class, () ->
            prazoService.marcarConcluido(prazoId, outroAdvogadoId)
        );

        assertTrue(ex.getMessage().contains("permissão") || ex.getMessage().contains("outros"),
            "Mensagem de erro adequada não foi lançada. Recebido: " + ex.getMessage());

        verify(prazoRepository, never()).save(any());
    }

    @Test
    @DisplayName("VUL-007: O dono do prazo DEVE poder concluí-lo")
    void donoPrazoDevePodeConcluir() {
        // Act: o próprio dono conclui o prazo
        when(prazoRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        var response = prazoService.marcarConcluido(prazoId, donoPrazoId);

        // Assert: prazo foi marcado como concluído
        assertNotNull(response);
        assertTrue(response.isConcluido());
        verify(prazoRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("VUL-007 (Regra atualizada): ADMINISTRADOR também NÃO deve poder concluir prazo alheio")
    void adminNaoDevePodeConcluirPrazoAlheio() {
        // Prazos são estritamente pessoais: nem ADMIN tem exceção
        BusinessException ex = assertThrows(BusinessException.class, () ->
            prazoService.marcarConcluido(prazoId, adminId)
        );

        assertTrue(ex.getMessage().contains("permissão") || ex.getMessage().contains("outros"),
            "Mensagem inadequada: " + ex.getMessage());
        verify(prazoRepository, never()).save(any());
    }

    @Test
    @DisplayName("VUL-007: Qualquer usuário sem ownership não pode concluir prazo alheio")
    void secretariaNaoDeveConcluirPrazoDeAdvogado() {
        // Sem stub: a nova lógica não consulta repositório, só compara IDs
        UUID secretariaId = UUID.randomUUID();

        BusinessException ex = assertThrows(BusinessException.class, () ->
            prazoService.marcarConcluido(prazoId, secretariaId)
        );

        assertNotNull(ex.getMessage());
        verify(prazoRepository, never()).save(any());
    }
}
