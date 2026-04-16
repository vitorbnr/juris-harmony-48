package com.viana.controller;

import com.viana.dto.request.CriarAtendimentoRequest;
import com.viana.dto.response.AtendimentoResponse;
import com.viana.dto.response.ProcessoResponse;
import com.viana.model.Usuario;
import com.viana.repository.UsuarioRepository;
import com.viana.service.AtendimentoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/atendimentos")
@RequiredArgsConstructor
public class AtendimentoController {

    private final AtendimentoService atendimentoService;
    private final UsuarioRepository usuarioRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<Page<AtendimentoResponse>> listar(
            @RequestParam(required = false) UUID unidadeId,
            @RequestParam(required = false) UUID clienteId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20, sort = "dataCriacao", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(atendimentoService.listar(unidadeId, clienteId, status, busca, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<AtendimentoResponse> buscar(@PathVariable UUID id) {
        return ResponseEntity.ok(atendimentoService.buscarPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<AtendimentoResponse> criar(
            @Valid @RequestBody CriarAtendimentoRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(atendimentoService.criarAtendimento(request, getUsuario(authentication).getId()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<AtendimentoResponse> atualizar(
            @PathVariable UUID id,
            @Valid @RequestBody CriarAtendimentoRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(atendimentoService.atualizar(id, request, getUsuario(authentication).getId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<Void> excluir(@PathVariable UUID id, Authentication authentication) {
        atendimentoService.excluir(id, getUsuario(authentication).getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/fechar")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<AtendimentoResponse> fechar(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(atendimentoService.fechar(id, getUsuario(authentication).getId()));
    }

    @PatchMapping("/{id}/reabrir")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<AtendimentoResponse> reabrir(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(atendimentoService.reabrir(id, getUsuario(authentication).getId()));
    }

    @PostMapping("/{id}/converter")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<ProcessoResponse> converter(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(atendimentoService.converterParaProcesso(id, getUsuario(authentication).getId()));
    }

    private Usuario getUsuario(Authentication authentication) {
        return usuarioRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario nao encontrado"));
    }
}
