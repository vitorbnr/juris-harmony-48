package com.viana.controller;

import com.viana.dto.request.AtualizarAtivoFontePublicacaoRequest;
import com.viana.dto.request.AtualizarFontePublicacaoMonitoradaRequest;
import com.viana.dto.request.CriarFontePublicacaoMonitoradaRequest;
import com.viana.dto.response.PublicacaoDjenSyncResponse;
import com.viana.dto.response.PublicacaoFonteMonitoradaResponse;
import com.viana.dto.response.PublicacaoFonteSyncExecucaoResponse;
import com.viana.service.PublicacaoDjenColetaService;
import com.viana.service.PublicacaoFonteMonitoradaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/publicacoes/fontes-monitoradas")
@RequiredArgsConstructor
public class PublicacaoFonteMonitoradaController {

    private final PublicacaoFonteMonitoradaService service;
    private final PublicacaoDjenColetaService publicacaoDjenColetaService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<List<PublicacaoFonteMonitoradaResponse>> listar(
            @RequestParam(required = false, defaultValue = "false") Boolean apenasAtivas
    ) {
        return ResponseEntity.ok(service.listar(apenasAtivas));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<PublicacaoFonteMonitoradaResponse> criar(
            @Valid @RequestBody CriarFontePublicacaoMonitoradaRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(request, authentication.getName()));
    }

    @PatchMapping("/{id}/ativo")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<PublicacaoFonteMonitoradaResponse> alterarAtivo(
            @PathVariable UUID id,
            @Valid @RequestBody AtualizarAtivoFontePublicacaoRequest request
    ) {
        return ResponseEntity.ok(service.alterarAtivo(id, request.getAtivo()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<PublicacaoFonteMonitoradaResponse> atualizar(
            @PathVariable UUID id,
            @Valid @RequestBody AtualizarFontePublicacaoMonitoradaRequest request
    ) {
        return ResponseEntity.ok(service.atualizar(id, request));
    }

    @PostMapping("/{id}/backfill-djen")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<PublicacaoDjenSyncResponse> executarBackfillFonte(
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @RequestParam(required = false) String cadernoTipo
    ) {
        return ResponseEntity.ok(publicacaoDjenColetaService.sincronizarPeriodoFonte(id, dataInicio, dataFim, cadernoTipo));
    }

    @PostMapping("/{id}/backfill-djen/async")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<PublicacaoFonteSyncExecucaoResponse> agendarBackfillFonte(
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @RequestParam(required = false) String cadernoTipo
    ) {
        return ResponseEntity.accepted().body(
                publicacaoDjenColetaService.agendarBackfillPeriodoFonte(id, dataInicio, dataFim, cadernoTipo)
        );
    }
}
