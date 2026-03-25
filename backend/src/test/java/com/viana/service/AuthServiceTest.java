package com.viana.service;

import com.viana.dto.request.LoginRequest;
import com.viana.dto.request.RefreshTokenRequest;
import com.viana.dto.response.TokenResponse;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.UserRole;
import com.viana.repository.UsuarioRepository;
import com.viana.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private AuthService authService;

    private Usuario usuario;
    private Unidade unidade;

    @BeforeEach
    void setUp() {
        unidade = new Unidade();
        unidade.setId(UUID.randomUUID());
        unidade.setNome("Sede");

        usuario = new Usuario();
        usuario.setId(UUID.randomUUID());
        usuario.setNome("Joao Silva");
        usuario.setEmail("joao@teste.com");
        usuario.setSenhaHash("hash");
        usuario.setPapel(UserRole.ADVOGADO);
        usuario.setCargo("Advogado");
        usuario.setUnidade(unidade);
    }

    @Test
    @DisplayName("Deve fazer login com sucesso e retornar tokens")
    void login_Sucesso() {
        LoginRequest request = new LoginRequest();
        request.setEmail("joao@teste.com");
        request.setSenha("senha123");

        Authentication authentication = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(jwtTokenProvider.generateAccessToken(authentication)).thenReturn("access-token-valido");
        when(jwtTokenProvider.generateRefreshToken("joao@teste.com")).thenReturn("refresh-token-valido");
        when(usuarioRepository.findByEmailIgnoreCase("joao@teste.com")).thenReturn(Optional.of(usuario));

        TokenResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("access-token-valido", response.getAccessToken());
        assertEquals("refresh-token-valido", response.getRefreshToken());
        assertEquals("Bearer", response.getTipo());
        assertEquals(28800, response.getExpiresIn());
        
        assertNotNull(response.getUsuario());
        assertEquals(usuario.getId().toString(), response.getUsuario().getId());
        assertEquals("joao@teste.com", response.getUsuario().getEmail());
    }

    @Test
    @DisplayName("Deve falhar no login quando a autenticação rejeitar (senha incorreta)")
    void login_FalhaAutenticacao() {
        LoginRequest request = new LoginRequest();
        request.setEmail("joao@teste.com");
        request.setSenha("senhaErrada");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        BadCredentialsException exception = assertThrows(BadCredentialsException.class, () -> authService.login(request));
        assertEquals("E-mail ou senha inválidos", exception.getMessage());
        
        verify(jwtTokenProvider, never()).generateAccessToken(any(Authentication.class));
    }

    @Test
    @DisplayName("Deve falhar no login se usuário não for encontrado no banco (estado inconsistente)")
    void login_UsuarioNaoEncontrado() {
        LoginRequest request = new LoginRequest();
        request.setEmail("fantasma@teste.com");
        request.setSenha("senha123");

        Authentication authentication = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(jwtTokenProvider.generateAccessToken(authentication)).thenReturn("access-token-valido");
        when(jwtTokenProvider.generateRefreshToken("fantasma@teste.com")).thenReturn("refresh-token-valido");
        when(usuarioRepository.findByEmailIgnoreCase("fantasma@teste.com")).thenReturn(Optional.empty());

        BadCredentialsException exception = assertThrows(BadCredentialsException.class, () -> authService.login(request));
        assertEquals("E-mail ou senha inválidos", exception.getMessage());
    }

    @Test
    @DisplayName("Deve realizar refresh do token com sucesso")
    void refresh_Sucesso() {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("refresh-token-valido");

        when(jwtTokenProvider.validateToken("refresh-token-valido")).thenReturn(true);
        when(jwtTokenProvider.getEmailFromToken("refresh-token-valido")).thenReturn("joao@teste.com");
        when(jwtTokenProvider.generateAccessToken("joao@teste.com")).thenReturn("novo-access");
        when(jwtTokenProvider.generateRefreshToken("joao@teste.com")).thenReturn("novo-refresh");
        when(usuarioRepository.findByEmailIgnoreCase("joao@teste.com")).thenReturn(Optional.of(usuario));

        TokenResponse response = authService.refresh(request);

        assertNotNull(response);
        assertEquals("novo-access", response.getAccessToken());
        assertEquals("novo-refresh", response.getRefreshToken());
        assertEquals(usuario.getId().toString(), response.getUsuario().getId());
    }

    @Test
    @DisplayName("Deve falhar ao realizar refresh de token inválido ou expirado")
    void refresh_TokenInvalido() {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("token-invalido");

        when(jwtTokenProvider.validateToken("token-invalido")).thenReturn(false);

        BadCredentialsException exception = assertThrows(BadCredentialsException.class, () -> authService.refresh(request));
        assertEquals("Refresh token inválido ou expirado", exception.getMessage());
        
        verify(jwtTokenProvider, never()).getEmailFromToken(anyString());
    }

    @Test
    @DisplayName("Deve falhar refresh se usuário do token foi deletado")
    void refresh_UsuarioDeletado() {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("refresh-token-valido");

        when(jwtTokenProvider.validateToken("refresh-token-valido")).thenReturn(true);
        when(jwtTokenProvider.getEmailFromToken("refresh-token-valido")).thenReturn("deletado@teste.com");
        when(jwtTokenProvider.generateAccessToken("deletado@teste.com")).thenReturn("novo-access");
        when(jwtTokenProvider.generateRefreshToken("deletado@teste.com")).thenReturn("novo-refresh");
        
        when(usuarioRepository.findByEmailIgnoreCase("deletado@teste.com")).thenReturn(Optional.empty());

        BadCredentialsException exception = assertThrows(BadCredentialsException.class, () -> authService.refresh(request));
        assertEquals("Usuário não encontrado", exception.getMessage());
    }
}
