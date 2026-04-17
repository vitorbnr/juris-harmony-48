package com.viana.service;

import com.viana.dto.request.CriarClienteRequest;
import com.viana.dto.response.ClienteResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Cliente;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.TipoCliente;
import com.viana.repository.ClienteRepository;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.UnidadeRepository;
import com.viana.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClienteServiceTest {

    @Mock
    private ClienteRepository clienteRepository;

    @Mock
    private UnidadeRepository unidadeRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private ProcessoRepository processoRepository;

    @Mock
    private LogAuditoriaService logAuditoriaService;

    @InjectMocks
    private ClienteService clienteService;

    private UUID clienteId;
    private Unidade unidadeDefault;
    private Usuario advogadoDefault;
    private CriarClienteRequest requestValida;
    private Cliente clienteSalvo;

    @BeforeEach
    void setUp() {
        clienteId = UUID.randomUUID();
        unidadeDefault = Unidade.builder().id(UUID.randomUUID()).nome("Sede").build();
        advogadoDefault = Usuario.builder().id(UUID.randomUUID()).nome("Dr. Pedro").build();

        requestValida = new CriarClienteRequest();
        requestValida.setNome("Empresa ABC");
        requestValida.setTipo("PESSOA_JURIDICA");
        requestValida.setCpfCnpj("12.345.678/0001-90");
        requestValida.setEmail("contato@abc.com");
        requestValida.setTelefone("11999999999");
        requestValida.setCidade("Sao Paulo");
        requestValida.setEstado("SP");
        requestValida.setUnidadeId(unidadeDefault.getId());
        requestValida.setAdvogadoId(advogadoDefault.getId());

        clienteSalvo = Cliente.builder()
                .id(clienteId)
                .nome("Empresa ABC")
                .tipo(TipoCliente.PESSOA_JURIDICA)
                .cpfCnpj("12.345.678/0001-90")
                .email("contato@abc.com")
                .telefone("11999999999")
                .cidade("Sao Paulo")
                .estado("SP")
                .advogadoResponsavel(advogadoDefault)
                .unidade(unidadeDefault)
                .ativo(true)
                .dataCadastro(LocalDate.now())
                .build();
    }

    @Test
    @DisplayName("Deve criar um cliente com sucesso")
    void criarClienteComSucesso() {
        when(clienteRepository.existsByCpfCnpj(requestValida.getCpfCnpj())).thenReturn(false);
        when(unidadeRepository.findById(requestValida.getUnidadeId())).thenReturn(Optional.of(unidadeDefault));
        when(usuarioRepository.findById(requestValida.getAdvogadoId())).thenReturn(Optional.of(advogadoDefault));
        when(clienteRepository.save(any(Cliente.class))).thenReturn(clienteSalvo);
        when(processoRepository.countByClienteId(clienteId)).thenReturn(0L);

        ClienteResponse response = clienteService.criar(requestValida, advogadoDefault.getId());

        assertNotNull(response);
        assertEquals("Empresa ABC", response.getNome());
        assertEquals("12.345.678/0001-90", response.getCpfCnpj());
        verify(clienteRepository).save(any(Cliente.class));
    }

    @Test
    @DisplayName("Deve permitir criar cliente sem CPF/CNPJ")
    void criarClienteSemDocumento() {
        requestValida.setCpfCnpj(null);

        when(unidadeRepository.findById(requestValida.getUnidadeId())).thenReturn(Optional.of(unidadeDefault));
        when(usuarioRepository.findById(requestValida.getAdvogadoId())).thenReturn(Optional.of(advogadoDefault));
        when(clienteRepository.save(any(Cliente.class))).thenReturn(clienteSalvo);
        when(processoRepository.countByClienteId(clienteId)).thenReturn(0L);

        ClienteResponse response = clienteService.criar(requestValida, advogadoDefault.getId());

        assertNotNull(response);
        verify(clienteRepository, never()).existsByCpfCnpj(any());
    }

    @Test
    @DisplayName("Deve lancar excecao se o CPF/CNPJ ja existir")
    void criarClienteCpfCnpjDuplicado() {
        when(clienteRepository.existsByCpfCnpj(requestValida.getCpfCnpj())).thenReturn(true);
        when(unidadeRepository.findById(requestValida.getUnidadeId())).thenReturn(Optional.of(unidadeDefault));
        when(usuarioRepository.findById(requestValida.getAdvogadoId())).thenReturn(Optional.of(advogadoDefault));

        BusinessException exception = assertThrows(BusinessException.class, () -> clienteService.criar(requestValida, null));
        assertTrue(exception.getMessage().contains("Ja existe um cliente com este CPF/CNPJ"));
        verify(clienteRepository, never()).save(any());
    }

    @Test
    @DisplayName("Deve lancar excecao para tipo de cliente invalido")
    void criarClienteTipoInvalido() {
        requestValida.setTipo("PESSOA_MARCIANA");

        BusinessException exception = assertThrows(BusinessException.class, () -> clienteService.criar(requestValida, null));
        assertTrue(exception.getMessage().contains("Tipo invalido"));
    }

    @Test
    @DisplayName("Deve buscar cliente por ID")
    void buscarPorIdComSucesso() {
        when(clienteRepository.findById(clienteId)).thenReturn(Optional.of(clienteSalvo));
        when(processoRepository.countByClienteId(clienteId)).thenReturn(3L);

        ClienteResponse response = clienteService.buscarPorId(clienteId);

        assertNotNull(response);
        assertEquals("Empresa ABC", response.getNome());
        assertEquals(3L, response.getProcessos());
        assertEquals("Dr. Pedro", response.getAdvogadoResponsavel());
    }

    @Test
    @DisplayName("Deve lancar ResourceNotFoundException ao buscar ID inexistente")
    void buscarPorIdNaoEncontrado() {
        when(clienteRepository.findById(clienteId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> clienteService.buscarPorId(clienteId));
    }
}
