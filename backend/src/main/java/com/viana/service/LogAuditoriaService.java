package com.viana.service;

import com.viana.model.LogAuditoria;
import com.viana.model.Usuario;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.TipoAcao;
import com.viana.repository.LogAuditoriaRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LogAuditoriaService {

    private final LogAuditoriaRepository logRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public void registrar(UUID usuarioId, TipoAcao acao, ModuloLog modulo, String descricao, String ip) {
        Usuario usuario = usuarioRepository.findById(usuarioId).orElse(null);
        if (usuario == null) return;

        LogAuditoria log = LogAuditoria.builder()
                .usuario(usuario)
                .acao(acao)
                .modulo(modulo)
                .descricao(descricao)
                .ip(ip)
                .build();

        logRepository.save(log);
    }

    @Transactional(readOnly = true)
    public Page<LogAuditoriaResponse> listarTodos(Pageable pageable) {
        return logRepository.findAllByOrderByDataHoraDesc(pageable)
                .map(this::toResponse);
    }

    private LogAuditoriaResponse toResponse(LogAuditoria l) {
        return LogAuditoriaResponse.builder()
                .id(l.getId().toString())
                .usuario(l.getUsuario().getNome())
                .acao(l.getAcao().name())
                .modulo(l.getModulo().name())
                .descricao(l.getDescricao())
                .dataHora(l.getDataHora().toString())
                .ip(l.getIp())
                .build();
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class LogAuditoriaResponse {
        private String id;
        private String usuario;
        private String acao;
        private String modulo;
        private String descricao;
        private String dataHora;
        private String ip;
    }
}
