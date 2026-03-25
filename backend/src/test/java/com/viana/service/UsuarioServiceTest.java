package com.viana.service;

import com.viana.dto.request.CriarUsuarioRequest;
import com.viana.dto.response.UsuarioResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.UserRole;
import com.viana.repository.UnidadeRepository;
import com.viana.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private UnidadeRepository unidadeRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UsuarioService usuarioService;

    private CriarUsuarioRequest requestValida;
    private Unidade unidadeDefault;
    private UUID unidadeId;

    @BeforeEach
    void setUp() {
        unidadeId = UUID.randomUUID();
        unidadeDefault = Unidade.builder()
                .id(unidadeId)
                .nome("Sede Viana")
                .cidade("São Paulo")
                .estado("SP")
                .build();

        requestValida = new CriarUsuarioRequest();
        requestValida.setNome("Teste Advogado");
        requestValida.setEmail("teste@viana.com.br");
        requestValida.setSenha("Forte#2024");
        requestValida.setCargo("Advogado Civil");
        requestValida.setOab("SP12345");
        requestValida.setPapel("ADVOGADO");
        requestValida.setUnidadeId(unidadeId);
    }

    @Test
    @DisplayName("Deve criar um usuário com sucesso quando os dados forem válidos")
    void criarUsuario_ComSucesso() {
        // Arrange
        when(usuarioRepository.existsByEmailIgnoreCase(requestValida.getEmail())).thenReturn(false);
        when(unidadeRepository.findById(unidadeId)).thenReturn(Optional.of(unidadeDefault));
        when(passwordEncoder.encode(requestValida.getSenha())).thenReturn("hash_senha_secreta");

        Usuario usuarioSalvo = Usuario.builder()
                .id(UUID.randomUUID())
                .nome(requestValida.getNome())
                .email(requestValida.getEmail())
                .senhaHash("hash_senha_secreta")
                .cargo(requestValida.getCargo())
                .papel(UserRole.ADVOGADO)
                .unidade(unidadeDefault)
                .ativo(true)
                .criadoEm(LocalDateTime.now())
                .build();

        when(usuarioRepository.save(any(Usuario.class))).thenReturn(usuarioSalvo);

        // Act
        UsuarioResponse response = usuarioService.criar(requestValida);

        // Assert
        assertNotNull(response);
        assertEquals(requestValida.getNome(), response.getNome());
        assertEquals(requestValida.getEmail(), response.getEmail());
        assertEquals("ADVOGADO", response.getPapel());
        
        verify(usuarioRepository, times(1)).save(any(Usuario.class));
        verify(passwordEncoder, times(1)).encode(requestValida.getSenha());
    }

    @Test
    @DisplayName("Deve lançar BusinessException quando o e-mail já existir")
    void criarUsuario_ComEmailExistente() {
        // Arrange
        when(usuarioRepository.existsByEmailIgnoreCase(requestValida.getEmail())).thenReturn(true);

        // Act & Assert
        BusinessException exception = assertThrows(BusinessException.class, () -> usuarioService.criar(requestValida));
        assertEquals("Já existe um usuário com este e-mail", exception.getMessage());
        
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("Deve lançar ResourceNotFoundException quando unidade não for encontrada")
    void criarUsuario_ComUnidadeNaoEncontrada() {
        // Arrange
        when(usuarioRepository.existsByEmailIgnoreCase(any())).thenReturn(false);
        when(unidadeRepository.findById(unidadeId)).thenReturn(Optional.empty());

        // Act & Assert
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> usuarioService.criar(requestValida));
        assertEquals("Unidade não encontrada", exception.getMessage());
    }

    @Test
    @DisplayName("Deve lançar exceção para senhas fracas (sem maiúscula)")
    void validarSenha_SenhasSemMaiuscula() {
        // Arrange
        when(usuarioRepository.existsByEmailIgnoreCase(any())).thenReturn(false);
        when(unidadeRepository.findById(unidadeId)).thenReturn(Optional.of(unidadeDefault));
        requestValida.setSenha("fraca#1234"); // sem letras maiúsculas

        // Act & Assert
        BusinessException exception = assertThrows(BusinessException.class, () -> usuarioService.criar(requestValida));
        assertEquals("A senha deve conter pelo menos uma letra maiúscula", exception.getMessage());
    }

    @Test
    @DisplayName("Deve lançar exceção para senhas fracas (curta)")
    void validarSenha_SenhasCurtas() {
        // Arrange
        when(usuarioRepository.existsByEmailIgnoreCase(any())).thenReturn(false);
        when(unidadeRepository.findById(unidadeId)).thenReturn(Optional.of(unidadeDefault));
        requestValida.setSenha("A#123"); // < 8 caracteres

        // Act & Assert
        BusinessException exception = assertThrows(BusinessException.class, () -> usuarioService.criar(requestValida));
        assertEquals("A senha deve ter no mínimo 8 caracteres", exception.getMessage());
    }

    @Test
    @DisplayName("Deve lançar exceção para senhas fracas (sem número)")
    void validarSenha_SenhasSemNumero() {
        // Arrange
        when(usuarioRepository.existsByEmailIgnoreCase(any())).thenReturn(false);
        when(unidadeRepository.findById(unidadeId)).thenReturn(Optional.of(unidadeDefault));
        requestValida.setSenha("SenhaForte#"); // sem números

        // Act & Assert
        BusinessException exception = assertThrows(BusinessException.class, () -> usuarioService.criar(requestValida));
        assertEquals("A senha deve conter pelo menos um número", exception.getMessage());
    }

    @Test
    @DisplayName("Deve lançar exceção para senhas fracas (sem caractere especial)")
    void validarSenha_SenhasSemEspecial() {
        // Arrange
        when(usuarioRepository.existsByEmailIgnoreCase(any())).thenReturn(false);
        when(unidadeRepository.findById(unidadeId)).thenReturn(Optional.of(unidadeDefault));
        requestValida.setSenha("Forte2024"); // sem caracteres especiais

        // Act & Assert
        BusinessException exception = assertThrows(BusinessException.class, () -> usuarioService.criar(requestValida));
        assertEquals("A senha deve conter pelo menos um caractere especial (!@#$%^&*...)", exception.getMessage());
    }
}
