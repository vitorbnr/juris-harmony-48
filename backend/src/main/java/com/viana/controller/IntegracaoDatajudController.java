package com.viana.controller;

import com.viana.dto.response.IntegracaoDatajudResponse;
import com.viana.service.IntegracaoDatajudService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/integracoes/datajud")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMINISTRADOR')")
public class IntegracaoDatajudController {

    private final IntegracaoDatajudService integracaoDatajudService;

    @GetMapping
    public ResponseEntity<IntegracaoDatajudResponse> buscarDiagnostico() {
        return ResponseEntity.ok(integracaoDatajudService.buscarDiagnostico());
    }
}
