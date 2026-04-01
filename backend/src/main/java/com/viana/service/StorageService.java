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
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageService {

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
    public String upload(MultipartFile file, UUID unidadeId, UUID clienteId, UUID processoId) throws IOException {
        // 1. Validar MIME type real (não confia na extensão)
        String mimeType = tika.detect(file.getInputStream());
        if (!ALLOWED_MIME_TYPES.contains(mimeType)) {
            throw new BusinessException("Tipo de arquivo não permitido: " + mimeType);
        }

        // 2. Gerar chave única
        String key = buildKey(unidadeId, clienteId, processoId, file.getOriginalFilename());

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
        Path filePath = Paths.get(localPath, realKey);
        if (!Files.exists(filePath)) throw new BusinessException("Arquivo não encontrado: " + realKey);
        return Files.newInputStream(filePath);
    }

    /**
     * Retorna o nome original do arquivo a partir da chave de storage.
     */
    public String getOriginalFilename(String storageKey) {
        // Formato da chave: {uuid}-{filename}
        String lastSegment = Paths.get(storageKey).getFileName().toString();
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

    private String buildKey(UUID unidadeId, UUID clienteId, UUID processoId, String filename) {
        StringBuilder sb = new StringBuilder();
        if (unidadeId != null) sb.append(unidadeId).append("/");
        if (clienteId != null) sb.append(clienteId).append("/");
        if (processoId != null) sb.append(processoId).append("/");
        sb.append(UUID.randomUUID()).append("-").append(sanitizeFilename(filename));
        return sb.toString();
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) return "arquivo";
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
