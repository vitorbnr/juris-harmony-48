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
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public UsuarioResponse criar(CriarUsuarioRequest request) {
        if (usuarioRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BusinessException("Ja existe um usuario com este e-mail");
        }

        String cpf = normalizarCpf(request.getCpf());
        validarCpfDisponivel(cpf, null);
        validarRegrasDomicilio(cpf, request.getHabilitadoDomicilio());

        Unidade unidade = unidadeRepository.findById(request.getUnidadeId())
                .orElseThrow(() -> new ResourceNotFoundException("Unidade nao encontrada"));

        UserRole papel = parsePapel(request.getPapel());
        validarSenha(request.getSenha());

        Usuario usuario = Usuario.builder()
                .nome(request.getNome())
                .email(request.getEmail())
                .senhaHash(passwordEncoder.encode(request.getSenha()))
                .cargo(request.getCargo())
                .oab(request.getOab())
                .cpf(cpf)
                .habilitadoDomicilio(Boolean.TRUE.equals(request.getHabilitadoDomicilio()))
                .papel(papel)
                .unidade(unidade)
                .build();

        return toResponse(usuarioRepository.save(usuario));
    }

    @Transactional
    public UsuarioResponse atualizar(UUID id, AtualizarUsuarioRequest request) {
        Usuario usuario = findOrThrow(id);

        if (request.getNome() != null) {
            usuario.setNome(request.getNome());
        }

        if (request.getEmail() != null) {
            if (!usuario.getEmail().equalsIgnoreCase(request.getEmail())
                    && usuarioRepository.existsByEmailIgnoreCase(request.getEmail())) {
                throw new BusinessException("Ja existe um usuario com este e-mail");
            }
            usuario.setEmail(request.getEmail());
        }

        if (request.getCargo() != null) {
            usuario.setCargo(request.getCargo());
        }

        if (request.getOab() != null) {
            usuario.setOab(request.getOab());
        }

        if (request.getCpf() != null) {
            String cpf = normalizarCpf(request.getCpf());
            validarCpfDisponivel(cpf, usuario.getCpf());
            usuario.setCpf(cpf);
        }

        if (request.getHabilitadoDomicilio() != null) {
            usuario.setHabilitadoDomicilio(request.getHabilitadoDomicilio());
        }

        if (request.getPapel() != null) {
            usuario.setPapel(parsePapel(request.getPapel()));
        }

        if (request.getUnidadeId() != null) {
            Unidade unidade = unidadeRepository.findById(request.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade nao encontrada"));
            usuario.setUnidade(unidade);
        }

        if (request.getAtivo() != null) {
            usuario.setAtivo(request.getAtivo());
        }

        validarRegrasDomicilio(usuario.getCpf(), usuario.getHabilitadoDomicilio());

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

    private void validarSenha(String senha) {
        if (senha == null || senha.length() < 8) {
            throw new BusinessException("A senha deve ter no minimo 8 caracteres");
        }
        if (!senha.matches(".*[A-Z].*")) {
            throw new BusinessException("A senha deve conter pelo menos uma letra maiuscula");
        }
        if (!senha.matches(".*[0-9].*")) {
            throw new BusinessException("A senha deve conter pelo menos um numero");
        }
        if (!senha.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*")) {
            throw new BusinessException("A senha deve conter pelo menos um caractere especial (!@#$%^&*...)");
        }
    }

    private void validarCpfDisponivel(String cpfNormalizado, String cpfAtual) {
        if (cpfNormalizado == null) {
            return;
        }

        if (cpfAtual != null && cpfAtual.equals(cpfNormalizado)) {
            return;
        }

        if (usuarioRepository.existsByCpf(cpfNormalizado)) {
            throw new BusinessException("Ja existe um usuario com este CPF.");
        }
    }

    private void validarRegrasDomicilio(String cpf, Boolean habilitadoDomicilio) {
        if (Boolean.TRUE.equals(habilitadoDomicilio) && (cpf == null || cpf.isBlank())) {
            throw new BusinessException("Informe um CPF valido para habilitar o usuario no Domicilio.");
        }
    }

    private String normalizarCpf(String cpf) {
        if (cpf == null || cpf.isBlank()) {
            return null;
        }

        String limpo = cpf.replaceAll("\\D", "");
        if (limpo.length() != 11) {
            throw new BusinessException("CPF invalido. Informe 11 digitos.");
        }

        return limpo;
    }

    private UserRole parsePapel(String papel) {
        try {
            return UserRole.valueOf(papel.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Papel invalido. Use: ADMINISTRADOR, ADVOGADO ou SECRETARIA");
        }
    }

    private Usuario findOrThrow(UUID id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));
    }

    private UsuarioResponse toResponse(Usuario usuario) {
        return UsuarioResponse.builder()
                .id(usuario.getId().toString())
                .nome(usuario.getNome())
                .email(usuario.getEmail())
                .cargo(usuario.getCargo())
                .oab(usuario.getOab())
                .cpf(usuario.getCpf())
                .habilitadoDomicilio(usuario.getHabilitadoDomicilio())
                .papel(usuario.getPapel().name())
                .ativo(usuario.getAtivo())
                .initials(usuario.getInitials())
                .unidadeId(usuario.getUnidade().getId().toString())
                .unidadeNome(usuario.getUnidade().getNome())
                .criadoEm(usuario.getCriadoEm().toString())
                .build();
    }
}
