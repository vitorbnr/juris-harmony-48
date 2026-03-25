package com.viana.controller;

import com.viana.dto.response.DocumentoResponse;
import com.viana.model.Usuario;
import com.viana.repository.UsuarioRepository;
import com.viana.service.DocumentoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DocumentoService documentoService;

    @MockBean
    private UsuarioRepository usuarioRepository;

    @Test
    @WithMockUser(username = "user@test.com")
    @DisplayName("Deve fazer upload de arquivo simulando multipart request")
    void upload_Sucesso() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "conteudo".getBytes());
        Usuario mockUser = Usuario.builder().id(UUID.randomUUID()).email("user@test.com").build();
        
        when(usuarioRepository.findByEmailIgnoreCase("user@test.com")).thenReturn(Optional.of(mockUser));
        
        DocumentoResponse resp = DocumentoResponse.builder()
                .id(UUID.randomUUID().toString())
                .nome("test.pdf")
                .build();

        when(documentoService.upload(any(), any(), any(), any(), any(), any(), any())).thenReturn(resp);

        mockMvc.perform(multipart("/api/documentos")
                        .file(file)
                        .param("categoria", "PETICAO"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("test.pdf"));
    }

    @Test
    @WithMockUser
    @DisplayName("Deve deletar arquivo retornando 204 No Content")
    void excluir_Sucesso() throws Exception {
        UUID docId = UUID.randomUUID();
        
        mockMvc.perform(delete("/api/documentos/" + docId))
                .andExpect(status().isNoContent());
    }
}
