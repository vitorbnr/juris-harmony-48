package com.viana.controller;

import com.viana.dto.request.AtualizarIntegracaoDomicilioRequest;
import com.viana.dto.response.IntegracaoDomicilioResponse;
import com.viana.dto.response.TesteIntegracaoDomicilioResponse;
import com.viana.service.IntegracaoDomicilioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/integracoes/domicilio")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMINISTRADOR')")
public class IntegracaoController {

    private final IntegracaoDomicilioService integracaoDomicilioService;

    @GetMapping
    public ResponseEntity<IntegracaoDomicilioResponse> buscarConfiguracao() {
        return ResponseEntity.ok(integracaoDomicilioService.buscarConfiguracao());
    }

    @PatchMapping
    public ResponseEntity<IntegracaoDomicilioResponse> atualizarConfiguracao(
            @RequestBody AtualizarIntegracaoDomicilioRequest request
    ) {
        return ResponseEntity.ok(integracaoDomicilioService.atualizarConfiguracao(request));
    }

    @PostMapping("/testar")
    public ResponseEntity<TesteIntegracaoDomicilioResponse> testarConexao() {
        return ResponseEntity.ok(integracaoDomicilioService.testarConexao());
    }
}
