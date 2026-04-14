package com.viana.service;

import com.viana.exception.BusinessException;
import org.apache.tika.Tika;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StorageServiceTest {

    @Mock
    private S3Client s3Client;

    @Mock
    private S3Presigner s3Presigner;

    @InjectMocks
    private StorageService storageService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(storageService, "bucket", "meu-bucket-teste");
    }

    @Test
    @DisplayName("Deve fazer upload de arquivo permitido (PDF) com sucesso")
    void upload_Sucesso() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "teste.pdf", "application/pdf", "dummy content".getBytes());
        UUID clienteId = UUID.randomUUID();

        // Tika is instantiated internally in StorageService
        // but its detection might return text/plain or something based on "dummy content".
        // With Mockito we can't easily mock the internal "new Tika()", so let's use ReflectionTestUtils
        Tika mockTika = mock(Tika.class);
        when(mockTika.detect(any(InputStream.class))).thenReturn("application/pdf");
        ReflectionTestUtils.setField(storageService, "tika", mockTika);

        String key = storageService.upload(file, null, clienteId, null, null);

        assertNotNull(key);
        assertTrue(key.contains(clienteId.toString()));
        assertTrue(key.contains("teste.pdf"));

        verify(s3Client, times(1)).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    @DisplayName("Deve falhar upload de arquivo com MIME type nao permitido (exe)")
    void upload_FalhaMimeTypeNaoPermitido() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "virus.exe", "application/x-msdownload", "bad content".getBytes());

        Tika mockTika = mock(Tika.class);
        when(mockTika.detect(any(InputStream.class))).thenReturn("application/x-msdownload");
        ReflectionTestUtils.setField(storageService, "tika", mockTika);

        BusinessException exception = assertThrows(BusinessException.class, () -> storageService.upload(file, null, null, null, null));
        assertTrue(exception.getMessage().contains("Tipo de arquivo não permitido"));
        
        verify(s3Client, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    @DisplayName("Deve gerar URL pre-assinada com sucesso")
    void generatePresignedUrl_Sucesso() throws MalformedURLException {
        PresignedGetObjectRequest presignedRequest = mock(PresignedGetObjectRequest.class);
        when(presignedRequest.url()).thenReturn(new URL("https://s3.amazonaws.com/meu-bucket-teste/chave.pdf?X-Amz-Signature=123"));
        
        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presignedRequest);

        String url = storageService.generatePresignedUrl("chave.pdf");

        assertEquals("https://s3.amazonaws.com/meu-bucket-teste/chave.pdf?X-Amz-Signature=123", url);
        verify(s3Presigner, times(1)).presignGetObject(any(GetObjectPresignRequest.class));
    }

    @Test
    @DisplayName("Deve deletar objeto do S3/R2")
    void delete_Sucesso() {
        storageService.delete("chave_para_deletar.pdf");

        verify(s3Client, times(1)).deleteObject(any(DeleteObjectRequest.class));
    }

    @Test
    @DisplayName("Deve extrair o nome original removendo o UUID prefixado")
    void getOriginalFilename_RemoveUuidPrefixado() {
        String filename = storageService.getOriginalFilename(
                "unidade/clientes/cliente-id/9176fe42-36e1-4306-868b-842ab9af0632-Documento-aniversario-13.txt"
        );

        assertEquals("Documento-aniversario-13.txt", filename);
    }

    @Test
    @DisplayName("Deve manter a estrutura fisica no cliente quando houver processo associado")
    void upload_ComClienteEProcessoMantemEstruturaNoCliente() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "peticao.pdf", "application/pdf", "dummy content".getBytes());
        UUID unidadeId = UUID.randomUUID();
        UUID clienteId = UUID.randomUUID();
        UUID processoId = UUID.randomUUID();

        Tika mockTika = mock(Tika.class);
        when(mockTika.detect(any(InputStream.class))).thenReturn("application/pdf");
        ReflectionTestUtils.setField(storageService, "tika", mockTika);

        String key = storageService.upload(file, unidadeId, clienteId, processoId, null);

        assertTrue(key.contains(unidadeId.toString()));
        assertTrue(key.contains("clientes/" + clienteId));
        assertFalse(key.contains("processos/" + processoId));
        assertTrue(key.endsWith("peticao.pdf"));
    }
}
