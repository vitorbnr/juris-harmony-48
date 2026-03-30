package com.viana.service;

import com.viana.dto.request.AtualizarUsuarioRequest;
import com.viana.dto.request.CriarUsuarioRequest;
import com.viana.dto.response.UsuarioResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.UserRole;
import com.viana.repository.UnidadeRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final UnidadeRepository unidadeRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UsuarioResponse> listarTodos() {
        return usuarioRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UsuarioResponse buscarPorId(UUID id) {
        Usuario usuario = findOrThrow(id);
        return toResponse(usuario);
    }

    @Transactional
    public UsuarioResponse criar(CriarUsuarioRequest request) {
        if (usuarioRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BusinessException("Já existe um usuário com este e-mail");
        }

        Unidade unidade = unidadeRepository.findById(request.getUnidadeId())
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));

        UserRole papel;
        try {
            papel = UserRole.valueOf(request.getPapel().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Papel inválido. Use: ADMINISTRADOR, ADVOGADO ou SECRETARIA");
        }

        validarSenha(request.getSenha());

        Usuario usuario = Usuario.builder()
                .nome(request.getNome())
                .email(request.getEmail())
                .senhaHash(passwordEncoder.encode(request.getSenha()))
                .cargo(request.getCargo())
                .oab(request.getOab())
                .papel(papel)
                .unidade(unidade)
                .build();

        return toResponse(usuarioRepository.save(usuario));
    }

    private void validarSenha(String senha) {
        if (senha == null || senha.length() < 8) {
            throw new BusinessException("A senha deve ter no mínimo 8 caracteres");
        }
        if (!senha.matches(".*[A-Z].*")) {
            throw new BusinessException("A senha deve conter pelo menos uma letra maiúscula");
        }
        if (!senha.matches(".*[0-9].*")) {
            throw new BusinessException("A senha deve conter pelo menos um número");
        }
        if (!senha.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*")) {
            throw new BusinessException("A senha deve conter pelo menos um caractere especial (!@#$%^&*...)");
        }
    }

    @Transactional
    public UsuarioResponse atualizar(UUID id, AtualizarUsuarioRequest request) {
        Usuario usuario = findOrThrow(id);

        if (request.getNome() != null) usuario.setNome(request.getNome());
        if (request.getEmail() != null) {
            if (!usuario.getEmail().equalsIgnoreCase(request.getEmail())
                    && usuarioRepository.existsByEmailIgnoreCase(request.getEmail())) {
                throw new BusinessException("Já existe um usuário com este e-mail");
            }
            usuario.setEmail(request.getEmail());
        }
        if (request.getCargo() != null) usuario.setCargo(request.getCargo());
        if (request.getOab() != null) usuario.setOab(request.getOab());
        if (request.getPapel() != null) {
            try {
                usuario.setPapel(UserRole.valueOf(request.getPapel().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new BusinessException("Papel inválido");
            }
        }
        if (request.getUnidadeId() != null) {
            Unidade unidade = unidadeRepository.findById(request.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
            usuario.setUnidade(unidade);
        }
        if (request.getAtivo() != null) usuario.setAtivo(request.getAtivo());

        return toResponse(usuarioRepository.save(usuario));
    }

    @Transactional
    public void desativar(UUID id) {
        Usuario usuario = findOrThrow(id);
        usuario.setAtivo(false);
        usuarioRepository.save(usuario);
    }

    @Transactional
    public void reativar(UUID id) {
        Usuario usuario = findOrThrow(id);
        usuario.setAtivo(true);
        usuarioRepository.save(usuario);
    }

    private Usuario findOrThrow(UUID id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
    }

    private UsuarioResponse toResponse(Usuario u) {
        return UsuarioResponse.builder()
                .id(u.getId().toString())
                .nome(u.getNome())
                .email(u.getEmail())
                .cargo(u.getCargo())
                .oab(u.getOab())
                .papel(u.getPapel().name())
                .ativo(u.getAtivo())
                .initials(u.getInitials())
                .unidadeId(u.getUnidade().getId().toString())
                .unidadeNome(u.getUnidade().getNome())
                .criadoEm(u.getCriadoEm().toString())
                .build();
    }
}
