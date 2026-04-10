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
    public NotificacaoResponse marcarComoLida(UUID id, UUID usuarioId) {
        Notificacao notificacao = notificacaoRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Notificacao nao encontrada"));
        notificacao.setLida(true);
        return toResponse(notificacaoRepository.save(notificacao));
    }

    @Transactional
    public void marcarTodasComoLidas(UUID usuarioId) {
        notificacaoRepository.marcarTodasComoLidas(usuarioId);
    }

    @Transactional
    public void criarNotificacao(UUID usuarioId, String titulo, String descricao, TipoNotificacao tipo, String link) {
        criarNotificacao(usuarioId, titulo, descricao, tipo, link, null, null, null);
    }

    @Transactional
    public void criarNotificacao(
            UUID usuarioId,
            String titulo,
            String descricao,
            TipoNotificacao tipo,
            String link,
            String chaveExterna,
            String referenciaTipo,
            UUID referenciaId
    ) {
        if (chaveExterna != null && !chaveExterna.isBlank()
                && notificacaoRepository.existsByUsuarioIdAndChaveExterna(usuarioId, chaveExterna)) {
            return;
        }

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));

        Notificacao notificacao = Notificacao.builder()
                .usuario(usuario)
                .titulo(titulo)
                .descricao(descricao)
                .tipo(tipo)
                .link(link)
                .chaveExterna(chaveExterna)
                .referenciaTipo(referenciaTipo)
                .referenciaId(referenciaId)
                .build();

        notificacaoRepository.save(notificacao);
    }

    private NotificacaoResponse toResponse(Notificacao notificacao) {
        return NotificacaoResponse.builder()
                .id(notificacao.getId().toString())
                .titulo(notificacao.getTitulo())
                .descricao(notificacao.getDescricao())
                .tipo(notificacao.getTipo().name())
                .lida(Boolean.TRUE.equals(notificacao.getLida()))
                .criadaEm(notificacao.getCriadaEm().toString())
                .link(notificacao.getLink())
                .build();
    }
}
