package com.viana.controller;

import com.viana.repository.UsuarioRepository;
import com.viana.service.PastaService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PastaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PastaService pastaService;

    @MockBean
    private UsuarioRepository usuarioRepository;

    @Test
    @WithMockUser(username = "user@test.com")
    @DisplayName("Deve excluir pasta interna retornando 204")
    void excluirInternaSucesso() throws Exception {
        UUID pastaId = UUID.randomUUID();
        com.viana.model.Usuario usuario = com.viana.model.Usuario.builder()
                .id(UUID.randomUUID())
                .email("user@test.com")
                .build();

        Mockito.when(usuarioRepository.findByEmailIgnoreCase("user@test.com")).thenReturn(Optional.of(usuario));

        mockMvc.perform(delete("/api/pastas/internas/" + pastaId))
                .andExpect(status().isNoContent());
    }
}
