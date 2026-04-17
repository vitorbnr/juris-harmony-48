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
import java.util.List;

@Service
@RequiredArgsConstructor
public class LogAuditoriaService {

    private final LogAuditoriaRepository logRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public void registrar(UUID usuarioId, TipoAcao acao, ModuloLog modulo, String descricao) {
        registrar(usuarioId, acao, modulo, descricao, null, null);
    }

    @Transactional
    public void registrar(
            UUID usuarioId,
            TipoAcao acao,
            ModuloLog modulo,
            String descricao,
            String referenciaTipo,
            UUID referenciaId
    ) {
        Usuario usuario = usuarioRepository.findById(usuarioId).orElse(null);
        if (usuario == null) return;

        LogAuditoria log = LogAuditoria.builder()
                .usuario(usuario)
                .acao(acao)
                .modulo(modulo)
                .descricao(descricao)
                .referenciaTipo(referenciaTipo)
                .referenciaId(referenciaId)
                .build();

        logRepository.save(log);
    }

    @Transactional(readOnly = true)
    public Page<LogAuditoriaResponse> listarTodos(Pageable pageable) {
        return logRepository.findAllByOrderByDataHoraDesc(pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<LogAuditoriaResponse> listarPorReferencia(String referenciaTipo, UUID referenciaId) {
        return logRepository.findByReferenciaTipoAndReferenciaIdOrderByDataHoraDesc(referenciaTipo, referenciaId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private LogAuditoriaResponse toResponse(LogAuditoria l) {
        return LogAuditoriaResponse.builder()
                .id(l.getId().toString())
                .usuarioNome(l.getUsuario().getNome())
                .acao(l.getAcao().name())
                .modulo(l.getModulo().name())
                .descricao(l.getDescricao())
                .dataHora(l.getDataHora().toString())
                .referenciaTipo(l.getReferenciaTipo())
                .referenciaId(l.getReferenciaId() != null ? l.getReferenciaId().toString() : null)
                .build();
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class LogAuditoriaResponse {
        private String id;
        private String usuarioNome;
        private String acao;
        private String modulo;
        private String descricao;
        private String dataHora;
        private String referenciaTipo;
        private String referenciaId;
    }
}
