package com.viana.service;

import com.viana.dto.request.AtualizarClienteRequest;
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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final UnidadeRepository unidadeRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProcessoRepository processoRepository;
    private final LogAuditoriaService logAuditoriaService;

    @Transactional(readOnly = true)
    public Page<ClienteResponse> listar(UUID unidadeId, String busca, Pageable pageable) {
        String buscaSafe = (busca == null || busca.isBlank()) ? "" : busca;
        return clienteRepository.findAllWithFilters(unidadeId, buscaSafe, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public ClienteResponse buscarPorId(UUID id) {
        Cliente cliente = findOrThrow(id);
        return toResponse(cliente);
    }

    @Transactional
    public ClienteResponse criar(CriarClienteRequest request, UUID usuarioLogadoId) {
        if (clienteRepository.existsByCpfCnpj(request.getCpfCnpj())) {
            throw new BusinessException("Já existe um cliente com este CPF/CNPJ");
        }

        Unidade unidade = unidadeRepository.findById(request.getUnidadeId())
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));

        TipoCliente tipo;
        try {
            tipo = TipoCliente.valueOf(request.getTipo().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Tipo inválido. Use: PESSOA_FISICA ou PESSOA_JURIDICA");
        }

        Usuario advogado = null;
        if (request.getAdvogadoId() != null) {
            advogado = usuarioRepository.findById(request.getAdvogadoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Advogado não encontrado"));
        }

        Cliente cliente = Cliente.builder()
                .nome(request.getNome())
                .tipo(tipo)
                .cpfCnpj(request.getCpfCnpj())
                .email(request.getEmail())
                .telefone(request.getTelefone())
                .cidade(request.getCidade())
                .estado(request.getEstado())
                .advogadoResponsavel(advogado)
                .unidade(unidade)
                .build();

        Cliente clienteSalvo = clienteRepository.save(cliente);
        
        // Log de auditoria
        try {
            logAuditoriaService.registrar(usuarioLogadoId, 
                    com.viana.model.enums.TipoAcao.CRIOU, 
                    com.viana.model.enums.ModuloLog.CLIENTES, 
                    "Cliente cadastrado: " + clienteSalvo.getNome());
        } catch (Exception ignored) {}

        return toResponse(clienteSalvo);
    }

    @Transactional
    public ClienteResponse atualizar(UUID id, AtualizarClienteRequest request) {
        Cliente cliente = findOrThrow(id);

        if (request.getNome() != null) cliente.setNome(request.getNome());
        if (request.getTipo() != null) {
            try {
                cliente.setTipo(TipoCliente.valueOf(request.getTipo().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new BusinessException("Tipo inválido");
            }
        }
        if (request.getCpfCnpj() != null) {
            if (!cliente.getCpfCnpj().equals(request.getCpfCnpj())
                    && clienteRepository.existsByCpfCnpj(request.getCpfCnpj())) {
                throw new BusinessException("Já existe um cliente com este CPF/CNPJ");
            }
            cliente.setCpfCnpj(request.getCpfCnpj());
        }
        if (request.getEmail() != null) cliente.setEmail(request.getEmail());
        if (request.getTelefone() != null) cliente.setTelefone(request.getTelefone());
        if (request.getCidade() != null) cliente.setCidade(request.getCidade());
        if (request.getEstado() != null) cliente.setEstado(request.getEstado());
        if (request.getAdvogadoId() != null) {
            Usuario advogado = usuarioRepository.findById(request.getAdvogadoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Advogado não encontrado"));
            cliente.setAdvogadoResponsavel(advogado);
        }
        if (request.getUnidadeId() != null) {
            Unidade unidade = unidadeRepository.findById(request.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
            cliente.setUnidade(unidade);
        }

        return toResponse(clienteRepository.save(cliente));
    }

    @Transactional
    public void desativar(UUID id) {
        Cliente cliente = findOrThrow(id);
        cliente.setAtivo(false);
        clienteRepository.save(cliente);
    }

    @Transactional(readOnly = true)
    public long contarAtivos() {
        return clienteRepository.countByAtivoTrue();
    }

    @Transactional(readOnly = true)
    public UUID getUsuarioIdByEmail(String email) {
        return usuarioRepository.findByEmailIgnoreCase(email)
                .map(Usuario::getId)
                .orElse(null);
    }

    private Cliente findOrThrow(UUID id) {
        return clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado"));
    }

    private ClienteResponse toResponse(Cliente c) {
        if (c == null) return null;

        long numProcessos = 0;
        if (c.getId() != null) {
            numProcessos = processoRepository.countByClienteId(c.getId());
        }

        return ClienteResponse.builder()
                .id(c.getId() != null ? c.getId().toString() : "")
                .nome(c.getNome())
                .tipo(c.getTipo() != null ? c.getTipo().name() : "FISICA")
                .cpfCnpj(c.getCpfCnpj())
                .email(c.getEmail())
                .telefone(c.getTelefone())
                .cidade(c.getCidade())
                .estado(c.getEstado())
                .dataCadastro(c.getDataCadastro() != null ? c.getDataCadastro().toString() : "")
                .processos(numProcessos) 
                .advogadoResponsavel(c.getAdvogadoResponsavel() != null ? c.getAdvogadoResponsavel().getNome() : null)
                .initials(c.getInitials())
                .unidadeId(c.getUnidade() != null ? c.getUnidade().getId().toString() : null)
                .unidadeNome(c.getUnidade() != null ? c.getUnidade().getNome() : null)
                .ativo(c.getAtivo() != null && c.getAtivo())
                .build();
    }
}
