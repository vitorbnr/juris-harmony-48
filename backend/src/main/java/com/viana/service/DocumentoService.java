package com.viana.service;

import com.viana.dto.response.DocumentoResponse;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.*;
import com.viana.model.enums.CategoriaDocumento;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.TipoAcao;
import com.viana.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentoService {

    private final DocumentoRepository documentoRepository;
    private final ClienteRepository clienteRepository;
    private final ProcessoRepository processoRepository;
    private final PastaRepository pastaRepository;
    private final UsuarioRepository usuarioRepository;
    private final StorageService storageService;
    private final LogAuditoriaService logAuditoriaService;

    @Transactional
    public DocumentoResponse upload(MultipartFile file, String categoria, UUID clienteId,
                                     UUID processoId, UUID pastaId, UUID unidadeId, UUID uploadedPorId) throws IOException {
        CategoriaDocumento cat;
        try { cat = CategoriaDocumento.valueOf(categoria.toUpperCase()); }
        catch (Exception e) { cat = CategoriaDocumento.OUTROS; }

        Cliente cliente = clienteId != null ? clienteRepository.findById(clienteId).orElse(null) : null;
        Processo processo = processoId != null ? processoRepository.findById(processoId).orElse(null) : null;
        Pasta pasta = pastaId != null ? pastaRepository.findById(pastaId).orElse(null) : null;
        Usuario uploadedPor = usuarioRepository.findById(uploadedPorId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        // Upload para Cloudflare R2
        String storageKey = storageService.upload(file, unidadeId, clienteId, processoId);

        String filename = file.getOriginalFilename();
        String ext = filename != null && filename.contains(".")
                ? filename.substring(filename.lastIndexOf('.') + 1) : "bin";

        Documento doc = Documento.builder()
                .nome(filename != null ? filename : "arquivo")
                .tipo(ext.toLowerCase())
                .categoria(cat)
                .tamanhoBytes(file.getSize())
                .storageKey(storageKey)
                .cliente(cliente)
                .processo(processo)
                .pasta(pasta)
                .uploadedPor(uploadedPor)
                .build();

        DocumentoResponse response = toResponse(documentoRepository.save(doc));

        // Auditoria
        try {
            logAuditoriaService.registrar(uploadedPorId, TipoAcao.FEZ_UPLOAD, ModuloLog.DOCUMENTOS,
                    "Upload: " + filename + " (" + formatarTamanho(file.getSize()) + ")", "sistema");
        } catch (Exception ignored) {}

        return response;
    }

    @Transactional(readOnly = true)
    public String getDownloadUrl(UUID id) {
        Documento doc = documentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Documento não encontrado"));
        return storageService.generatePresignedUrl(doc.getStorageKey());
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listar(UUID clienteId, UUID processoId, String busca, Pageable pageable) {
        String buscaNorm = (busca != null && !busca.isBlank()) ? busca : null;
        return documentoRepository.findAllWithFilters(clienteId, processoId, buscaNorm, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorPasta(UUID pastaId, Pageable pageable) {
        return documentoRepository.findByPastaId(pastaId, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorCliente(UUID clienteId, Pageable pageable) {
        return documentoRepository.findByClienteId(clienteId, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorProcesso(UUID processoId, Pageable pageable) {
        return documentoRepository.findByProcessoId(processoId, pageable).map(this::toResponse);
    }

    @Transactional
    public void excluir(UUID id) {
        Documento doc = documentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Documento não encontrado"));
        storageService.delete(doc.getStorageKey());
        documentoRepository.delete(doc);
    }

    private DocumentoResponse toResponse(Documento d) {
        return DocumentoResponse.builder()
                .id(d.getId().toString())
                .nome(d.getNome())
                .tipo(d.getTipo())
                .categoria(d.getCategoria().name().toLowerCase())
                .tamanhoBytes(d.getTamanhoBytes())
                .tamanho(formatarTamanho(d.getTamanhoBytes()))
                .clienteId(d.getCliente() != null ? d.getCliente().getId().toString() : null)
                .clienteNome(d.getCliente() != null ? d.getCliente().getNome() : null)
                .processoId(d.getProcesso() != null ? d.getProcesso().getId().toString() : null)
                .processoNumero(d.getProcesso() != null ? d.getProcesso().getNumero() : null)
                .pastaId(d.getPasta() != null ? d.getPasta().getId().toString() : null)
                .dataUpload(d.getDataUpload().toString())
                .uploadedPor(d.getUploadedPor().getNome())
                .build();
    }

    private String formatarTamanho(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024L * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024));
        return String.format("%.1f GB", bytes / (1024.0 * 1024 * 1024));
    }
}
