package com.viana.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.viana.dto.request.LoginRequest;
import com.viana.dto.response.TokenResponse;
import com.viana.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    @DisplayName("Deve retornar 200 OK e o token no login com credenciais corretas")
    void login_Sucesso() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("admin@viana.com.br");
        req.setSenha("SenhaForte!123");

        TokenResponse tokenResp = TokenResponse.builder()
                .accessToken("ey.access.token")
                .refreshToken("ey.refresh.token")
                .tipo("Bearer")
                .usuario(TokenResponse.UsuarioResumoResponse.builder()
                        .id("123-abc")
                        .nome("Admin")
                        .email("admin@viana.com.br")
                        .papel("ADMINISTRADOR")
                        .unidadeId("sede")
                        .build())
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(tokenResp);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("ey.access.token"))
                .andExpect(jsonPath("$.usuario.nome").value("Admin"));
    }

    @Test
    @DisplayName("Deve retornar 400 Bad Request se campos faltarem no login")
    void login_CamposEmBranco() throws Exception {
        LoginRequest req = new LoginRequest(); // Tudo null

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }
}
