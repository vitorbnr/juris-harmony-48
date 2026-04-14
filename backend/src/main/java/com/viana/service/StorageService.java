package com.viana.service;

import com.viana.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageService {

    public record LocalStoredFile(
            String storageKey,
            String originalFilename,
            long size,
            LocalDateTime lastModifiedAt
    ) {}

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final Tika tika = new Tika();

    @Value("${app.storage.bucket}")
    private String bucket;

    /** Quando true, todos os arquivos são salvos localmente em 'uploads/' (ambiente DEV) */
    @Value("${app.storage.local:false}")
    private boolean localMode;

    @Value("${app.storage.local-path:uploads}")
    private String localPath;

    // Tipos permitidos (MIME types)
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            // Documentos
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "application/rtf",
            // Imagens
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp",
            // Vídeos
            "video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/webm",
            // Áudio
            "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4",
            // Compactados
            "application/zip", "application/x-rar-compressed", "application/x-7z-compressed"
    );

    /**
     * Faz upload de um arquivo para o storage configurado.
     * Em DEV (localMode=true), salva em pasta local.
     * Em PROD, usa Cloudflare R2.
     */
    public String upload(MultipartFile file, UUID unidadeId, UUID clienteId, UUID processoId, UUID pastaId) throws IOException {
        // 1. Validar MIME type real (não confia na extensão)
        String mimeType = tika.detect(file.getInputStream());
        if (!ALLOWED_MIME_TYPES.contains(mimeType)) {
            throw new BusinessException("Tipo de arquivo não permitido: " + mimeType);
        }

        // 2. Gerar chave única
        String key = buildKey(unidadeId, clienteId, processoId, pastaId, file.getOriginalFilename());

        if (localMode) {
            // Salvar localmente
            Path dir = Paths.get(localPath, key).getParent();
            Files.createDirectories(dir);
            Path dest = Paths.get(localPath, key);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
            }
            log.info("[DEV] Arquivo salvo localmente: {}", dest.toAbsolutePath());
        } else {
            // Upload para R2
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(mimeType)
                    .contentLength(file.getSize())
                    .build();
            s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        }

        return key;
    }

    public boolean isLocalMode() {
        return localMode;
    }

    public List<LocalStoredFile> listLocalFiles() {
        if (!localMode) {
            return List.of();
        }

        Path baseDir = Paths.get(localPath).toAbsolutePath().normalize();
        if (!Files.exists(baseDir)) {
            return List.of();
        }

        try (Stream<Path> files = Files.walk(baseDir)) {
            return files
                    .filter(Files::isRegularFile)
                    .map(path -> toLocalStoredFile(baseDir, path))
                    .sorted(Comparator.comparing(LocalStoredFile::lastModifiedAt).reversed())
                    .toList();
        } catch (IOException e) {
            log.warn("[DEV] Falha ao listar arquivos locais: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Em DEV: retorna path local para download direto.
     * Em PROD: gera URL pré-assinada para o R2 (expira em 15 minutos).
     */
    public String generatePresignedUrl(String storageKey) {
        if (localMode) {
            // Retorna endpoint local; o controller tratará o download via stream
            return "/api/documentos/stream/" + storageKey.replace("/", "__");
        }

        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucket)
                .key(storageKey)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .getObjectRequest(getRequest)
                .signatureDuration(Duration.ofMinutes(15))
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    /**
     * Abre stream do arquivo para download direto (modo local).
     */
    public InputStream getLocalStream(String storageKey) throws IOException {
        if (!localMode) throw new BusinessException("Stream local indisponível no modo produção.");
        // storeKey com '/' foi codificado como '__' na URL
        String realKey = storageKey.replace("__", "/");

        // ── Proteção contra Path Traversal ─────────────────────────────────────
        Path baseDir = Paths.get(localPath).toAbsolutePath().normalize();
        Path filePath = baseDir.resolve(realKey).normalize();

        // Garante que o caminho resolvido ainda está dentro do diretório base
        if (!filePath.startsWith(baseDir)) {
            throw new BusinessException("Acesso negado: caminho de arquivo inválido.");
        }
        // ─────────────────────────────────────────────────────────────

        if (!Files.exists(filePath)) throw new BusinessException("Arquivo não encontrado: " + realKey);
        return Files.newInputStream(filePath);
    }

    /**
     * Retorna o nome original do arquivo a partir da chave de storage.
     */
    public String getOriginalFilename(String storageKey) {
        String lastSegment = Paths.get(storageKey).getFileName().toString();

        if (lastSegment.length() > 37) {
            String maybeUuid = lastSegment.substring(0, 36);
            if (lastSegment.charAt(36) == '-') {
                try {
                    UUID.fromString(maybeUuid);
                    return lastSegment.substring(37);
                } catch (IllegalArgumentException ignored) {
                }
            }
        }

        int idx = lastSegment.indexOf('-');
        return idx >= 0 ? lastSegment.substring(idx + 1) : lastSegment;
    }

    /**
     * Exclui arquivo do storage.
     */
    public void delete(String storageKey) {
        if (localMode) {
            try {
                Files.deleteIfExists(Paths.get(localPath, storageKey));
                log.info("[DEV] Arquivo deletado localmente: {}", storageKey);
            } catch (IOException e) {
                log.warn("[DEV] Falha ao deletar arquivo local: {}", e.getMessage());
            }
        } else {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(storageKey)
                    .build());
        }
    }

    private LocalStoredFile toLocalStoredFile(Path baseDir, Path filePath) {
        try {
            String storageKey = baseDir.relativize(filePath).toString().replace('\\', '/');
            long size = Files.size(filePath);
            FileTime lastModified = Files.getLastModifiedTime(filePath);

            return new LocalStoredFile(
                    storageKey,
                    getOriginalFilename(storageKey),
                    size,
                    LocalDateTime.ofInstant(lastModified.toInstant(), ZoneId.systemDefault())
            );
        } catch (IOException e) {
            throw new IllegalStateException("Falha ao ler metadata do arquivo local: " + filePath, e);
        }
    }

    private String buildKey(UUID unidadeId, UUID clienteId, UUID processoId, UUID pastaId, String filename) {
        StringBuilder sb = new StringBuilder();
        if (unidadeId != null) sb.append(unidadeId).append("/");
        if (clienteId != null) sb.append("clientes/").append(clienteId).append("/");
        if (processoId != null) sb.append("processos/").append(processoId).append("/");
        if (pastaId != null) {
            String segmento = clienteId == null && processoId == null ? "interno/" : "pastas/";
            sb.append(segmento).append(pastaId).append("/");
        }
        if (clienteId == null && processoId == null && pastaId == null) sb.append("geral/");
        sb.append(UUID.randomUUID()).append("-").append(sanitizeFilename(filename));
        return sb.toString();
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) return "arquivo";
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
