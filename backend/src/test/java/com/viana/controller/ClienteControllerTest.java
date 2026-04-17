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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
    @DisplayName("Acesso negado para buscar clientes sem autenticacao")
    void buscarNaoAutenticado() throws Exception {
        mockMvc.perform(get("/api/clientes"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    @DisplayName("Deve listar clientes com autenticacao")
    void listarAutenticado() throws Exception {
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
    @DisplayName("Deve criar cliente com 201")
    void criarSucesso() throws Exception {
        CriarClienteRequest req = new CriarClienteRequest();
        req.setNome("Joao Doe");
        req.setTipo("PESSOA_FISICA");
        req.setCpfCnpj("123.456.789-00");
        req.setCidade("Sao Paulo");
        req.setEstado("SP");
        req.setUnidadeId(UUID.randomUUID());
        req.setAdvogadoId(UUID.randomUUID());

        ClienteResponse resp = ClienteResponse.builder()
                .id(UUID.randomUUID().toString())
                .nome("Joao Doe")
                .tipo("PESSOA_FISICA")
                .build();

        when(clienteService.criar(any(), any())).thenReturn(resp);

        mockMvc.perform(post("/api/clientes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Joao Doe"));
    }

    @Test
    @WithMockUser
    @DisplayName("Deve retornar 400 quando faltarem campos obrigatorios")
    void criarBadRequest() throws Exception {
        CriarClienteRequest req = new CriarClienteRequest();

        mockMvc.perform(post("/api/clientes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }
}
