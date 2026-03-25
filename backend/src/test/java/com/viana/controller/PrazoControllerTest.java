package com.viana.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.viana.dto.request.CriarPrazoRequest;
import com.viana.dto.response.PrazoResponse;
import com.viana.model.Usuario;
import com.viana.model.enums.UserRole;
import com.viana.repository.UsuarioRepository;
import com.viana.service.PrazoService;
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

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PrazoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PrazoService prazoService;

    @MockBean
    private UsuarioRepository usuarioRepository;

    @Test
    @WithMockUser(username = "advogado@viana.com.br")
    @DisplayName("Deve listar prazos do próprio advogado logs retornando 200 OK")
    void listar_Sucesso() throws Exception {
        Usuario mockUser = Usuario.builder()
                .id(UUID.randomUUID())
                .email("advogado@viana.com.br")
                .papel(UserRole.ADVOGADO)
                .build();
        
        when(usuarioRepository.findByEmailIgnoreCase("advogado@viana.com.br")).thenReturn(Optional.of(mockUser));
        
        mockMvc.perform(get("/api/prazos"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = {"ADMINISTRADOR"})
    @DisplayName("Deve criar um prazo com 201 Created quando Admin")
    void criar_Sucesso() throws Exception {
        CriarPrazoRequest req = new CriarPrazoRequest();
        req.setTitulo("Petição");
        req.setTipo("PRAZO_PROCESSUAL");
        req.setPrioridade("MEDIA");
        req.setData(java.time.LocalDate.now());

        PrazoResponse resp = PrazoResponse.builder()
                .id(UUID.randomUUID().toString())
                .titulo("Petição")
                .build();

        when(prazoService.criar(any())).thenReturn(resp);

        mockMvc.perform(post("/api/prazos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.titulo").value("Petição"));
    }
}
