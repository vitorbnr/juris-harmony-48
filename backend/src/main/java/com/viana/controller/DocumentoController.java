package com.viana.controller;

import com.viana.dto.response.DocumentoResponse;
import com.viana.model.Usuario;
import com.viana.repository.UsuarioRepository;
import com.viana.service.DocumentoService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/documentos")
@RequiredArgsConstructor
public class DocumentoController {

    private final DocumentoService documentoService;
    private final UsuarioRepository usuarioRepository;

    /** Listagem geral com filtros opcionais */
    @GetMapping
    public ResponseEntity<Page<DocumentoResponse>> listar(
            @RequestParam(required = false) UUID clienteId,
            @RequestParam(required = false) UUID processoId,
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20, sort = "dataUpload", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(documentoService.listar(clienteId, processoId, busca, pageable));
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<DocumentoResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "OUTROS") String categoria,
            @RequestParam(required = false) UUID clienteId,
            @RequestParam(required = false) UUID processoId,
            @RequestParam(required = false) UUID pastaId,
            @RequestParam(required = false) UUID unidadeId,
            Authentication authentication) throws IOException {

        UUID uploadedPorId = getUsuarioId(authentication);
        DocumentoResponse response = documentoService.upload(file, categoria, clienteId, processoId, pastaId, unidadeId, uploadedPorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Map<String, String>> download(@PathVariable UUID id) {
        String url = documentoService.getDownloadUrl(id);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @GetMapping("/pasta/{pastaId}")
    public ResponseEntity<Page<DocumentoResponse>> listarPorPasta(
            @PathVariable UUID pastaId,
            @PageableDefault(size = 20, sort = "dataUpload", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(documentoService.listarPorPasta(pastaId, pageable));
    }

    @GetMapping("/cliente/{clienteId}")
    public ResponseEntity<Page<DocumentoResponse>> listarPorCliente(
            @PathVariable UUID clienteId,
            @PageableDefault(size = 20, sort = "dataUpload", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(documentoService.listarPorCliente(clienteId, pageable));
    }

    @GetMapping("/processo/{processoId}")
    public ResponseEntity<Page<DocumentoResponse>> listarPorProcesso(
            @PathVariable UUID processoId,
            @PageableDefault(size = 20, sort = "dataUpload", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(documentoService.listarPorProcesso(processoId, pageable));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        documentoService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    private UUID getUsuarioId(Authentication authentication) {
        String email = authentication.getName();
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        return usuario.getId();
    }
}
