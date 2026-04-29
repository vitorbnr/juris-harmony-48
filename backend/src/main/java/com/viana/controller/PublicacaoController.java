package com.viana.controller;

import com.viana.dto.request.AtualizarStatusPublicacaoRequest;
import com.viana.dto.request.AtribuirPublicacaoRequest;
import com.viana.dto.request.CriarAtividadePublicacaoRequest;
import com.viana.dto.request.DescartarPublicacaoRequest;
import com.viana.dto.request.IngestarPublicacaoRequest;
import com.viana.dto.request.VincularProcessoPublicacaoRequest;
import com.viana.dto.response.PublicacaoCapturaExecucaoResponse;
import com.viana.dto.response.PublicacaoDjenSyncResponse;
import com.viana.dto.response.PublicacaoHistoricoResponse;
import com.viana.dto.response.PublicacaoMetricasResponse;
import com.viana.dto.response.PublicacaoMonitoramentoResponse;
import com.viana.dto.response.PublicacaoResponse;
import com.viana.dto.response.PublicacaoTratamentoResponse;
import com.viana.service.PublicacaoCapturaExecucaoService;
import com.viana.service.PublicacaoDjenColetaService;
import com.viana.service.PublicacaoMonitoramentoService;
import com.viana.service.PublicacaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/publicacoes")
@RequiredArgsConstructor
public class PublicacaoController {

    private final PublicacaoService publicacaoService;
    private final PublicacaoMonitoramentoService publicacaoMonitoramentoService;
    private final PublicacaoDjenColetaService publicacaoDjenColetaService;
    private final PublicacaoCapturaExecucaoService publicacaoCapturaExecucaoService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<List<PublicacaoResponse>> listar(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) Boolean somenteRiscoPrazo,
            @RequestParam(required = false) String statusFluxo,
            @RequestParam(required = false) Boolean minhas,
            Authentication authentication
    ) {
        return ResponseEntity.ok(publicacaoService.listar(
                status,
                busca,
                somenteRiscoPrazo,
                statusFluxo,
                minhas,
                authentication.getName()
        ));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<PublicacaoMetricasResponse> buscarMetricas() {
        return ResponseEntity.ok(publicacaoService.buscarMetricas());
    }

    @GetMapping("/monitoramento")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<PublicacaoMonitoramentoResponse> buscarMonitoramento() {
        return ResponseEntity.ok(publicacaoMonitoramentoService.buscarStatus());
    }

    @GetMapping("/capturas")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<List<PublicacaoCapturaExecucaoResponse>> listarCapturas(
            @RequestParam(required = false, defaultValue = "10") Integer size
    ) {
        return ResponseEntity.ok(publicacaoCapturaExecucaoService.listarRecentes(size));
    }

    @PostMapping("/coleta/djen")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<PublicacaoDjenSyncResponse> coletarDjen(
            @RequestParam(required = false) String tribunal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data,
            @RequestParam(required = false) String cadernoTipo
    ) {
        if ((tribunal != null && !tribunal.isBlank()) || data != null) {
            return ResponseEntity.ok(publicacaoDjenColetaService.sincronizarReplay(tribunal, data, cadernoTipo));
        }
        return ResponseEntity.ok(publicacaoDjenColetaService.sincronizar(true));
    }

    @GetMapping("/{id}/historico")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<List<PublicacaoHistoricoResponse>> listarHistorico(@PathVariable UUID id) {
        return ResponseEntity.ok(publicacaoService.listarHistorico(id));
    }

    @PostMapping("/ingestao")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<PublicacaoResponse> ingestar(
            @Valid @RequestBody IngestarPublicacaoRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(publicacaoService.ingestar(request, authentication.getName()));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<PublicacaoResponse> atualizarStatus(
            @PathVariable UUID id,
            @Valid @RequestBody AtualizarStatusPublicacaoRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(publicacaoService.atualizarStatus(id, request.getStatus(), authentication.getName()));
    }

    @PatchMapping("/{id}/descartar")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<PublicacaoResponse> descartar(
            @PathVariable UUID id,
            @Valid @RequestBody DescartarPublicacaoRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(publicacaoService.descartar(id, request, authentication.getName()));
    }

    @PostMapping("/{id}/tarefas")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<PublicacaoTratamentoResponse> criarTarefa(
            @PathVariable UUID id,
            @Valid @RequestBody CriarAtividadePublicacaoRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(publicacaoService.criarTarefa(id, request, authentication.getName()));
    }

    @PostMapping("/{id}/prazos")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<PublicacaoTratamentoResponse> criarPrazo(
            @PathVariable UUID id,
            @Valid @RequestBody CriarAtividadePublicacaoRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(publicacaoService.criarPrazo(id, request, authentication.getName()));
    }

    @PostMapping("/{id}/audiencias")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<PublicacaoTratamentoResponse> criarAudiencia(
            @PathVariable UUID id,
            @Valid @RequestBody CriarAtividadePublicacaoRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(publicacaoService.criarAudiencia(id, request, authentication.getName()));
    }

    @PutMapping("/{id}/vincular-processo")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<PublicacaoResponse> vincularProcesso(
            @PathVariable UUID id,
            @Valid @RequestBody VincularProcessoPublicacaoRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(publicacaoService.vincularProcesso(id, request.getProcessoId(), authentication.getName()));
    }

    @PatchMapping("/{id}/atribuir")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<PublicacaoResponse> atribuir(
            @PathVariable UUID id,
            @Valid @RequestBody AtribuirPublicacaoRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(publicacaoService.atribuir(id, request.getUsuarioId(), authentication.getName()));
    }

    @PatchMapping("/{id}/assumir")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<PublicacaoResponse> assumir(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(publicacaoService.assumir(id, authentication.getName()));
    }

    @PostMapping("/{id}/ia/reprocessar")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<PublicacaoResponse> reprocessarTriagemInteligente(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(publicacaoService.reprocessarTriagemInteligente(id, authentication.getName()));
    }
}
