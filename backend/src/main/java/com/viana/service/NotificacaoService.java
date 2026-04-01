package com.viana.service;

import com.viana.dto.response.NotificacaoResponse;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Notificacao;
import com.viana.model.Usuario;
import com.viana.model.enums.TipoNotificacao;
import com.viana.repository.NotificacaoRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificacaoService {

    private final NotificacaoRepository notificacaoRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public Page<NotificacaoResponse> listarDoUsuario(UUID usuarioId, Pageable pageable) {
        return notificacaoRepository.findByUsuarioIdOrderByCriadaEmDesc(usuarioId, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public long contarNaoLidas(UUID usuarioId) {
        return notificacaoRepository.countByUsuarioIdAndLidaFalse(usuarioId);
    }

    @Transactional
    public NotificacaoResponse marcarComoLida(UUID id) {
        Notificacao notificacao = notificacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notificação não encontrada"));
        notificacao.setLida(true);
        return toResponse(notificacaoRepository.save(notificacao));
    }
 
    @Transactional
    public void marcarTodasComoLidas(UUID usuarioId) {
        notificacaoRepository.marcarTodasComoLidas(usuarioId);
    }

    @Transactional
    public void criarNotificacao(UUID usuarioId, String titulo, String descricao, TipoNotificacao tipo, String link) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        Notificacao notificacao = Notificacao.builder()
                .usuario(usuario)
                .titulo(titulo)
                .descricao(descricao)
                .tipo(tipo)
                .link(link)
                .build();

        notificacaoRepository.save(notificacao);
    }

    private NotificacaoResponse toResponse(Notificacao n) {
        return NotificacaoResponse.builder()
                .id(n.getId().toString())
                .titulo(n.getTitulo())
                .descricao(n.getDescricao())
                .tipo(n.getTipo().name())
                .lida(n.getLida())
                .criadaEm(n.getCriadaEm().toString())
                .link(n.getLink())
                .build();
    }
}
