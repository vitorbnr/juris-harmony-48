package com.viana.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.viana.dto.request.CriarUsuarioRequest;
import com.viana.dto.response.UsuarioResponse;
import com.viana.service.UsuarioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UsuarioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UsuarioService usuarioService;

    @Test
    @WithMockUser(roles = "ADMINISTRADOR")
    @DisplayName("Deve listar todos os usuários com 200 OK")
    void listar_Sucesso() throws Exception {
        UsuarioResponse resp = UsuarioResponse.builder()
                .id(UUID.randomUUID().toString())
                .nome("Admin Test")
                .email("admin@test.com")
                .build();

        when(usuarioService.listarTodos()).thenReturn(List.of(resp));

        mockMvc.perform(get("/api/usuarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Admin Test"));
    }

    @Test
    @WithMockUser(roles = "ADMINISTRADOR")
    @DisplayName("Deve criar usuário com 201 Created")
    void criar_Sucesso() throws Exception {
        CriarUsuarioRequest req = new CriarUsuarioRequest();
        req.setNome("Novo User");
        req.setEmail("novo@viana.com.br");
        req.setSenha("Senha123!");
        req.setPapel("ADVOGADO");
        req.setUnidadeId(UUID.randomUUID());

        UsuarioResponse resp = UsuarioResponse.builder()
                .id(UUID.randomUUID().toString())
                .nome("Novo User")
                .build();

        when(usuarioService.criar(any())).thenReturn(resp);

        mockMvc.perform(post("/api/usuarios")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Novo User"));
    }

    @Test
    @WithMockUser(roles = "ADMINISTRADOR")
    @DisplayName("Deve desativar usuário com 204 No Content")
    void desativar_Sucesso() throws Exception {
        UUID userId = UUID.randomUUID();

        mockMvc.perform(delete("/api/usuarios/" + userId)
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }
}