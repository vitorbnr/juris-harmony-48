package com.viana.security;

import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.UserRole;
import com.viana.repository.UsuarioRepository;
import com.viana.service.DocumentoService;
import com.viana.service.LogAuditoriaService;
import com.viana.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentoSecurityTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private DocumentoService documentoService;

    @Mock
    private LogAuditoriaService logAuditoriaService;

    @Mock
    private StorageService storageService;

    private com.viana.controller.DocumentoController controller;

    @BeforeEach
    void setUp() {
        controller = new com.viana.controller.DocumentoController(
                documentoService,
                usuarioRepository,
                logAuditoriaService,
                storageService
        );
    }

    private Authentication mockAuth(String email, String role, UUID unidadeId) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(email);

        Collection<? extends GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        doReturn(authorities).when(auth).getAuthorities();

        Unidade unidade = null;
        if (unidadeId != null) {
            unidade = new Unidade();
            unidade.setId(unidadeId);
        }

        Usuario usuario = new Usuario();
        usuario.setEmail(email);
        usuario.setPapel(UserRole.valueOf(role));
        usuario.setUnidade(unidade);
        when(usuarioRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(usuario));

        return auth;
    }

    @Test
    @DisplayName("Deve delegar a exclusao de documento com o escopo do usuario autenticado")
    void deveDelegarExclusaoComEscopoDoUsuario() {
        UUID docId = UUID.randomUUID();
        UUID unidadeId = UUID.randomUUID();
        Authentication auth = mockAuth("adv@viana.com.br", "ADVOGADO", unidadeId);

        ResponseEntity<Void> response = controller.excluir(docId, auth);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(documentoService, times(1)).excluir(eq(docId), eq(unidadeId), eq(false), any());
    }

    @Test
    @DisplayName("Administrador deve delegar a exclusao com permissao ampliada")
    void adminDeveDelegarExclusaoComPermissaoAmpliada() {
        UUID docId = UUID.randomUUID();
        UUID unidadeId = UUID.randomUUID();
        Authentication auth = mockAuth("admin@viana.com.br", "ADMINISTRADOR", unidadeId);

        ResponseEntity<Void> response = controller.excluir(docId, auth);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(documentoService, times(1)).excluir(eq(docId), eq(unidadeId), eq(true), any());
    }
}
