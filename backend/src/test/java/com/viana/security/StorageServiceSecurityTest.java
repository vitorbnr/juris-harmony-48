package com.viana.security;

import com.viana.exception.BusinessException;
import com.viana.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

/**
 * Testes de segurança para o StorageService.
 *
 * Cobre:
 *  - VUL-005: Path Traversal no endpoint de stream local
 *  - Garantia de que caminhos fora do diretório base são bloqueados
 */
class StorageServiceSecurityTest {

    private StorageService storageService;

    @TempDir
    Path tempUploadDir;

    @BeforeEach
    void setUp() {
        S3Client mockS3 = mock(S3Client.class);
        S3Presigner mockPresigner = mock(S3Presigner.class);
        storageService = new StorageService(mockS3, mockPresigner);

        // Configurar modo local com diretório temporário
        ReflectionTestUtils.setField(storageService, "localMode", true);
        ReflectionTestUtils.setField(storageService, "localPath", tempUploadDir.toString());
        ReflectionTestUtils.setField(storageService, "bucket", "test-bucket");
    }

    @Test
    @DisplayName("VUL-005: Deve bloquear Path Traversal com ../ na chave")
    void deveBloqueiarPathTraversalComPontosPonto() throws IOException {
        // Arrange: criar arquivo legítimo fora do diretório de upload
        Path arquivoSensivel = tempUploadDir.getParent().resolve("secrets.txt");
        Files.writeString(arquivoSensivel, "DADOS SIGILOSOS");

        // Simular a chave que um atacante montaria: ../../secrets.txt
        // Após replace de '__' por '/', o ataque seria: ../secrets.txt
        String maliciousEncodedKey = "..__..__secrets.txt";
        String storageKey = maliciousEncodedKey.replace("__", "/");

        // Act + Assert: deve lançar BusinessException de "caminho inválido"
        BusinessException ex = assertThrows(BusinessException.class, () ->
            storageService.getLocalStream(storageKey)
        );

        assertTrue(ex.getMessage().contains("inválido") || ex.getMessage().contains("Acesso negado"),
            "Deve rejeitar path traversal com mensagem de erro adequada. Mensagem recebida: " + ex.getMessage());
    }

    @Test
    @DisplayName("VUL-005: Deve bloquear chave com separadores absolutos")
    void deveBloqueiarCaminhoAbsoluto() {
        // Tentar acessar caminho absoluto (ex: /etc/passwd via manipulação)
        String maliciousKey = "/etc/passwd";

        BusinessException ex = assertThrows(BusinessException.class, () ->
            storageService.getLocalStream(maliciousKey)
        );

        // Deve ser bloqueado antes mesmo de tentar abrir o arquivo
        assertNotNull(ex.getMessage());
    }

    @Test
    @DisplayName("VUL-005: Deve permitir acesso a arquivo legítimo dentro do diretório base")
    void devePermitirAcessoArquivoLegitimo() throws IOException {
        // Arrange: criar arquivo legítimo dentro do diretório de upload
        Path subDir = tempUploadDir.resolve("uuid-unidade").resolve("uuid-cliente");
        Files.createDirectories(subDir);
        Path arquivoLegitimo = subDir.resolve("documento.pdf");
        Files.writeString(arquivoLegitimo, "CONTEÚDO PDF VÁLIDO");

        // Chave legítima (simulando o formato gerado pelo storageService)
        String validKey = "uuid-unidade__uuid-cliente__documento.pdf";
        String storageKey = validKey.replace("__", "/");

        // Act
        var stream = storageService.getLocalStream(storageKey);

        // Assert
        assertNotNull(stream);
        stream.close();
    }

    @Test
    @DisplayName("JWT - Deve gerar chave com entropia adequada (Base64 puro, sem dupla codificação)")
    void jwtDeveGerarTokenComEntropiaAdequada() {
        // Secret em Base64 puro (como deve ser configurado pós-PATCH-002)
        String validBase64Secret = "ZGV2LXNlY3JldC1rZXktdmlhbmEtYWR2b2NhY2lhLTIwMjYtbWluLTI1Ni1iaXRzLXh4eA==";

        // Não deve lançar exceção
        JwtTokenProvider provider = assertDoesNotThrow(() ->
            new JwtTokenProvider(validBase64Secret, 3600000L, 86400000L)
        );

        String token = provider.generateAccessToken("test@viana.com.br");
        assertNotNull(token);
        assertTrue(provider.validateToken(token));
        assertEquals("test@viana.com.br", provider.getEmailFromToken(token));
    }

    @Test
    @DisplayName("JWT - Secret muito curto deve falhar na inicialização (força mínima de chave)")
    void jwtDeveRejeitarSecretMuitoCurto() {
        // Secret inválido (muito curto para HMAC-SHA256 — menos de 32 bytes decodificados)
        String secretCurto = "Y2E="; // "ca" em Base64 — apenas 2 bytes

        // Deve lançar exceção na inicialização
        assertThrows(Exception.class, () ->
            new JwtTokenProvider(secretCurto, 3600000L, 86400000L)
        );
    }
}
