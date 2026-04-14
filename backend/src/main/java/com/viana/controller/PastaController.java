package com.viana.controller;

import com.viana.dto.request.CriarPastaInternaRequest;
import com.viana.dto.response.PastaInternaResponse;
import com.viana.model.Usuario;
import com.viana.repository.UsuarioRepository;
import com.viana.service.PastaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pastas")
@RequiredArgsConstructor
public class PastaController {

    private final PastaService pastaService;
    private final UsuarioRepository usuarioRepository;

    @GetMapping("/internas")
    public ResponseEntity<List<PastaInternaResponse>> listarInternas(Authentication authentication) {
        Usuario usuario = getUsuario(authentication);
        return ResponseEntity.ok(
                pastaService.listarInternas(getUnidadeEscopo(usuario), isAdmin(authentication))
        );
    }

    @PostMapping("/internas")
    public ResponseEntity<PastaInternaResponse> criarInterna(
            @Valid @RequestBody CriarPastaInternaRequest request,
            Authentication authentication) {
        Usuario usuario = getUsuario(authentication);
        PastaInternaResponse response = pastaService.criarInterna(request, getUnidadeEscopo(usuario));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    private Usuario getUsuario(Authentication authentication) {
        String email = authentication.getName();
        return usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Usuario nao encontrado"));
    }

    private UUID getUnidadeEscopo(Usuario usuario) {
        return usuario.getUnidade() != null ? usuario.getUnidade().getId() : null;
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRADOR"));
    }
}
