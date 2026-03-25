package com.viana.service;

import com.viana.dto.response.DocumentoResponse;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.*;
import com.viana.model.enums.CategoriaDocumento;
import com.viana.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentoServiceTest {

    @Mock
    private DocumentoRepository documentoRepository;
    @Mock
    private ClienteRepository clienteRepository;
    @Mock
    private ProcessoRepository processoRepository;
    @Mock
    private PastaRepository pastaRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private StorageService storageService;

    @InjectMocks
    private DocumentoService documentoService;

    private Usuario usuarioId;
    private Cliente clienteId;
    private Processo processoId;
    private Documento documento;
    private UUID uuid;

    @BeforeEach
    void setUp() {
        uuid = UUID.randomUUID();
        
        usuarioId = new Usuario();
        usuarioId.setId(UUID.randomUUID());
        usuarioId.setNome("Joao Adv");

        clienteId = new Cliente();
        clienteId.setId(UUID.randomUUID());

        processoId = new Processo();
        processoId.setId(UUID.randomUUID());

        documento = Documento.builder()
                .id(uuid)
                .nome("peticao_inicial.pdf")
                .tipo("pdf")
                .categoria(CategoriaDocumento.PETICAO)
                .tamanhoBytes(1024L)
                .storageKey("unidade/proc/peticao.pdf")
                .cliente(clienteId)
                .processo(processoId)
                .uploadedPor(usuarioId)
                .dataUpload(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Deve fazer upload de documento vinculado a um processo com sucesso")
    void upload_Sucesso() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "peticao.pdf", "application/pdf", "conteudo".getBytes());
        UUID udId = UUID.randomUUID();

        when(clienteRepository.findById(clienteId.getId())).thenReturn(Optional.of(clienteId));
        when(processoRepository.findById(processoId.getId())).thenReturn(Optional.of(processoId));
        when(usuarioRepository.findById(usuarioId.getId())).thenReturn(Optional.of(usuarioId));
        when(storageService.upload(any(), any(), any(), any())).thenReturn("storage-key-123");
        
        when(documentoRepository.save(any(Documento.class))).thenAnswer(invocation -> {
            Documento saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            saved.setDataUpload(LocalDateTime.now());
            return saved;
        });

        DocumentoResponse response = documentoService.upload(file, "PETICAO", clienteId.getId(), processoId.getId(), null, udId, usuarioId.getId());

        assertNotNull(response);
        assertEquals("peticao.pdf", response.getNome());
        assertEquals("pdf", response.getTipo());
        assertEquals("PETICAO", response.getCategoria());
        assertEquals(clienteId.getId().toString(), response.getClienteId());
        
        verify(storageService, times(1)).upload(file, udId, clienteId.getId(), processoId.getId());
        verify(documentoRepository, times(1)).save(any(Documento.class));
    }

    @Test
    @DisplayName("Deve falhar no upload quando arquivo for null / categoria nao mapeada vira OUTROS")
    void upload_CategoriaForcadaOutros() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "foto.png", "image/png", "img".getBytes());
        
        when(usuarioRepository.findById(usuarioId.getId())).thenReturn(Optional.of(usuarioId));
        when(storageService.upload(any(), any(), any(), any())).thenReturn("storage-key-123");
        
        when(documentoRepository.save(any(Documento.class))).thenAnswer(invocation -> {
            Documento saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            saved.setDataUpload(LocalDateTime.now());
            return saved;
        });

        DocumentoResponse response = documentoService.upload(file, "CATEGORIA_INEXISTENTE", null, null, null, UUID.randomUUID(), usuarioId.getId());

        assertEquals("OUTROS", response.getCategoria());
        assertEquals("png", response.getTipo());
    }

    @Test
    @DisplayName("Deve falhar no upload quando usuário uploader não existe")
    void upload_FalhaUsuarioNaoEncontrado() {
        MockMultipartFile file = new MockMultipartFile("file", "doc.txt", "text/plain", "doc".getBytes());

        when(usuarioRepository.findById(usuarioId.getId())).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> 
            documentoService.upload(file, "OUTROS", null, null, null, UUID.randomUUID(), usuarioId.getId())
        );
        assertEquals("Usuário não encontrado", exception.getMessage());
    }

    @Test
    @DisplayName("Deve retornar a URL de download (Presigned URL) com sucesso")
    void getDownloadUrl_Sucesso() {
        when(documentoRepository.findById(uuid)).thenReturn(Optional.of(documento));
        when(storageService.generatePresignedUrl("unidade/proc/peticao.pdf")).thenReturn("https://r2.dev/url-temp");

        String url = documentoService.getDownloadUrl(uuid);

        assertEquals("https://r2.dev/url-temp", url);
        verify(documentoRepository, times(1)).findById(uuid);
        verify(storageService, times(1)).generatePresignedUrl("unidade/proc/peticao.pdf");
    }

    @Test
    @DisplayName("Deve retornar erro ao pedir URL de download de doc inexistente")
    void getDownloadUrl_Inexistente() {
        when(documentoRepository.findById(uuid)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> documentoService.getDownloadUrl(uuid));
    }

    @Test
    @DisplayName("Deve listar documentos por processo com paginação")
    void listarPorProcesso_Sucesso() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Documento> page = new PageImpl<>(List.of(documento));

        when(documentoRepository.findByProcessoId(processoId.getId(), pageable)).thenReturn(page);

        Page<DocumentoResponse> resultado = documentoService.listarPorProcesso(processoId.getId(), pageable);

        assertNotNull(resultado);
        assertEquals(1, resultado.getTotalElements());
        assertEquals(documento.getNome(), resultado.getContent().get(0).getNome());
    }

    @Test
    @DisplayName("Deve excluir documento fisicamente e logicamente")
    void excluir_Sucesso() {
        when(documentoRepository.findById(uuid)).thenReturn(Optional.of(documento));
        doNothing().when(storageService).delete("unidade/proc/peticao.pdf");
        doNothing().when(documentoRepository).delete(documento);

        documentoService.excluir(uuid);

        verify(storageService, times(1)).delete("unidade/proc/peticao.pdf");
        verify(documentoRepository, times(1)).delete(documento);
    }
}
