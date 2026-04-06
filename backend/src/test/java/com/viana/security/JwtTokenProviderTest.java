package com.viana.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    // Secret em Base64 puro (como deve ser gerado com: openssl rand -base64 64)
    // Valor decodifica para 48 bytes (384 bits) — adequado para HMAC-SHA256+
    private final String SECRET = "ZGV2LXNlY3JldC1rZXktdmlhbmEtYWR2b2NhY2lhLTIwMjYtbWluLTI1Ni1iaXRzLXh4eA==";
    private final long ACCESS_EXPIRATION = 3600000; // 1h
    private final long REFRESH_EXPIRATION = 86400000; // 24h

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(SECRET, ACCESS_EXPIRATION, REFRESH_EXPIRATION);
    }

    @Test
    @DisplayName("Deve gerar um JWT válido a partir do username (email)")
    void generateAccessToken_ComString() {
        String email = "admin@viana.com.br";
        String token = jwtTokenProvider.generateAccessToken(email);

        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals(email, jwtTokenProvider.getEmailFromToken(token));
    }

    @Test
    @DisplayName("Deve validar a assinatura corretamente")
    void validateToken_ComTokenInvalido() {
        String tokenFalso = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        
        boolean isValid = jwtTokenProvider.validateToken(tokenFalso);
        
        assertFalse(isValid);
    }
    
    @Test
    @DisplayName("Deve gerar um refresh token válido")
    void generateRefreshToken_ComSucesso() {
        String email = "advogado@viana.com.br";
        String token = jwtTokenProvider.generateRefreshToken(email);

        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals(email, jwtTokenProvider.getEmailFromToken(token));
    }

    @Test
    @DisplayName("Deve falhar ao validar token expirado")
    void validateToken_Expirado() throws InterruptedException {
        JwtTokenProvider jwtCurto = new JwtTokenProvider(SECRET, 1, 1); // Expiram em 1ms
        String token = jwtCurto.generateAccessToken("teste@teste.com");

        Thread.sleep(10); // Aguarda expirar

        assertFalse(jwtCurto.validateToken(token));
    }
}
