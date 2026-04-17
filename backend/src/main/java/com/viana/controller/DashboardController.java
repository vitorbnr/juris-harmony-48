package com.viana.controller;

import com.viana.dto.response.DashboardMetricasResponse;
import com.viana.model.Usuario;
import com.viana.repository.UsuarioRepository;
import com.viana.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final UsuarioRepository usuarioRepository;
    private final DashboardService dashboardService;

    @GetMapping({"", "/metricas"})
    public ResponseEntity<DashboardMetricasResponse> getDashboard(Authentication authentication) {
        UUID usuarioId = getUsuarioId(authentication);
        return ResponseEntity.ok(dashboardService.obterMetricas(usuarioId));
    }

    private UUID getUsuarioId(Authentication authentication) {
        String email = authentication.getName();
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        return usuario.getId();
    }
}
