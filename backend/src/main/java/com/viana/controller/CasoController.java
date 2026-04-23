package com.viana.controller;

import com.viana.dto.request.CriarCasoRequest;
import com.viana.dto.response.CasoResponse;
import com.viana.model.Usuario;
import com.viana.repository.UsuarioRepository;
import com.viana.service.CasoService;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/casos")
@RequiredArgsConstructor
public class CasoController {

    private final CasoService casoService;
    private final UsuarioRepository usuarioRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<Page<CasoResponse>> listar(
            @RequestParam(required = false) UUID unidadeId,
            @RequestParam(required = false) UUID clienteId,
            @RequestParam(required = false) UUID responsavelId,
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20, sort = "atualizadoEm", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(casoService.listar(unidadeId, clienteId, responsavelId, busca, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<CasoResponse> buscar(@PathVariable UUID id) {
        return ResponseEntity.ok(casoService.buscarPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<CasoResponse> criar(
            @Valid @RequestBody CriarCasoRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(casoService.criar(request, getUsuario(authentication).getId()));
    }

    private Usuario getUsuario(Authentication authentication) {
        return usuarioRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario nao encontrado"));
    }
}
