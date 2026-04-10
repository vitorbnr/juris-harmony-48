package com.viana.service;

import com.viana.dto.response.DocumentoResponse;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Cliente;
import com.viana.model.Documento;
import com.viana.model.Pasta;
import com.viana.model.Processo;
import com.viana.model.Usuario;
import com.viana.model.enums.CategoriaDocumento;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.TipoAcao;
import com.viana.repository.ClienteRepository;
import com.viana.repository.DocumentoRepository;
import com.viana.repository.PastaRepository;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
        try {
            cat = CategoriaDocumento.valueOf(categoria.toUpperCase());
        } catch (Exception e) {
            cat = CategoriaDocumento.OUTROS;
        }

        Cliente cliente = clienteId != null ? clienteRepository.findById(clienteId).orElse(null) : null;
        Processo processo = processoId != null ? processoRepository.findById(processoId).orElse(null) : null;
        Pasta pasta = pastaId != null ? pastaRepository.findById(pastaId).orElse(null) : null;
        Usuario uploadedPor = usuarioRepository.findById(uploadedPorId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        String storageKey = storageService.upload(file, unidadeId, clienteId, processoId);

        String filename = file.getOriginalFilename();
        String ext = filename != null && filename.contains(".")
                ? filename.substring(filename.lastIndexOf('.') + 1)
                : "bin";

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

        try {
            logAuditoriaService.registrar(
                    uploadedPorId,
                    TipoAcao.FEZ_UPLOAD,
                    ModuloLog.DOCUMENTOS,
                    "Upload: " + filename + " (" + formatarTamanho(file.getSize()) + ")"
            );
        } catch (Exception ignored) {
        }

        return response;
    }

    @Transactional(readOnly = true)
    public String getDownloadUrl(UUID id) {
        Documento doc = documentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Documento não encontrado"));
        return storageService.generatePresignedUrl(doc.getStorageKey());
    }

    @Transactional(readOnly = true)
    public String getDownloadUrl(UUID id, UUID unidadeId, boolean isAdmin) {
        Documento doc = findDocumentoAutorizado(id, unidadeId, isAdmin);
        return storageService.generatePresignedUrl(doc.getStorageKey());
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listar(UUID clienteId, UUID processoId, String busca, Pageable pageable) {
        String buscaNorm = (busca != null && !busca.isBlank()) ? busca : null;
        return documentoRepository.findAllWithFilters(clienteId, processoId, null, buscaNorm, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listar(UUID clienteId, UUID processoId, String busca, Pageable pageable,
                                          UUID unidadeId, boolean isAdmin) {
        String buscaNorm = (busca != null && !busca.isBlank()) ? busca : null;
        UUID unidadeEscopo = isAdmin ? null : unidadeId;
        return documentoRepository.findAllWithFilters(clienteId, processoId, unidadeEscopo, buscaNorm, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorPasta(UUID pastaId, Pageable pageable) {
        return documentoRepository.findByPastaId(pastaId, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorPasta(UUID pastaId, Pageable pageable, UUID unidadeId, boolean isAdmin) {
        return documentoRepository.findByPastaIdWithScope(pastaId, isAdmin ? null : unidadeId, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorCliente(UUID clienteId, Pageable pageable) {
        return documentoRepository.findByClienteId(clienteId, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorCliente(UUID clienteId, Pageable pageable, UUID unidadeId, boolean isAdmin) {
        return documentoRepository.findByClienteIdWithScope(clienteId, isAdmin ? null : unidadeId, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorProcesso(UUID processoId, Pageable pageable) {
        return documentoRepository.findByProcessoId(processoId, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorProcesso(UUID processoId, Pageable pageable, UUID unidadeId, boolean isAdmin) {
        return documentoRepository.findByProcessoIdWithScope(processoId, isAdmin ? null : unidadeId, pageable)
                .map(this::toResponse);
    }

    @Transactional
    public void excluir(UUID id) {
        Documento doc = documentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Documento não encontrado"));
        storageService.delete(doc.getStorageKey());
        documentoRepository.delete(doc);
    }

    @Transactional(readOnly = true)
    public List<Map<String, String>> listarClientesComDocumentos() {
        return documentoRepository.findDistinctClientes(null);
    }

    @Transactional(readOnly = true)
    public List<Map<String, String>> listarClientesComDocumentos(UUID unidadeId, boolean isAdmin) {
        return documentoRepository.findDistinctClientes(isAdmin ? null : unidadeId);
    }

    @Transactional(readOnly = true)
    public Documento findDocumentoAutorizado(UUID id, UUID unidadeId, boolean isAdmin) {
        Documento documento = documentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Documento não encontrado"));
        validarAcessoDocumento(documento, unidadeId, isAdmin);
        return documento;
    }

    @Transactional(readOnly = true)
    public Documento findDocumentoAutorizadoPorStorageKey(String storageKey, UUID unidadeId, boolean isAdmin) {
        Documento documento = documentoRepository.findByStorageKey(storageKey)
                .orElseThrow(() -> new ResourceNotFoundException("Documento não encontrado"));
        validarAcessoDocumento(documento, unidadeId, isAdmin);
        return documento;
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

    private void validarAcessoDocumento(Documento documento, UUID unidadeId, boolean isAdmin) {
        if (isAdmin) {
            return;
        }

        if (unidadeId == null) {
            throw new ResourceNotFoundException("Documento não encontrado");
        }

        UUID unidadeDocumento = extrairUnidadeDocumento(documento);
        if (unidadeDocumento == null || !unidadeDocumento.equals(unidadeId)) {
            throw new ResourceNotFoundException("Documento não encontrado");
        }
    }

    private UUID extrairUnidadeDocumento(Documento documento) {
        List<UUID> candidatas = new ArrayList<>();

        if (documento.getProcesso() != null && documento.getProcesso().getUnidade() != null) {
            candidatas.add(documento.getProcesso().getUnidade().getId());
        }

        if (documento.getCliente() != null && documento.getCliente().getUnidade() != null) {
            candidatas.add(documento.getCliente().getUnidade().getId());
        }

        if (documento.getPasta() != null) {
            if (documento.getPasta().getProcesso() != null && documento.getPasta().getProcesso().getUnidade() != null) {
                candidatas.add(documento.getPasta().getProcesso().getUnidade().getId());
            }
            if (documento.getPasta().getCliente() != null && documento.getPasta().getCliente().getUnidade() != null) {
                candidatas.add(documento.getPasta().getCliente().getUnidade().getId());
            }
        }

        if (documento.getUploadedPor() != null && documento.getUploadedPor().getUnidade() != null) {
            candidatas.add(documento.getUploadedPor().getUnidade().getId());
        }

        return candidatas.stream().filter(id -> id != null).findFirst().orElse(null);
    }
}
