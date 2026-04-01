package com.viana.service;

import com.viana.model.LogAuditoria;
import com.viana.model.Usuario;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.TipoAcao;
import com.viana.repository.LogAuditoriaRepository;
import com.viana.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LogAuditoriaServiceTest {

    @Mock
    private LogAuditoriaRepository logRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private LogAuditoriaService logService;

    private Usuario usuario;
    private UUID usuarioId;

    @BeforeEach
    void setUp() {
        usuarioId = UUID.randomUUID();
        usuario = new Usuario();
        usuario.setId(usuarioId);
        usuario.setNome("Joao Silva");
    }

    @Test
    @DisplayName("Deve registrar um log de auditoria com sucesso")
    void registrar_Sucesso() {
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));

        logService.registrar(usuarioId, TipoAcao.CRIOU, ModuloLog.PROCESSOS, "Processo criado");

        verify(logRepository, times(1)).save(any(LogAuditoria.class));
    }

    @Test
    @DisplayName("Não deve registrar log se usuário fornecido não existir ou for nulo")
    void registrar_FalhaUsuarioNulo() {
        UUID randomId = UUID.randomUUID();
        when(usuarioRepository.findById(randomId)).thenReturn(Optional.empty());

        logService.registrar(randomId, TipoAcao.CRIOU, ModuloLog.PROCESSOS, "Processo criado");

        verify(logRepository, never()).save(any(LogAuditoria.class));
    }

    @Test
    @DisplayName("Deve listar todos os logs mapeando para DTO Response")
    void listarTodos_Sucesso() {
        LogAuditoria log = LogAuditoria.builder()
                .id(UUID.randomUUID())
                .usuario(usuario)
                .acao(TipoAcao.EDITOU)
                .modulo(ModuloLog.CLIENTES)
                .descricao("Cliente Editado")
                .dataHora(LocalDateTime.now())
                .build();

        Page<LogAuditoria> page = new PageImpl<>(List.of(log));
        when(logRepository.findAllByOrderByDataHoraDesc(any(PageRequest.class))).thenReturn(page);

        Page<LogAuditoriaService.LogAuditoriaResponse> resultado = logService.listarTodos(PageRequest.of(0, 10));

        assertNotNull(resultado);
        assertEquals(1, resultado.getTotalElements());
        assertEquals("Cliente Editado", resultado.getContent().get(0).getDescricao());
        assertEquals("EDITOU", resultado.getContent().get(0).getAcao());
    }
}
