package com.viana.service;

import com.viana.dto.request.AtualizarNotaPessoalRequest;
import com.viana.dto.response.NotaPessoalResponse;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.NotaPessoal;
import com.viana.model.Usuario;
import com.viana.repository.NotaPessoalRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotaPessoalService {

    private final NotaPessoalRepository notaPessoalRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public NotaPessoalResponse buscarMinhaNota(UUID usuarioId) {
        return notaPessoalRepository.findByUsuarioId(usuarioId)
                .map(this::toResponse)
                .orElseGet(() -> NotaPessoalResponse.builder()
                        .conteudo("")
                        .build());
    }

    @Transactional
    public NotaPessoalResponse salvarMinhaNota(UUID usuarioId, AtualizarNotaPessoalRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));

        NotaPessoal nota = notaPessoalRepository.findByUsuarioId(usuarioId)
                .orElseGet(() -> NotaPessoal.builder()
                        .usuario(usuario)
                        .conteudo("")
                        .build());

        nota.setUsuario(usuario);
        nota.setConteudo(request.getConteudo() == null ? "" : request.getConteudo());

        return toResponse(notaPessoalRepository.save(nota));
    }

    private NotaPessoalResponse toResponse(NotaPessoal nota) {
        return NotaPessoalResponse.builder()
                .id(nota.getId() != null ? nota.getId().toString() : null)
                .conteudo(nota.getConteudo() == null ? "" : nota.getConteudo())
                .dataAtualizacao(nota.getDataAtualizacao())
                .build();
    }
}
