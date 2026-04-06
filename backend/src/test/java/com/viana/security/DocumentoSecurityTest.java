package com.viana.security;

import com.viana.model.Documento;
import com.viana.model.Usuario;
import com.viana.model.enums.CategoriaDocumento;
import com.viana.model.enums.UserRole;
import com.viana.repository.DocumentoRepository;
import com.viana.repository.UsuarioRepository;
import com.viana.service.DocumentoService;
import com.viana.service.LogAuditoriaService;
import com.viana.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Testes de segurança IDOR para DocumentoController.
 *
 * Cobre:
 *  - VUL-006: Verificação de ownership no DELETE de documento
 *  - Garante que apenas uploader ou ADMIN podem deletar
 */
@ExtendWith(MockitoExtension.class)
class DocumentoSecurityTest {

    @Mock private DocumentoRepository documentoRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private DocumentoService documentoService;
    @Mock private LogAuditoriaService logAuditoriaService;
    @Mock private StorageService storageService;

    private com.viana.controller.DocumentoController controller;

    private UUID uploaderOriginalId;
    private UUID outroUsuarioId;
    private UUID docId;
    private Documento docMock;

    @BeforeEach
    void setUp() {
        controller = new com.viana.controller.DocumentoController(
            documentoService, documentoRepository, usuarioRepository,
            logAuditoriaService, storageService
        );

        uploaderOriginalId = UUID.randomUUID();
        outroUsuarioId = UUID.randomUUID();
        docId = UUID.randomUUID();

        // Uploader original
        Usuario uploader = new Usuario();
        uploader.setId(uploaderOriginalId);
        uploader.setPapel(UserRole.ADVOGADO);

        // Documento criado pelo uploader
        docMock = Documento.builder()
                .nome("contrato.pdf")
                .tipo("pdf")
                .categoria(CategoriaDocumento.CONTRATO)
                .tamanhoBytes(1024L)
                .storageKey("unidade/cliente/proc/arquivo.pdf")
                .uploadedPor(uploader)
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(docMock, "id", docId);
    }

    private Authentication mockAuth(UUID userId, String email, String role) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(email);

        // Mock das authorities
        Collection<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        doReturn(authorities).when(auth).getAuthorities();

        // Mock do repositório para retornar o usuário
        Usuario usuario = new Usuario();
        usuario.setId(userId);
        usuario.setPapel(UserRole.valueOf(role));
        when(usuarioRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(usuario));

        return auth;
    }

    @Test
    @DisplayName("VUL-006: ADVOGADO não-dono NÃO deve poder deletar documento alheio")
    void advogadoNaoDonaNaoDeveDeletar() {
        // Arrange
        when(documentoRepository.findById(docId)).thenReturn(Optional.of(docMock));
        Authentication authOutroAdv = mockAuth(outroUsuarioId, "outro@viana.com.br", "ADVOGADO");

        // Act
        ResponseEntity<Void> response = controller.excluir(docId, authOutroAdv);

        // Assert: deve retornar 403 Forbidden
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode(),
            "Deveria retornar 403 mas retornou: " + response.getStatusCode());

        // Verificar que service.excluir NÃO foi chamado
        verify(documentoService, never()).excluir(any());
    }

    @Test
    @DisplayName("VUL-006: O uploader original DEVE poder deletar seu próprio documento")
    void uploaderOriginalDevePodeDeletar() {
        // Arrange
        when(documentoRepository.findById(docId)).thenReturn(Optional.of(docMock));
        Authentication authUploader = mockAuth(uploaderOriginalId, "uploader@viana.com.br", "ADVOGADO");

        // Act
        ResponseEntity<Void> response = controller.excluir(docId, authUploader);

        // Assert: deve retornar 204 No Content
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(documentoService, times(1)).excluir(docId);
    }

    @Test
    @DisplayName("VUL-006: ADMINISTRADOR deve poder deletar qualquer documento")
    void adminDevePoderDeletarQualquerDocumento() {
        // Arrange
        UUID adminId = UUID.randomUUID();
        when(documentoRepository.findById(docId)).thenReturn(Optional.of(docMock));
        Authentication authAdmin = mockAuth(adminId, "admin@viana.com.br", "ADMINISTRADOR");

        // Act
        ResponseEntity<Void> response = controller.excluir(docId, authAdmin);

        // Assert: deve retornar 204 No Content
        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(documentoService, times(1)).excluir(docId);
    }

    @Test
    @DisplayName("VUL-006: SECRETARIA não deve poder deletar documento (não é uploader nem admin)")
    void secretariaNaoDeveDeletar() {
        // Arrange
        UUID secretariaId = UUID.randomUUID();
        when(documentoRepository.findById(docId)).thenReturn(Optional.of(docMock));
        Authentication authSecretaria = mockAuth(secretariaId, "sec@viana.com.br", "SECRETARIA");

        // Act
        ResponseEntity<Void> response = controller.excluir(docId, authSecretaria);

        // Assert: deve retornar 403 Forbidden
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(documentoService, never()).excluir(any());
    }
}
