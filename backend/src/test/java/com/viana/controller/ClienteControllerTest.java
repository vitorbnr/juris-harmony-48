package com.viana.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.viana.dto.request.CriarClienteRequest;
import com.viana.dto.response.ClienteResponse;
import com.viana.service.ClienteService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ClienteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ClienteService clienteService;

    @Test
    @DisplayName("Acesso Negado 401 para buscar clientes sem Token JWT")
    void buscar_NaoAutenticado() throws Exception {
        mockMvc.perform(get("/api/clientes"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    @DisplayName("Deve buscar e paginar clientes retornando 200 OK")
    void listar_Autenticado() throws Exception {
        ClienteResponse resp = ClienteResponse.builder()
                .id(UUID.randomUUID().toString())
                .nome("Empresa Ficticia")
                .cpfCnpj("00.000.000/0001-91")
                .tipo("PESSOA_JURIDICA")
                .ativo(true)
                .build();

        Page<ClienteResponse> page = new PageImpl<>(List.of(resp), PageRequest.of(0, 10), 1);

        when(clienteService.listar(any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/clientes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].nome").value("Empresa Ficticia"))
                .andExpect(jsonPath("$.content[0].cpfCnpj").value("00.000.000/0001-91"));
    }

    @Test
    @WithMockUser
    @DisplayName("Deve criar cliente com 201 Created")
    void criar_Sucesso() throws Exception {
        CriarClienteRequest req = new CriarClienteRequest();
        req.setNome("João Doe");
        req.setTipo("PESSOA_FISICA");
        req.setCpfCnpj("123.456.789-00");
        req.setUnidadeId(UUID.randomUUID());
        req.setAdvogadoId(UUID.randomUUID());

        ClienteResponse resp = ClienteResponse.builder()
                .id(UUID.randomUUID().toString())
                .nome("João Doe")
                .tipo("PESSOA_FISICA")
                .build();

        when(clienteService.criar(any(), any())).thenReturn(resp);

        mockMvc.perform(post("/api/clientes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("João Doe"));
    }

    @Test
    @WithMockUser
    @DisplayName("Deve retornar 400 Bad Request se payload de criacao de cliente for nulo ou faltar campos obrigatorios")
    void criar_BadRequest() throws Exception {
        CriarClienteRequest req = new CriarClienteRequest(); // Campos vazios -> falha no @Valid

        mockMvc.perform(post("/api/clientes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }
}
