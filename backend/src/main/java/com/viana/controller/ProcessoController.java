package com.viana.controller;

import com.viana.dto.request.AtualizarProcessoRequest;
import com.viana.dto.request.CriarMovimentacaoRequest;
import com.viana.dto.request.CriarProcessoRequest;
import com.viana.dto.response.DatajudCapaResponse;
import com.viana.dto.response.ProcessoResponse;
import com.viana.exception.BusinessException;
import com.viana.service.DatajudClientService;
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

    private final DatajudClientService datajudClientService;
    private final ProcessoService processoService;

    @GetMapping
    public ResponseEntity<Page<ProcessoResponse>> listar(
            @RequestParam(required = false) UUID unidadeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) String etiqueta,
            @PageableDefault(size = 20, sort = "criado_em", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(processoService.listar(unidadeId, status, tipo, busca, etiqueta, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProcessoResponse> buscar(@PathVariable UUID id) {
        return ResponseEntity.ok(processoService.buscarPorId(id));
    }

    @GetMapping("/consulta-datajud/{numeroCnj}")
    public ResponseEntity<DatajudCapaResponse> consultarDatajud(@PathVariable String numeroCnj) {
        String numeroCnjLimpo = numeroCnj == null ? "" : numeroCnj.replaceAll("\\D", "");
        if (numeroCnjLimpo.length() != 20) {
            throw new BusinessException("O número CNJ deve conter 20 dígitos.");
        }

        return ResponseEntity.ok(datajudClientService.buscarCapaProcesso(numeroCnjLimpo));
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

    @PostMapping("/{id}/sincronizar-datajud")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<Map<String, Object>> sincronizarDatajud(@PathVariable UUID id) {
        int movimentacoesNovas = processoService.sincronizarMovimentacoesDatajud(id, true);
        return ResponseEntity.ok(Map.of("movimentacoesNovas", movimentacoesNovas));
    }

    @PostMapping("/sincronizar-datajud")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<Map<String, Object>> sincronizarDatajudEmLote() {
        ProcessoService.DatajudSyncResumo resumo = processoService.sincronizarProcessosAtivosDatajud(true);
        return ResponseEntity.ok(Map.of(
                "processosAvaliados", resumo.processosAvaliados(),
                "processosComNovidade", resumo.processosComNovidade(),
                "movimentacoesNovas", resumo.movimentacoesNovas(),
                "falhas", resumo.falhas()
        ));
    }
}
