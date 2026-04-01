package com.viana.controller;

import com.viana.dto.request.AtualizarPrazoRequest;
import com.viana.dto.request.CriarPrazoRequest;
import com.viana.dto.response.PrazoResponse;
import com.viana.model.Usuario;
import com.viana.model.enums.UserRole;
import com.viana.repository.UsuarioRepository;
import com.viana.service.PrazoService;
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
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/prazos")
@RequiredArgsConstructor
public class PrazoController {

    private final PrazoService prazoService;
    private final UsuarioRepository usuarioRepository;

    @GetMapping
    public ResponseEntity<Page<PrazoResponse>> listar(
            @RequestParam(required = false) UUID unidadeId,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) Boolean concluido,
            @RequestParam(required = false) UUID advogadoId,
            @PageableDefault(size = 20, sort = "data", direction = Sort.Direction.ASC) Pageable pageable,
            Authentication authentication) {

        Usuario usuario = getUsuario(authentication);
        // Sobrescrevemos o ID solicitado para sempre ser o do próprio usuário (privacidade estrita)
        UUID idParaListar = usuario.getId();

        return ResponseEntity.ok(prazoService.listar(unidadeId, tipo, concluido, idParaListar, pageable));
    }

    @GetMapping("/calendario")
    public ResponseEntity<List<PrazoResponse>> calendario(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fim,
            @RequestParam(required = false) UUID advogadoId,
            @RequestParam(required = false) UUID unidadeId,
            Authentication authentication) {

        Usuario usuario = getUsuario(authentication);
        // Visão do calendário agora é sempre individual para todos os papéis
        return ResponseEntity.ok(prazoService.getCalendario(usuario.getId(), unidadeId, inicio, fim));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<PrazoResponse> criar(@Valid @RequestBody CriarPrazoRequest request, Authentication authentication) {
        Usuario usuario = getUsuario(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(prazoService.criar(request, usuario.getId()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO', 'SECRETARIA')")
    public ResponseEntity<PrazoResponse> atualizar(@PathVariable UUID id,
                                                    @RequestBody AtualizarPrazoRequest request,
                                                    Authentication authentication) {
        Usuario usuario = getUsuario(authentication);
        return ResponseEntity.ok(prazoService.atualizar(id, request, usuario.getId()));
    }

    @PatchMapping("/{id}/concluir")
    public ResponseEntity<PrazoResponse> concluir(@PathVariable UUID id) {
        return ResponseEntity.ok(prazoService.marcarConcluido(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ADVOGADO')")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        prazoService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    private Usuario getUsuario(Authentication authentication) {
        return usuarioRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
    }
}
