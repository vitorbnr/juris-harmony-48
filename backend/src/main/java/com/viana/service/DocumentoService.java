package com.viana.service;

import com.viana.dto.response.AcervoCidadeResponse;
import com.viana.dto.response.AcervoClienteResponse;
import com.viana.dto.response.DocumentoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Cliente;
import com.viana.model.Documento;
import com.viana.model.Pasta;
import com.viana.model.Processo;
import com.viana.model.Usuario;
import com.viana.model.enums.CategoriaDocumento;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.TipoAcao;
import com.viana.model.enums.UserRole;
import com.viana.repository.ClienteRepository;
import com.viana.repository.DocumentoRepository;
import com.viana.repository.PastaRepository;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentoService {

    private record StorageDocumentContext(
            UUID unidadeId,
            UUID clienteId,
            String clienteNome,
            UUID processoId,
            String processoNumero,
            UUID pastaId
    ) {}

    private final DocumentoRepository documentoRepository;
    private final ClienteRepository clienteRepository;
    private final ProcessoRepository processoRepository;
    private final PastaRepository pastaRepository;
    private final UsuarioRepository usuarioRepository;
    private final StorageService storageService;
    private final LogAuditoriaService logAuditoriaService;

    @Transactional
    public DocumentoResponse upload(
            MultipartFile file,
            String categoria,
            UUID clienteId,
            UUID processoId,
            UUID pastaId,
            UUID unidadeId,
            UUID uploadedPorId) throws IOException {
        CategoriaDocumento cat;
        try {
            cat = CategoriaDocumento.valueOf(categoria.toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            cat = CategoriaDocumento.OUTROS;
        }

        Cliente cliente = clienteId != null ? clienteRepository.findById(clienteId).orElse(null) : null;
        Processo processo = processoId != null ? processoRepository.findById(processoId).orElse(null) : null;
        Pasta pasta = pastaId != null ? pastaRepository.findById(pastaId).orElse(null) : null;
        Usuario uploadedPor = usuarioRepository.findById(uploadedPorId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));

        validarRelacionamentos(cliente, processo, pasta);
        validarEscopoUpload(cliente, processo, pasta, uploadedPor);

        UUID unidadeEfetiva = resolverUnidadeId(unidadeId, cliente, processo, pasta, uploadedPor);
        String storageKey = storageService.upload(file, unidadeEfetiva, clienteId, processoId, pastaId);

        String filename = file.getOriginalFilename();
        String ext = filename != null && filename.contains(".")
                ? filename.substring(filename.lastIndexOf('.') + 1)
                : "bin";

        Documento doc = Documento.builder()
                .nome(filename != null ? filename : "arquivo")
                .tipo(ext.toLowerCase(Locale.ROOT))
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
                .orElseThrow(() -> new ResourceNotFoundException("Documento nao encontrado"));
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
        List<Documento> documentosDb = documentoRepository
                .findAllWithFilters(clienteId, processoId, null, buscaNorm, Pageable.unpaged())
                .getContent();

        return combinarComStorageLocal(documentosDb, pageable, null, true, clienteId, processoId, null, buscaNorm);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listar(
            UUID clienteId,
            UUID processoId,
            String busca,
            Pageable pageable,
            UUID unidadeId,
            boolean isAdmin) {
        String buscaNorm = (busca != null && !busca.isBlank()) ? busca : null;
        UUID unidadeEscopo = isAdmin ? null : unidadeId;
        List<Documento> documentosDb = documentoRepository
                .findAllWithFilters(clienteId, processoId, unidadeEscopo, buscaNorm, Pageable.unpaged())
                .getContent();

        return combinarComStorageLocal(documentosDb, pageable, unidadeId, isAdmin, clienteId, processoId, null, buscaNorm);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorPasta(UUID pastaId, Pageable pageable) {
        List<Documento> documentosDb = documentoRepository.findByPastaId(pastaId, Pageable.unpaged()).getContent();
        return combinarComStorageLocal(documentosDb, pageable, null, true, null, null, pastaId, null);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorPasta(UUID pastaId, Pageable pageable, UUID unidadeId, boolean isAdmin) {
        List<Documento> documentosDb = documentoRepository
                .findByPastaIdWithScope(pastaId, isAdmin ? null : unidadeId, Pageable.unpaged())
                .getContent();

        return combinarComStorageLocal(documentosDb, pageable, unidadeId, isAdmin, null, null, pastaId, null);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorCliente(UUID clienteId, Pageable pageable) {
        List<Documento> documentosDb = documentoRepository.findByClienteId(clienteId, Pageable.unpaged()).getContent();
        return combinarComStorageLocal(documentosDb, pageable, null, true, clienteId, null, null, null);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorCliente(UUID clienteId, Pageable pageable, UUID unidadeId, boolean isAdmin) {
        List<Documento> documentosDb = documentoRepository
                .findByClienteIdWithScope(clienteId, isAdmin ? null : unidadeId, Pageable.unpaged())
                .getContent();

        return combinarComStorageLocal(documentosDb, pageable, unidadeId, isAdmin, clienteId, null, null, null);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorProcesso(UUID processoId, Pageable pageable) {
        List<Documento> documentosDb = documentoRepository.findByProcessoId(processoId, Pageable.unpaged()).getContent();
        return combinarComStorageLocal(documentosDb, pageable, null, true, null, processoId, null, null);
    }

    @Transactional(readOnly = true)
    public Page<DocumentoResponse> listarPorProcesso(UUID processoId, Pageable pageable, UUID unidadeId, boolean isAdmin) {
        List<Documento> documentosDb = documentoRepository
                .findByProcessoIdWithScope(processoId, isAdmin ? null : unidadeId, Pageable.unpaged())
                .getContent();

        return combinarComStorageLocal(documentosDb, pageable, unidadeId, isAdmin, null, processoId, null, null);
    }

    @Transactional
    public void excluir(UUID id) {
        Documento doc = documentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Documento nao encontrado"));
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
    public List<AcervoCidadeResponse> listarAcervoClientes(UUID unidadeId, boolean isAdmin) {
        List<Cliente> clientes = clienteRepository.findAtivosParaAcervo(isAdmin ? null : unidadeId);
        Map<String, AcervoCidadeResponse> cidades = new LinkedHashMap<>();

        for (Cliente cliente : clientes) {
            String cidade = formatarCidade(cliente.getCidade());
            String estado = formatarEstado(cliente.getEstado());
            String label = cidade + " - " + estado;
            String chave = cidade.toLowerCase(Locale.ROOT) + "::" + estado.toLowerCase(Locale.ROOT);

            AcervoCidadeResponse grupo = cidades.computeIfAbsent(chave, ignored -> AcervoCidadeResponse.builder()
                    .chave(chave)
                    .cidade(cidade)
                    .estado(estado)
                    .label(label)
                    .totalClientes(0)
                    .clientes(new ArrayList<>())
                    .build());

            grupo.getClientes().add(AcervoClienteResponse.builder()
                    .id(cliente.getId().toString())
                    .nome(cliente.getNome())
                    .initials(cliente.getInitials())
                    .build());
            grupo.setTotalClientes(grupo.getClientes().size());
        }

        return new ArrayList<>(cidades.values());
    }

    @Transactional(readOnly = true)
    public Documento findDocumentoAutorizado(UUID id, UUID unidadeId, boolean isAdmin) {
        Documento documento = documentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Documento nao encontrado"));
        validarAcessoDocumento(documento, unidadeId, isAdmin);
        return documento;
    }

    @Transactional(readOnly = true)
    public Documento findDocumentoAutorizadoPorStorageKey(String storageKey, UUID unidadeId, boolean isAdmin) {
        Documento documento = documentoRepository.findByStorageKey(storageKey)
                .orElseThrow(() -> new ResourceNotFoundException("Documento nao encontrado"));
        validarAcessoDocumento(documento, unidadeId, isAdmin);
        return documento;
    }

    @Transactional(readOnly = true)
    public void validarAcessoStorageKey(String storageKey, UUID unidadeId, boolean isAdmin) {
        Optional<Documento> documento = documentoRepository.findByStorageKey(storageKey);
        if (documento.isPresent()) {
            validarAcessoDocumento(documento.get(), unidadeId, isAdmin);
            return;
        }

        validarAcessoStorageLocal(storageKey, unidadeId, isAdmin);
    }

    private DocumentoResponse toResponse(Documento d) {
        return DocumentoResponse.builder()
                .id(d.getId().toString())
                .nome(d.getNome())
                .tipo(d.getTipo())
                .categoria(d.getCategoria().name().toLowerCase(Locale.ROOT))
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

    private Page<DocumentoResponse> combinarComStorageLocal(
            List<Documento> documentosDb,
            Pageable pageable,
            UUID unidadeId,
            boolean isAdmin,
            UUID clienteId,
            UUID processoId,
            UUID pastaId,
            String busca) {
        List<DocumentoResponse> respostas = new ArrayList<>(documentosDb.stream().map(this::toResponse).toList());

        if (!storageService.isLocalMode()) {
            respostas.sort(compararPorDataUploadDesc());
            return paginar(respostas, pageable);
        }

        Set<String> storageKeysExistentes = new HashSet<>();
        for (Documento documento : documentosDb) {
            storageKeysExistentes.add(documento.getStorageKey());
        }

        Map<UUID, Optional<Cliente>> clientesCache = new HashMap<>();
        Map<UUID, Optional<Processo>> processosCache = new HashMap<>();
        Map<UUID, Optional<Pasta>> pastasCache = new HashMap<>();

        for (StorageService.LocalStoredFile file : storageService.listLocalFiles()) {
            if (storageKeysExistentes.contains(file.storageKey())) {
                continue;
            }

            Optional<DocumentoResponse> localResponse = criarRespostaStorageLocal(
                    file,
                    unidadeId,
                    isAdmin,
                    clienteId,
                    processoId,
                    pastaId,
                    busca,
                    clientesCache,
                    processosCache,
                    pastasCache
            );

            localResponse.ifPresent(respostas::add);
        }

        respostas.sort(compararPorDataUploadDesc());
        return paginar(respostas, pageable);
    }

    private Optional<DocumentoResponse> criarRespostaStorageLocal(
            StorageService.LocalStoredFile file,
            UUID unidadeId,
            boolean isAdmin,
            UUID clienteIdFiltro,
            UUID processoIdFiltro,
            UUID pastaIdFiltro,
            String busca,
            Map<UUID, Optional<Cliente>> clientesCache,
            Map<UUID, Optional<Processo>> processosCache,
            Map<UUID, Optional<Pasta>> pastasCache) {
        StorageDocumentContext contexto = resolverContextoStorage(file.storageKey(), clientesCache, processosCache, pastasCache);

        if (!isAdmin) {
            if (unidadeId == null || contexto.unidadeId() == null || !unidadeId.equals(contexto.unidadeId())) {
                return Optional.empty();
            }
        }

        if (clienteIdFiltro != null && !clienteIdFiltro.equals(contexto.clienteId())) {
            return Optional.empty();
        }

        if (processoIdFiltro != null && !processoIdFiltro.equals(contexto.processoId())) {
            return Optional.empty();
        }

        if (pastaIdFiltro != null && !pastaIdFiltro.equals(contexto.pastaId())) {
            return Optional.empty();
        }

        String textoBusca = (file.originalFilename() + " " +
                safe(contexto.clienteNome()) + " " +
                safe(contexto.processoNumero()))
                .toLowerCase(Locale.ROOT);

        if (busca != null && !textoBusca.contains(busca.toLowerCase(Locale.ROOT))) {
            return Optional.empty();
        }

        return Optional.of(DocumentoResponse.builder()
                .id("local:" + file.storageKey())
                .nome(file.originalFilename())
                .tipo(extrairTipo(file.originalFilename()))
                .categoria(CategoriaDocumento.OUTROS.name().toLowerCase(Locale.ROOT))
                .tamanhoBytes(file.size())
                .tamanho(formatarTamanho(file.size()))
                .clienteId(contexto.clienteId() != null ? contexto.clienteId().toString() : null)
                .clienteNome(contexto.clienteNome())
                .processoId(contexto.processoId() != null ? contexto.processoId().toString() : null)
                .processoNumero(contexto.processoNumero())
                .pastaId(contexto.pastaId() != null ? contexto.pastaId().toString() : null)
                .dataUpload(file.lastModifiedAt().toString())
                .uploadedPor("Acervo local")
                .build());
    }

    private StorageDocumentContext resolverContextoStorage(
            String storageKey,
            Map<UUID, Optional<Cliente>> clientesCache,
            Map<UUID, Optional<Processo>> processosCache,
            Map<UUID, Optional<Pasta>> pastasCache) {
        String[] segmentos = storageKey.split("/");

        UUID unidadeId = segmentos.length > 0 ? parseUuid(segmentos[0]) : null;
        Cliente cliente = null;
        Processo processo = null;
        Pasta pasta = null;

        for (int i = 1; i < Math.max(segmentos.length - 1, 1); i++) {
            String segmento = segmentos[i];

            if ("clientes".equalsIgnoreCase(segmento) && i + 1 < segmentos.length) {
                cliente = obterCliente(parseUuid(segmentos[++i]), clientesCache).orElse(cliente);
                continue;
            }

            if ("processos".equalsIgnoreCase(segmento) && i + 1 < segmentos.length) {
                processo = obterProcesso(parseUuid(segmentos[++i]), processosCache).orElse(processo);
                continue;
            }

            if (("pastas".equalsIgnoreCase(segmento) || "interno".equalsIgnoreCase(segmento)) && i + 1 < segmentos.length) {
                pasta = obterPasta(parseUuid(segmentos[++i]), pastasCache).orElse(pasta);
                continue;
            }

            UUID candidato = parseUuid(segmento);
            if (candidato == null) {
                continue;
            }

            if (processo == null) {
                processo = obterProcesso(candidato, processosCache).orElse(null);
            }
            if (cliente == null) {
                cliente = obterCliente(candidato, clientesCache).orElse(null);
            }
            if (pasta == null) {
                pasta = obterPasta(candidato, pastasCache).orElse(null);
            }
        }

        if (cliente == null && processo != null) {
            cliente = processo.getCliente();
        }

        if (pasta != null) {
            if (processo == null && pasta.getProcesso() != null) {
                processo = pasta.getProcesso();
            }
            if (cliente == null && pasta.getCliente() != null) {
                cliente = pasta.getCliente();
            }
        }

        if (cliente == null && processo != null) {
            cliente = processo.getCliente();
        }

        if (unidadeId != null) {
            boolean unidadePareceOutroVinculo =
                    (cliente != null && unidadeId.equals(cliente.getId())) ||
                    (processo != null && unidadeId.equals(processo.getId())) ||
                    (pasta != null && unidadeId.equals(pasta.getId()));
            if (unidadePareceOutroVinculo) {
                unidadeId = null;
            }
        }

        if (unidadeId == null) {
            if (processo != null && processo.getUnidade() != null) {
                unidadeId = processo.getUnidade().getId();
            } else if (cliente != null && cliente.getUnidade() != null) {
                unidadeId = cliente.getUnidade().getId();
            } else if (pasta != null) {
                if (pasta.getUnidade() != null) {
                    unidadeId = pasta.getUnidade().getId();
                } else if (pasta.getProcesso() != null && pasta.getProcesso().getUnidade() != null) {
                    unidadeId = pasta.getProcesso().getUnidade().getId();
                } else if (pasta.getCliente() != null && pasta.getCliente().getUnidade() != null) {
                    unidadeId = pasta.getCliente().getUnidade().getId();
                }
            }
        }

        return new StorageDocumentContext(
                unidadeId,
                cliente != null ? cliente.getId() : null,
                cliente != null ? cliente.getNome() : null,
                processo != null ? processo.getId() : null,
                processo != null ? processo.getNumero() : null,
                pasta != null ? pasta.getId() : null
        );
    }

    private Optional<Cliente> obterCliente(UUID id, Map<UUID, Optional<Cliente>> cache) {
        if (id == null) {
            return Optional.empty();
        }
        return cache.computeIfAbsent(id, clienteRepository::findById);
    }

    private Optional<Processo> obterProcesso(UUID id, Map<UUID, Optional<Processo>> cache) {
        if (id == null) {
            return Optional.empty();
        }
        return cache.computeIfAbsent(id, processoRepository::findById);
    }

    private Optional<Pasta> obterPasta(UUID id, Map<UUID, Optional<Pasta>> cache) {
        if (id == null) {
            return Optional.empty();
        }
        return cache.computeIfAbsent(id, pastaRepository::findById);
    }

    private Page<DocumentoResponse> paginar(List<DocumentoResponse> documentos, Pageable pageable) {
        if (pageable.isUnpaged()) {
            return new PageImpl<>(documentos);
        }

        int inicio = (int) pageable.getOffset();
        if (inicio >= documentos.size()) {
            return new PageImpl<>(List.of(), pageable, documentos.size());
        }

        int fim = Math.min(inicio + pageable.getPageSize(), documentos.size());
        return new PageImpl<>(documentos.subList(inicio, fim), pageable, documentos.size());
    }

    private Comparator<DocumentoResponse> compararPorDataUploadDesc() {
        return Comparator.comparingLong((DocumentoResponse doc) -> parseDataUpload(doc.getDataUpload())).reversed();
    }

    private long parseDataUpload(String dataUpload) {
        if (dataUpload == null || dataUpload.isBlank()) {
            return 0L;
        }

        try {
            return LocalDateTime.parse(dataUpload)
                    .atZone(ZoneId.systemDefault())
                    .toInstant()
                    .toEpochMilli();
        } catch (Exception ignored) {
        }

        try {
            return LocalDate.parse(dataUpload)
                    .atStartOfDay(ZoneId.systemDefault())
                    .toInstant()
                    .toEpochMilli();
        } catch (Exception ignored) {
        }

        return 0L;
    }

    private void validarAcessoStorageLocal(String storageKey, UUID unidadeId, boolean isAdmin) {
        if (isAdmin) {
            return;
        }

        if (!storageService.isLocalMode() || unidadeId == null) {
            throw new ResourceNotFoundException("Documento nao encontrado");
        }

        StorageDocumentContext contexto = resolverContextoStorage(
                storageKey,
                new HashMap<>(),
                new HashMap<>(),
                new HashMap<>()
        );

        if (contexto.unidadeId() == null || !unidadeId.equals(contexto.unidadeId())) {
            throw new ResourceNotFoundException("Documento nao encontrado");
        }
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private String extrairTipo(String nomeArquivo) {
        if (nomeArquivo == null || !nomeArquivo.contains(".")) {
            return "outro";
        }
        return nomeArquivo.substring(nomeArquivo.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    private String safe(String value) {
        return value == null ? "" : value;
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
            throw new ResourceNotFoundException("Documento nao encontrado");
        }

        UUID unidadeDocumento = extrairUnidadeDocumento(documento);
        if (unidadeDocumento == null || !unidadeDocumento.equals(unidadeId)) {
            throw new ResourceNotFoundException("Documento nao encontrado");
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
            if (documento.getPasta().getUnidade() != null) {
                candidatas.add(documento.getPasta().getUnidade().getId());
            }
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

    private void validarRelacionamentos(Cliente cliente, Processo processo, Pasta pasta) {
        if (cliente != null && processo != null && processo.getCliente() != null
                && !processo.getCliente().getId().equals(cliente.getId())) {
            throw new BusinessException("Processo informado nao pertence ao cliente selecionado.");
        }

        if (pasta == null) {
            return;
        }

        if (cliente != null && pasta.getCliente() != null && !pasta.getCliente().getId().equals(cliente.getId())) {
            throw new BusinessException("Pasta informada nao pertence ao cliente selecionado.");
        }

        if (processo != null && pasta.getProcesso() != null && !pasta.getProcesso().getId().equals(processo.getId())) {
            throw new BusinessException("Pasta informada nao pertence ao processo selecionado.");
        }
    }

    private void validarEscopoUpload(Cliente cliente, Processo processo, Pasta pasta, Usuario uploadedPor) {
        if (uploadedPor.getPapel() == UserRole.ADMINISTRADOR) {
            return;
        }

        UUID unidadeUsuario = uploadedPor.getUnidade() != null ? uploadedPor.getUnidade().getId() : null;
        if (unidadeUsuario == null) {
            throw new ResourceNotFoundException("Destino nao encontrado");
        }

        List<UUID> candidatas = new ArrayList<>();
        if (cliente != null && cliente.getUnidade() != null) {
            candidatas.add(cliente.getUnidade().getId());
        }
        if (processo != null && processo.getUnidade() != null) {
            candidatas.add(processo.getUnidade().getId());
        }
        if (pasta != null) {
            if (pasta.getUnidade() != null) {
                candidatas.add(pasta.getUnidade().getId());
            }
            if (pasta.getCliente() != null && pasta.getCliente().getUnidade() != null) {
                candidatas.add(pasta.getCliente().getUnidade().getId());
            }
            if (pasta.getProcesso() != null && pasta.getProcesso().getUnidade() != null) {
                candidatas.add(pasta.getProcesso().getUnidade().getId());
            }
        }

        boolean foraDoEscopo = candidatas.stream()
                .filter(id -> id != null)
                .anyMatch(id -> !id.equals(unidadeUsuario));
        if (foraDoEscopo) {
            throw new ResourceNotFoundException("Destino nao encontrado");
        }
    }

    private UUID resolverUnidadeId(UUID unidadeId, Cliente cliente, Processo processo, Pasta pasta, Usuario uploadedPor) {
        if (unidadeId != null) {
            return unidadeId;
        }

        if (processo != null && processo.getUnidade() != null) {
            return processo.getUnidade().getId();
        }

        if (cliente != null && cliente.getUnidade() != null) {
            return cliente.getUnidade().getId();
        }

        if (pasta != null) {
            if (pasta.getUnidade() != null) {
                return pasta.getUnidade().getId();
            }
            if (pasta.getProcesso() != null && pasta.getProcesso().getUnidade() != null) {
                return pasta.getProcesso().getUnidade().getId();
            }
            if (pasta.getCliente() != null && pasta.getCliente().getUnidade() != null) {
                return pasta.getCliente().getUnidade().getId();
            }
        }

        return uploadedPor.getUnidade() != null ? uploadedPor.getUnidade().getId() : null;
    }

    private String formatarCidade(String cidade) {
        return cidade == null || cidade.isBlank() ? "Sem cidade" : cidade.trim();
    }

    private String formatarEstado(String estado) {
        return estado == null || estado.isBlank() ? "--" : estado.trim().toUpperCase(Locale.ROOT);
    }
}
