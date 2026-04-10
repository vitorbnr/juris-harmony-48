package com.viana.service;

import com.viana.dto.response.NotificacaoResponse;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Notificacao;
import com.viana.model.Usuario;
import com.viana.model.enums.TipoNotificacao;
import com.viana.repository.NotificacaoRepository;
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
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificacaoServiceTest {

    @Mock
    private NotificacaoRepository notificacaoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private NotificacaoService notificacaoService;

    private Usuario usuario;
    private Notificacao notificacao;
    private UUID usuarioId;
    private UUID notificacaoId;

    @BeforeEach
    void setUp() {
        usuarioId = UUID.randomUUID();
        usuario = new Usuario();
        usuario.setId(usuarioId);
        usuario.setNome("Advogado Silva");

        notificacaoId = UUID.randomUUID();
        notificacao = Notificacao.builder()
                .id(notificacaoId)
                .usuario(usuario)
                .titulo("Prazo Urgente")
                .descricao("Verifique processo X")
                .tipo(TipoNotificacao.PRAZO)
                .lida(false)
                .criadaEm(LocalDateTime.now())
                .link("/processos/123")
                .build();
    }

    @Test
    @DisplayName("Deve listar notificacoes do usuario paginado")
    void listarDoUsuarioSucesso() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Notificacao> page = new PageImpl<>(List.of(notificacao));

        when(notificacaoRepository.findByUsuarioIdOrderByCriadaEmDesc(usuarioId, pageable)).thenReturn(page);

        Page<NotificacaoResponse> resultado = notificacaoService.listarDoUsuario(usuarioId, pageable);

        assertEquals(1, resultado.getTotalElements());
        assertEquals("Prazo Urgente", resultado.getContent().get(0).getTitulo());
        assertFalse(resultado.getContent().get(0).isLida());
    }

    @Test
    @DisplayName("Deve contar quantidade de notificacoes nao lidas")
    void contarNaoLidasSucesso() {
        when(notificacaoRepository.countByUsuarioIdAndLidaFalse(usuarioId)).thenReturn(5L);

        long qtd = notificacaoService.contarNaoLidas(usuarioId);

        assertEquals(5L, qtd);
    }

    @Test
    @DisplayName("Deve marcar notificacao como lida apenas para o dono")
    void marcarComoLidaSucesso() {
        when(notificacaoRepository.findByIdAndUsuarioId(notificacaoId, usuarioId)).thenReturn(Optional.of(notificacao));
        when(notificacaoRepository.save(any(Notificacao.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NotificacaoResponse response = notificacaoService.marcarComoLida(notificacaoId, usuarioId);

        assertTrue(response.isLida());
        verify(notificacaoRepository, times(1)).save(notificacao);
    }

    @Test
    @DisplayName("Deve falhar ao tentar marcar como lida notificacao inexistente ou de outro usuario")
    void marcarComoLidaFalhaNaoEncontrada() {
        when(notificacaoRepository.findByIdAndUsuarioId(notificacaoId, usuarioId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> notificacaoService.marcarComoLida(notificacaoId, usuarioId));
    }

    @Test
    @DisplayName("Deve criar nova notificacao com sucesso")
    void criarNotificacaoSucesso() {
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));

        notificacaoService.criarNotificacao(usuarioId, "Novo Arquivo", "Arquivo X upado", TipoNotificacao.SISTEMA, "/docs");

        verify(notificacaoRepository, times(1)).save(any(Notificacao.class));
    }

    @Test
    @DisplayName("Deve falhar ao criar notificacao se usuario nao existe")
    void criarNotificacaoFalhaUsuarioNaoExiste() {
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                notificacaoService.criarNotificacao(usuarioId, "Novo Arquivo", "Arquivo X upado", TipoNotificacao.SISTEMA, "/docs")
        );
        verify(notificacaoRepository, never()).save(any());
    }
}
