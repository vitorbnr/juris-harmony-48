package com.viana.controller;

import com.viana.dto.request.AtualizarNotaPessoalRequest;
import com.viana.dto.response.NotaPessoalResponse;
import com.viana.model.Usuario;
import com.viana.repository.UsuarioRepository;
import com.viana.service.NotaPessoalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notas-pessoais")
@RequiredArgsConstructor
public class NotaPessoalController {

    private final NotaPessoalService notaPessoalService;
    private final UsuarioRepository usuarioRepository;

    @GetMapping("/minha-nota")
    public ResponseEntity<NotaPessoalResponse> buscarMinhaNota(Authentication authentication) {
        Usuario usuario = getUsuario(authentication);
        return ResponseEntity.ok(notaPessoalService.buscarMinhaNota(usuario.getId()));
    }

    @PutMapping("/minha-nota")
    public ResponseEntity<NotaPessoalResponse> atualizarMinhaNota(
            @RequestBody AtualizarNotaPessoalRequest request,
            Authentication authentication
    ) {
        Usuario usuario = getUsuario(authentication);
        return ResponseEntity.ok(notaPessoalService.salvarMinhaNota(usuario.getId(), request));
    }

    private Usuario getUsuario(Authentication authentication) {
        return usuarioRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario nao encontrado"));
    }
}
