package com.viana.service;

import com.viana.exception.BusinessException;
import lombok.RequiredArgsConstructor;
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
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final Tika tika = new Tika();

    @Value("${app.storage.bucket}")
    private String bucket;

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
     * Faz upload de um arquivo para o Cloudflare R2.
     * @return storageKey (chave do objeto no R2)
     */
    public String upload(MultipartFile file, UUID unidadeId, UUID clienteId, UUID processoId) throws IOException {
        // 1. Validar MIME type real (não confia na extensão)
        String mimeType = tika.detect(file.getInputStream());
        if (!ALLOWED_MIME_TYPES.contains(mimeType)) {
            throw new BusinessException("Tipo de arquivo não permitido: " + mimeType);
        }

        // 2. Gerar chave única no formato: /{unidadeId}/{clienteId}/{processoId}/{uuid}-{filename}
        String key = buildKey(unidadeId, clienteId, processoId, file.getOriginalFilename());

        // 3. Upload para R2
        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(mimeType)
                .contentLength(file.getSize())
                .build();

        s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        return key;
    }

    /**
     * Gera URL pré-assinada para download (expira em 15 minutos).
     */
    public String generatePresignedUrl(String storageKey) {
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
     * Exclui arquivo do R2.
     */
    public void delete(String storageKey) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(storageKey)
                .build());
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
