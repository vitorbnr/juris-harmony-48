package com.viana.controller;

import com.viana.dto.response.NotificacaoResponse;
import com.viana.model.Usuario;
import com.viana.repository.UsuarioRepository;
import com.viana.service.NotificacaoService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notificacoes")
@RequiredArgsConstructor
public class NotificacaoController {

    private final NotificacaoService notificacaoService;
    private final UsuarioRepository usuarioRepository;

    @GetMapping
    public ResponseEntity<Page<NotificacaoResponse>> listar(
            @PageableDefault(size = 20, sort = "criadaEm", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication) {
        UUID usuarioId = getUsuarioId(authentication);
        return ResponseEntity.ok(notificacaoService.listarDoUsuario(usuarioId, pageable));
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> contarNaoLidas(Authentication authentication) {
        UUID usuarioId = getUsuarioId(authentication);
        long count = notificacaoService.contarNaoLidas(usuarioId);
        return ResponseEntity.ok(Map.of("naoLidas", count));
    }

    @PatchMapping("/{id}/lida")
    public ResponseEntity<NotificacaoResponse> marcarComoLida(@PathVariable UUID id) {
        return ResponseEntity.ok(notificacaoService.marcarComoLida(id));
    }

    private UUID getUsuarioId(Authentication authentication) {
        String email = authentication.getName();
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        return usuario.getId();
    }
}
