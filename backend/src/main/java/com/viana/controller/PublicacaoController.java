package com.viana.controller;

import com.viana.dto.request.AtualizarStatusPublicacaoRequest;
import com.viana.dto.response.PublicacaoResponse;
import com.viana.service.PublicacaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/publicacoes")
@RequiredArgsConstructor
public class PublicacaoController {

    private final PublicacaoService publicacaoService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<List<PublicacaoResponse>> listar(
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(publicacaoService.listar(status));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<PublicacaoResponse> atualizarStatus(
            @PathVariable UUID id,
            @Valid @RequestBody AtualizarStatusPublicacaoRequest request
    ) {
        return ResponseEntity.ok(publicacaoService.atualizarStatus(id, request.getStatus()));
    }
}
