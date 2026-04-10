package com.viana.controller;

import com.viana.dto.response.DocumentoResponse;
import com.viana.model.Documento;
import com.viana.model.Usuario;
import com.viana.repository.DocumentoRepository;
import com.viana.repository.UsuarioRepository;
import com.viana.service.DocumentoService;
import com.viana.service.LogAuditoriaService;
import com.viana.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/documentos")
@RequiredArgsConstructor
public class DocumentoController {

    private final DocumentoService documentoService;
    private final DocumentoRepository documentoRepository;
    private final UsuarioRepository usuarioRepository;
    private final LogAuditoriaService logAuditoriaService;
    private final StorageService storageService;

    @GetMapping
    public ResponseEntity<Page<DocumentoResponse>> listar(
            @RequestParam(required = false) UUID clienteId,
            @RequestParam(required = false) UUID processoId,
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20, sort = "dataUpload", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication) {
        Usuario usuario = getUsuario(authentication);
        return ResponseEntity.ok(
                documentoService.listar(
                        clienteId,
                        processoId,
                        busca,
                        pageable,
                        getUnidadeEscopo(usuario),
                        isAdmin(authentication)
                )
        );
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
    public ResponseEntity<Map<String, String>> download(
            @PathVariable UUID id,
            Authentication authentication) {
        Usuario usuario = getUsuario(authentication);
        UUID unidadeEscopo = getUnidadeEscopo(usuario);
        boolean admin = isAdmin(authentication);

        Documento doc = documentoService.findDocumentoAutorizado(id, unidadeEscopo, admin);
        String url = documentoService.getDownloadUrl(id, unidadeEscopo, admin);

        try {
            logAuditoriaService.registrar(
                    usuario.getId(),
                    com.viana.model.enums.TipoAcao.BAIXOU,
                    com.viana.model.enums.ModuloLog.DOCUMENTOS,
                    "Download: " + doc.getNome()
            );
        } catch (Exception ignored) {
        }

        return ResponseEntity.ok(Map.of("url", url, "nome", doc.getNome()));
    }

    @GetMapping("/stream/{encodedKey}")
    public ResponseEntity<InputStreamResource> streamLocal(
            @PathVariable String encodedKey,
            Authentication authentication) throws IOException {
        String storageKey = encodedKey.replace("__", "/");
        Usuario usuario = getUsuario(authentication);

        documentoService.findDocumentoAutorizadoPorStorageKey(
                storageKey,
                getUnidadeEscopo(usuario),
                isAdmin(authentication)
        );

        InputStream stream = storageService.getLocalStream(storageKey);
        String filename = storageService.getOriginalFilename(storageKey);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(stream));
    }

    @GetMapping("/pasta/{pastaId}")
    public ResponseEntity<Page<DocumentoResponse>> listarPorPasta(
            @PathVariable UUID pastaId,
            @PageableDefault(size = 20, sort = "dataUpload", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication) {
        Usuario usuario = getUsuario(authentication);
        return ResponseEntity.ok(
                documentoService.listarPorPasta(pastaId, pageable, getUnidadeEscopo(usuario), isAdmin(authentication))
        );
    }

    @GetMapping("/cliente/{clienteId}")
    public ResponseEntity<Page<DocumentoResponse>> listarPorCliente(
            @PathVariable UUID clienteId,
            @PageableDefault(size = 200, sort = "dataUpload", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication) {
        Usuario usuario = getUsuario(authentication);
        return ResponseEntity.ok(
                documentoService.listarPorCliente(clienteId, pageable, getUnidadeEscopo(usuario), isAdmin(authentication))
        );
    }

    @GetMapping("/processo/{processoId}")
    public ResponseEntity<Page<DocumentoResponse>> listarPorProcesso(
            @PathVariable UUID processoId,
            @PageableDefault(size = 20, sort = "dataUpload", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication) {
        Usuario usuario = getUsuario(authentication);
        return ResponseEntity.ok(
                documentoService.listarPorProcesso(processoId, pageable, getUnidadeEscopo(usuario), isAdmin(authentication))
        );
    }

    @GetMapping("/clientes-com-documentos")
    public ResponseEntity<List<Map<String, String>>> clientesComDocumentos(Authentication authentication) {
        Usuario usuario = getUsuario(authentication);
        return ResponseEntity.ok(
                documentoService.listarClientesComDocumentos(getUnidadeEscopo(usuario), isAdmin(authentication))
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable UUID id, Authentication authentication) {
        UUID usuarioId = getUsuarioId(authentication);
        Documento doc = documentoRepository.findById(id)
                .orElseThrow(() -> new com.viana.exception.ResourceNotFoundException("Documento não encontrado"));

        boolean admin = isAdmin(authentication);
        boolean isUploader = doc.getUploadedPor().getId().equals(usuarioId);

        if (!admin && !isUploader) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        documentoService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    private UUID getUsuarioId(Authentication authentication) {
        return getUsuario(authentication).getId();
    }

    private Usuario getUsuario(Authentication authentication) {
        String email = authentication.getName();
        return usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
    }

    private UUID getUnidadeEscopo(Usuario usuario) {
        return usuario.getUnidade() != null ? usuario.getUnidade().getId() : null;
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRADOR"));
    }
}
