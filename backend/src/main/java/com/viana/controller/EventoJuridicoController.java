package com.viana.controller;

import com.viana.dto.request.CriarPrazoEventoRequest;
import com.viana.dto.request.VincularEventoProcessoRequest;
import com.viana.dto.response.EventoJuridicoResponse;
import com.viana.dto.response.PrazoResponse;
import com.viana.model.Usuario;
import com.viana.repository.UsuarioRepository;
import com.viana.service.DomicilioSyncService;
import com.viana.service.EventoJuridicoService;
import com.viana.service.PrazoService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/eventos-juridicos")
@RequiredArgsConstructor
public class EventoJuridicoController {

    private final EventoJuridicoService eventoJuridicoService;
    private final DomicilioSyncService domicilioSyncService;
    private final PrazoService prazoService;
    private final UsuarioRepository usuarioRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<Page<EventoJuridicoResponse>> listar(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String fonte,
            @RequestParam(required = false) UUID processoId,
            @RequestParam(required = false) UUID responsavelId,
            @PageableDefault(size = 20, sort = "criadoEm", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(eventoJuridicoService.listar(status, fonte, processoId, responsavelId, pageable));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<EventoJuridicoResponse> atualizarStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(eventoJuridicoService.atualizarStatus(id, body.get("status")));
    }

    @PatchMapping("/{id}/vincular-processo")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<EventoJuridicoResponse> vincularProcesso(
            @PathVariable UUID id,
            @RequestBody VincularEventoProcessoRequest request
    ) {
        return ResponseEntity.ok(eventoJuridicoService.vincularProcesso(id, request.getProcessoId()));
    }

    @PatchMapping("/{id}/assumir")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<EventoJuridicoResponse> assumir(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(eventoJuridicoService.assumirResponsabilidade(id, authentication.getName()));
    }

    @org.springframework.web.bind.annotation.PostMapping("/{id}/criar-prazo")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<PrazoResponse> criarPrazo(
            @PathVariable UUID id,
            @RequestBody CriarPrazoEventoRequest request,
            Authentication authentication
    ) {
        Usuario usuario = getUsuario(authentication);
        return ResponseEntity.ok(prazoService.criarAPartirDoEvento(id, request, usuario.getId()));
    }

    @org.springframework.web.bind.annotation.PostMapping("/sincronizar-domicilio")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<Map<String, Object>> sincronizarDomicilio(
            @RequestParam(required = false) LocalDate dataInicio,
            @RequestParam(required = false) LocalDate dataFim,
            @RequestParam(required = false) String numeroProcesso
    ) {
        LocalDate fim = dataFim != null ? dataFim : LocalDate.now();
        LocalDate inicio = dataInicio != null ? dataInicio : fim.minusDays(1);
        int eventosNovos = domicilioSyncService.sincronizar(inicio, fim, numeroProcesso, true);

        return ResponseEntity.ok(Map.of(
                "eventosNovos", eventosNovos,
                "dataInicio", inicio,
                "dataFim", fim,
                "readOnly", true
        ));
    }

    private Usuario getUsuario(Authentication authentication) {
        return usuarioRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario nao encontrado"));
    }
}
