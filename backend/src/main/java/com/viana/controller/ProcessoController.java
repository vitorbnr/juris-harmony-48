package com.viana.controller;

import com.viana.dto.request.AtualizarProcessoRequest;
import com.viana.dto.request.CriarMovimentacaoRequest;
import com.viana.dto.request.CriarProcessoRequest;
import com.viana.dto.response.ProcessoResponse;
import com.viana.service.ProcessoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/processos")
@RequiredArgsConstructor
public class ProcessoController {

    private final ProcessoService processoService;

    @GetMapping
    public ResponseEntity<Page<ProcessoResponse>> listar(
            @RequestParam(required = false) UUID unidadeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20, sort = "criadoEm", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(processoService.listar(unidadeId, status, tipo, busca, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProcessoResponse> buscar(@PathVariable UUID id) {
        return ResponseEntity.ok(processoService.buscarPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<ProcessoResponse> criar(@Valid @RequestBody CriarProcessoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(processoService.criar(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<ProcessoResponse> atualizar(@PathVariable UUID id,
                                                      @RequestBody AtualizarProcessoRequest request) {
        return ResponseEntity.ok(processoService.atualizar(id, request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<ProcessoResponse> alterarStatus(@PathVariable UUID id,
                                                           @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(processoService.alterarStatus(id, body.get("status")));
    }

    @PostMapping("/{id}/movimentacoes")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<ProcessoResponse.MovimentacaoResponse> adicionarMovimentacao(
            @PathVariable UUID id,
            @Valid @RequestBody CriarMovimentacaoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(processoService.adicionarMovimentacao(id, request));
    }
}
