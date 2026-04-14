package com.viana.controller;

import com.viana.dto.response.DocumentoResponse;
import com.viana.model.Documento;
import com.viana.model.Usuario;
import com.viana.repository.DocumentoRepository;
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
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

    @MockBean
    private DocumentoRepository documentoRepository;

    @Test
    @WithMockUser(username = "user@test.com")
    @DisplayName("Deve fazer upload de arquivo simulando multipart request")
    void uploadSucesso() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", "conteudo".getBytes());
        Usuario mockUser = Usuario.builder().id(UUID.randomUUID()).email("user@test.com").build();

        when(usuarioRepository.findByEmailIgnoreCase("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentoService.upload(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(DocumentoResponse.builder().id(UUID.randomUUID().toString()).nome("test.pdf").build());

        mockMvc.perform(multipart("/api/documentos")
                        .file(file)
                        .param("categoria", "PETICAO"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("test.pdf"));
    }

    @Test
    @WithMockUser
    @DisplayName("Deve deletar arquivo retornando 204 No Content")
    void excluirSucesso() throws Exception {
        UUID docId = UUID.randomUUID();
        Usuario mockUser = Usuario.builder().id(UUID.randomUUID()).email("user").build();

        when(usuarioRepository.findByEmailIgnoreCase("user")).thenReturn(Optional.of(mockUser));

        mockMvc.perform(delete("/api/documentos/" + docId))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    @DisplayName("Deve atualizar documento retornando os dados alterados")
    void atualizarSucesso() throws Exception {
        UUID docId = UUID.randomUUID();
        Usuario mockUser = Usuario.builder().id(UUID.randomUUID()).email("user@test.com").build();

        when(usuarioRepository.findByEmailIgnoreCase("user@test.com")).thenReturn(Optional.of(mockUser));
        when(documentoService.atualizar(eq(docId), any(), any(), anyBoolean()))
                .thenReturn(DocumentoResponse.builder()
                        .id(docId.toString())
                        .nome("Contrato Atualizado.pdf")
                        .categoria("contrato")
                        .build());

        mockMvc.perform(put("/api/documentos/" + docId)
                        .contentType("application/json")
                        .content("""
                                {
                                  "nome": "Contrato Atualizado.pdf",
                                  "categoria": "CONTRATO"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Contrato Atualizado.pdf"))
                .andExpect(jsonPath("$.categoria").value("contrato"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    @DisplayName("Deve excluir documento local via storage key")
    void excluirStorageLocalSucesso() throws Exception {
        Usuario mockUser = Usuario.builder().id(UUID.randomUUID()).email("user@test.com").build();

        when(usuarioRepository.findByEmailIgnoreCase("user@test.com")).thenReturn(Optional.of(mockUser));

        mockMvc.perform(delete("/api/documentos/storage/unidade__clientes__arquivo.pdf"))
                .andExpect(status().isNoContent());
    }
}
