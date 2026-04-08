package com.viana.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.viana.dto.request.CriarProcessoRequest;
import com.viana.dto.response.ProcessoResponse;
import com.viana.service.DatajudClientService;
import com.viana.service.ProcessoService;
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

import java.math.BigDecimal;
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
class ProcessoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProcessoService processoService;

    @MockBean
    private DatajudClientService datajudClientService;

    @Test
    @DisplayName("Garante acesso negado sem token JWT para listar processos")
    void listar_NaoAutenticado() throws Exception {
        mockMvc.perform(get("/api/processos"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "advogado@viana.com.br", roles = {"ADVOGADO"})
    @DisplayName("Deve listar processos paginados quando autenticado")
    void listar_Autenticado() throws Exception {
        ProcessoResponse resp = ProcessoResponse.builder()
                .id(UUID.randomUUID().toString())
                .numero("0001234")
                .status("EM_ANDAMENTO")
                .tipo("CIVEL")
                .build();

        Page<ProcessoResponse> pageResponse = new PageImpl<>(List.of(resp), PageRequest.of(0, 10), 1);

        when(processoService.listar(any(), any(), any(), any(), any())).thenReturn(pageResponse);

        mockMvc.perform(get("/api/processos?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].numero").value("0001234"));
    }

    @Test
    @WithMockUser(roles = {"ADVOGADO"})
    @DisplayName("Deve retornar 201 ao criar processo valido")
    void criar_Sucesso() throws Exception {
        CriarProcessoRequest req = new CriarProcessoRequest();
        req.setNumero("1111");
        req.setStatus("EM_ANDAMENTO");
        req.setTipo("TRABALHISTA");
        req.setValorCausa(new BigDecimal("100"));
        req.setClienteId(UUID.randomUUID());
        req.setAdvogadoIds(List.of(UUID.randomUUID()));
        req.setUnidadeId(UUID.randomUUID());

        ProcessoResponse resp = ProcessoResponse.builder()
                .id(UUID.randomUUID().toString())
                .numero("1111")
                .status("EM_ANDAMENTO")
                .tipo("TRABALHISTA")
                .build();

        when(processoService.criar(any())).thenReturn(resp);

        mockMvc.perform(post("/api/processos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.numero").value("1111"));
    }

    @Test
    @WithMockUser(roles = {"ADVOGADO"})
    @DisplayName("Deve retornar 400 ao criar processo sem advogado responsavel")
    void criar_SemAdvogadoResponsavel() throws Exception {
        CriarProcessoRequest req = new CriarProcessoRequest();
        req.setNumero("1111");
        req.setStatus("EM_ANDAMENTO");
        req.setTipo("TRABALHISTA");
        req.setValorCausa(new BigDecimal("100"));
        req.setClienteId(UUID.randomUUID());
        req.setAdvogadoIds(List.of());
        req.setUnidadeId(UUID.randomUUID());

        mockMvc.perform(post("/api/processos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros.advogadoIds").value("Pelo menos um advogado responsÃ¡vel Ã© obrigatÃ³rio"));
    }
}
