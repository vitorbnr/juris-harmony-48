package com.viana.service;

import com.viana.dto.request.AtualizarDocumentoRequest;
import com.viana.dto.response.DocumentoResponse;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Cliente;
import com.viana.model.Documento;
import com.viana.model.Processo;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.CategoriaDocumento;
import com.viana.model.enums.UserRole;
import com.viana.repository.ClienteRepository;
import com.viana.repository.DocumentoRepository;
import com.viana.repository.PastaRepository;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.UsuarioRepository;
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

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
    @Mock
    private LogAuditoriaService logAuditoriaService;

    @InjectMocks
    private DocumentoService documentoService;

    private Usuario usuario;
    private Cliente cliente;
    private Processo processo;
    private Documento documento;
    private UUID uuid;

    @BeforeEach
    void setUp() {
        uuid = UUID.randomUUID();

        Unidade unidade = new Unidade();
        unidade.setId(UUID.randomUUID());

        usuario = new Usuario();
        usuario.setId(UUID.randomUUID());
        usuario.setNome("Joao Adv");
        usuario.setPapel(UserRole.ADVOGADO);
        usuario.setUnidade(unidade);

        cliente = new Cliente();
        cliente.setId(UUID.randomUUID());
        cliente.setUnidade(unidade);

        processo = new Processo();
        processo.setId(UUID.randomUUID());
        processo.setUnidade(unidade);
        processo.setCliente(cliente);

        documento = Documento.builder()
                .id(uuid)
                .nome("peticao_inicial.pdf")
                .tipo("pdf")
                .categoria(CategoriaDocumento.PETICAO)
                .tamanhoBytes(1024L)
                .storageKey("unidade/proc/peticao.pdf")
                .cliente(cliente)
                .processo(processo)
                .uploadedPor(usuario)
                .dataUpload(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Deve fazer upload de documento vinculado a um processo com sucesso")
    void uploadSucesso() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "peticao.pdf", "application/pdf", "conteudo".getBytes());
        UUID unidadeId = UUID.randomUUID();

        when(clienteRepository.findById(cliente.getId())).thenReturn(Optional.of(cliente));
        when(processoRepository.findById(processo.getId())).thenReturn(Optional.of(processo));
        when(usuarioRepository.findById(usuario.getId())).thenReturn(Optional.of(usuario));
        when(storageService.upload(any(), any(), any(), any(), any())).thenReturn("storage-key-123");
        when(documentoRepository.save(any(Documento.class))).thenAnswer(invocation -> {
            Documento saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            saved.setDataUpload(LocalDateTime.now());
            return saved;
        });

        DocumentoResponse response = documentoService.upload(
                file,
                "PETICAO",
                cliente.getId(),
                processo.getId(),
                null,
                unidadeId,
                usuario.getId()
        );

        assertNotNull(response);
        assertEquals("peticao.pdf", response.getNome());
        assertEquals("pdf", response.getTipo());
        assertEquals("peticao", response.getCategoria());
        assertEquals(cliente.getId().toString(), response.getClienteId());

        verify(storageService, times(1)).upload(file, unidadeId, cliente.getId(), processo.getId(), null);
        verify(documentoRepository, times(1)).save(any(Documento.class));
    }

    @Test
    @DisplayName("Deve converter categoria invalida para OUTROS")
    void uploadCategoriaInvalida() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "foto.png", "image/png", "img".getBytes());

        when(usuarioRepository.findById(usuario.getId())).thenReturn(Optional.of(usuario));
        when(storageService.upload(any(), any(), any(), any(), any())).thenReturn("storage-key-123");
        when(documentoRepository.save(any(Documento.class))).thenAnswer(invocation -> {
            Documento saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            saved.setDataUpload(LocalDateTime.now());
            return saved;
        });

        DocumentoResponse response = documentoService.upload(
                file,
                "CATEGORIA_INEXISTENTE",
                null,
                null,
                null,
                null,
                usuario.getId()
        );

        assertEquals("outros", response.getCategoria());
        assertEquals("png", response.getTipo());
    }

    @Test
    @DisplayName("Deve falhar no upload quando usuario uploader nao existe")
    void uploadFalhaUsuarioNaoEncontrado() {
        MockMultipartFile file = new MockMultipartFile("file", "doc.txt", "text/plain", "doc".getBytes());

        when(usuarioRepository.findById(usuario.getId())).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () ->
                documentoService.upload(file, "OUTROS", null, null, null, null, usuario.getId())
        );

        assertEquals("Usuario nao encontrado", exception.getMessage());
    }

    @Test
    @DisplayName("Deve retornar a URL de download com sucesso")
    void getDownloadUrlSucesso() {
        when(documentoRepository.findById(uuid)).thenReturn(Optional.of(documento));
        when(storageService.generatePresignedUrl("unidade/proc/peticao.pdf")).thenReturn("https://r2.dev/url-temp");

        String url = documentoService.getDownloadUrl(uuid);

        assertEquals("https://r2.dev/url-temp", url);
        verify(documentoRepository, times(1)).findById(uuid);
        verify(storageService, times(1)).generatePresignedUrl("unidade/proc/peticao.pdf");
    }

    @Test
    @DisplayName("Deve listar documentos por processo com paginacao")
    void listarPorProcessoSucesso() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Documento> page = new PageImpl<>(List.of(documento));

        when(documentoRepository.findByProcessoIdAndDeletedAtIsNull(processo.getId(), Pageable.unpaged())).thenReturn(page);

        Page<DocumentoResponse> resultado = documentoService.listarPorProcesso(processo.getId(), pageable);

        assertNotNull(resultado);
        assertEquals(1, resultado.getTotalElements());
        assertEquals(documento.getNome(), resultado.getContent().get(0).getNome());
    }

    @Test
    @DisplayName("Deve listar documentos do storage local quando banco estiver vazio")
    void listarComFallbackStorageLocal() {
        Pageable pageable = PageRequest.of(0, 200);
        UUID unidadeId = usuario.getUnidade().getId();

        when(documentoRepository.findAllWithFilters(null, null, unidadeId, null, Pageable.unpaged()))
                .thenReturn(Page.empty());
        when(storageService.isLocalMode()).thenReturn(true);
        when(storageService.listLocalFiles()).thenReturn(List.of(
                new StorageService.LocalStoredFile(
                        unidadeId + "/clientes/" + cliente.getId() + "/9176fe42-36e1-4306-868b-842ab9af0632-Documento-aniversario-13.txt",
                        "Documento-aniversario-13.txt",
                        2048L,
                        LocalDateTime.of(2026, 4, 14, 11, 30)
                )
        ));
        when(clienteRepository.findById(cliente.getId())).thenReturn(Optional.of(cliente));

        Page<DocumentoResponse> resultado = documentoService.listar(null, null, null, pageable, unidadeId, false);

        assertNotNull(resultado);
        assertEquals(1, resultado.getTotalElements());
        assertEquals("Documento-aniversario-13.txt", resultado.getContent().get(0).getNome());
        assertEquals("txt", resultado.getContent().get(0).getTipo());
        assertEquals(cliente.getId().toString(), resultado.getContent().get(0).getClienteId());
    }

    @Test
    @DisplayName("Deve excluir documento fisicamente e logicamente")
    void excluirSucesso() {
        when(documentoRepository.findById(uuid)).thenReturn(Optional.of(documento));
        doNothing().when(storageService).delete("unidade/proc/peticao.pdf");
        doNothing().when(documentoRepository).delete(documento);

        documentoService.excluir(uuid);

        verify(storageService, times(1)).delete("unidade/proc/peticao.pdf");
        verify(documentoRepository, times(1)).delete(documento);
    }

    @Test
    @DisplayName("Deve atualizar nome e categoria do documento autorizado")
    void atualizarSucesso() {
        when(documentoRepository.findById(uuid)).thenReturn(Optional.of(documento));
        when(documentoRepository.save(documento)).thenReturn(documento);

        DocumentoResponse resultado = documentoService.atualizar(
                uuid,
                new AtualizarDocumentoRequest("Contrato revisado.pdf", "CONTRATO"),
                usuario.getUnidade().getId(),
                false,
                usuario.getId()
        );

        assertEquals("Contrato revisado.pdf", documento.getNome());
        assertEquals(CategoriaDocumento.CONTRATO, documento.getCategoria());
        assertEquals("Contrato revisado.pdf", resultado.getNome());
        assertEquals("contrato", resultado.getCategoria());
    }

    @Test
    @DisplayName("Deve excluir arquivo local por storage key")
    void excluirPorStorageKeySucesso() {
        when(documentoRepository.findByStorageKey("unidade/clientes/cliente-id/arquivo.pdf")).thenReturn(Optional.empty());
        doNothing().when(storageService).delete("unidade/clientes/cliente-id/arquivo.pdf");

        documentoService.excluirPorStorageKey("unidade/clientes/cliente-id/arquivo.pdf", null, true);

        verify(storageService).delete("unidade/clientes/cliente-id/arquivo.pdf");
    }
}
