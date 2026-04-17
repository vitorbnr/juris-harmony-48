package com.viana.service;

import com.viana.dto.request.AtualizarClienteRequest;
import com.viana.dto.request.CriarClienteRequest;
import com.viana.dto.response.ClienteResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Cliente;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.TipoAcao;
import com.viana.model.enums.TipoCliente;
import com.viana.model.enums.TipoContaBancaria;
import com.viana.repository.ClienteRepository;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.UnidadeRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Objects;
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
        Cliente cliente = Cliente.builder().build();
        applyDraft(cliente, toDraft(request));
        validarCpfCnpjDuplicado(cliente.getCpfCnpj(), null);

        Cliente clienteSalvo = clienteRepository.save(cliente);

        try {
            logAuditoriaService.registrar(
                    usuarioLogadoId,
                    TipoAcao.CRIOU,
                    ModuloLog.CLIENTES,
                    "Cliente cadastrado: " + clienteSalvo.getNome()
            );
        } catch (Exception ignored) {
        }

        return toResponse(clienteSalvo);
    }

    @Transactional
    public ClienteResponse atualizar(UUID id, AtualizarClienteRequest request) {
        Cliente cliente = findOrThrow(id);
        applyDraft(cliente, toDraft(request));
        validarCpfCnpjDuplicado(cliente.getCpfCnpj(), id);
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

    private void applyDraft(Cliente cliente, ClienteDraft draft) {
        TipoCliente tipo = parseTipoCliente(draft.tipo());
        boolean falecido = Boolean.TRUE.equals(draft.isFalecido());

        cliente.setNome(normalizeRequiredText(draft.nome(), "Nome"));
        cliente.setTipo(tipo);
        cliente.setCpfCnpj(normalizeCpfCnpj(draft.cpfCnpj(), tipo));
        cliente.setEmail(normalizeOptionalText(draft.email()));
        cliente.setTelefone(normalizeOptionalText(draft.telefone()));
        cliente.setCidade(normalizeRequiredText(draft.cidade(), "Cidade"));
        cliente.setEstado(normalizeRequiredText(draft.estado(), "Estado/UF").toUpperCase());
        cliente.setRg(tipo == TipoCliente.PESSOA_FISICA ? normalizeOptionalText(draft.rg()) : null);
        cliente.setCtps(tipo == TipoCliente.PESSOA_FISICA ? normalizeOptionalText(draft.ctps()) : null);
        cliente.setPis(tipo == TipoCliente.PESSOA_FISICA ? normalizeOptionalText(draft.pis()) : null);
        cliente.setTituloEleitorNumero(tipo == TipoCliente.PESSOA_FISICA ? normalizeOptionalText(draft.tituloEleitorNumero()) : null);
        cliente.setTituloEleitorZona(tipo == TipoCliente.PESSOA_FISICA ? normalizeOptionalText(draft.tituloEleitorZona()) : null);
        cliente.setTituloEleitorSessao(tipo == TipoCliente.PESSOA_FISICA ? normalizeOptionalText(draft.tituloEleitorSessao()) : null);
        cliente.setCnhNumero(tipo == TipoCliente.PESSOA_FISICA ? normalizeOptionalText(draft.cnhNumero()) : null);
        cliente.setCnhCategoria(tipo == TipoCliente.PESSOA_FISICA ? normalizeOptionalText(draft.cnhCategoria()) : null);
        cliente.setCnhVencimento(tipo == TipoCliente.PESSOA_FISICA ? parseOptionalDate(draft.cnhVencimento(), "Vencimento da CNH") : null);
        cliente.setPassaporteNumero(tipo == TipoCliente.PESSOA_FISICA ? normalizeOptionalText(draft.passaporteNumero()) : null);
        cliente.setCertidaoReservistaNumero(tipo == TipoCliente.PESSOA_FISICA ? normalizeOptionalText(draft.certidaoReservistaNumero()) : null);
        cliente.setDataNascimento(parseOptionalDate(draft.dataNascimento(), "Data de nascimento"));
        cliente.setNomePai(normalizeOptionalText(draft.nomePai()));
        cliente.setNomeMae(normalizeOptionalText(draft.nomeMae()));
        cliente.setNaturalidade(normalizeOptionalText(draft.naturalidade()));
        cliente.setNacionalidade(normalizeOptionalText(draft.nacionalidade()));
        cliente.setEstadoCivil(normalizeOptionalText(draft.estadoCivil()));
        cliente.setProfissao(normalizeOptionalText(draft.profissao()));
        cliente.setEmpresa(normalizeOptionalText(draft.empresa()));
        cliente.setAtividadeEconomica(normalizeOptionalText(draft.atividadeEconomica()));
        cliente.setComentarios(normalizeOptionalText(draft.comentarios()));
        cliente.setBancoNome(normalizeOptionalText(draft.bancoNome()));
        cliente.setBancoAgencia(normalizeOptionalText(draft.bancoAgencia()));
        cliente.setBancoConta(normalizeOptionalText(draft.bancoConta()));
        cliente.setBancoTipo(parseBancoTipo(draft.bancoTipo()));
        cliente.setChavePix(normalizeOptionalText(draft.chavePix()));
        cliente.setFalecido(falecido);
        cliente.setDetalhesObito(falecido ? normalizeOptionalText(draft.detalhesObito()) : null);
        cliente.setAdvogadoResponsavel(resolveAdvogado(draft.advogadoId()));
        cliente.setUnidade(resolveUnidade(draft.unidadeId()));
    }

    private void validarCpfCnpjDuplicado(String cpfCnpj, UUID clienteIdAtual) {
        if (cpfCnpj == null) {
            return;
        }

        boolean duplicado = clienteRepository.existsByCpfCnpj(cpfCnpj);
        if (!duplicado) {
            return;
        }

        if (clienteIdAtual == null) {
            throw new BusinessException("Ja existe um cliente com este CPF/CNPJ");
        }

        Cliente atual = findOrThrow(clienteIdAtual);
        if (!Objects.equals(atual.getCpfCnpj(), cpfCnpj)) {
            throw new BusinessException("Ja existe um cliente com este CPF/CNPJ");
        }
    }

    private Unidade resolveUnidade(UUID unidadeId) {
        return unidadeRepository.findById(unidadeId)
                .orElseThrow(() -> new ResourceNotFoundException("Unidade nao encontrada"));
    }

    private Usuario resolveAdvogado(UUID advogadoId) {
        if (advogadoId == null) {
            return null;
        }

        return usuarioRepository.findById(advogadoId)
                .orElseThrow(() -> new ResourceNotFoundException("Advogado nao encontrado"));
    }

    private TipoCliente parseTipoCliente(String tipo) {
        try {
            return TipoCliente.valueOf(normalizeRequiredText(tipo, "Tipo").toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Tipo invalido. Use: PESSOA_FISICA ou PESSOA_JURIDICA");
        }
    }

    private TipoContaBancaria parseBancoTipo(String bancoTipo) {
        String normalized = normalizeOptionalText(bancoTipo);
        if (normalized == null) {
            return null;
        }

        try {
            return TipoContaBancaria.valueOf(normalized.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Tipo de conta invalido. Use: CORRENTE ou POUPANCA");
        }
    }

    private String normalizeCpfCnpj(String cpfCnpj, TipoCliente tipo) {
        String normalized = normalizeOptionalText(cpfCnpj);
        if (normalized == null) {
            return null;
        }

        String digits = normalized.replaceAll("\\D", "");
        if (tipo == TipoCliente.PESSOA_FISICA && digits.length() != 11) {
            throw new BusinessException("CPF deve ter 11 digitos");
        }
        if (tipo == TipoCliente.PESSOA_JURIDICA && digits.length() != 14) {
            throw new BusinessException("CNPJ deve ter 14 digitos");
        }

        return normalized;
    }

    private String normalizeRequiredText(String value, String fieldName) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) {
            throw new BusinessException(fieldName + " e obrigatorio");
        }
        return normalized;
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private LocalDate parseOptionalDate(String value, String fieldName) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) {
            return null;
        }

        try {
            return LocalDate.parse(normalized);
        } catch (DateTimeParseException e) {
            throw new BusinessException(fieldName + " invalida. Use o formato yyyy-MM-dd");
        }
    }

    private String formatDate(LocalDate value) {
        return value != null ? value.toString() : "";
    }

    private ClienteDraft toDraft(CriarClienteRequest request) {
        return new ClienteDraft(
                request.getNome(),
                request.getTipo(),
                request.getCpfCnpj(),
                request.getEmail(),
                request.getTelefone(),
                request.getCidade(),
                request.getEstado(),
                request.getAdvogadoId(),
                request.getUnidadeId(),
                request.getRg(),
                request.getCtps(),
                request.getPis(),
                request.getTituloEleitorNumero(),
                request.getTituloEleitorZona(),
                request.getTituloEleitorSessao(),
                request.getCnhNumero(),
                request.getCnhCategoria(),
                request.getCnhVencimento(),
                request.getPassaporteNumero(),
                request.getCertidaoReservistaNumero(),
                request.getDataNascimento(),
                request.getNomePai(),
                request.getNomeMae(),
                request.getNaturalidade(),
                request.getNacionalidade(),
                request.getEstadoCivil(),
                request.getProfissao(),
                request.getEmpresa(),
                request.getAtividadeEconomica(),
                request.getComentarios(),
                request.getBancoNome(),
                request.getBancoAgencia(),
                request.getBancoConta(),
                request.getBancoTipo(),
                request.getChavePix(),
                request.getIsFalecido(),
                request.getDetalhesObito()
        );
    }

    private ClienteDraft toDraft(AtualizarClienteRequest request) {
        return new ClienteDraft(
                request.getNome(),
                request.getTipo(),
                request.getCpfCnpj(),
                request.getEmail(),
                request.getTelefone(),
                request.getCidade(),
                request.getEstado(),
                request.getAdvogadoId(),
                request.getUnidadeId(),
                request.getRg(),
                request.getCtps(),
                request.getPis(),
                request.getTituloEleitorNumero(),
                request.getTituloEleitorZona(),
                request.getTituloEleitorSessao(),
                request.getCnhNumero(),
                request.getCnhCategoria(),
                request.getCnhVencimento(),
                request.getPassaporteNumero(),
                request.getCertidaoReservistaNumero(),
                request.getDataNascimento(),
                request.getNomePai(),
                request.getNomeMae(),
                request.getNaturalidade(),
                request.getNacionalidade(),
                request.getEstadoCivil(),
                request.getProfissao(),
                request.getEmpresa(),
                request.getAtividadeEconomica(),
                request.getComentarios(),
                request.getBancoNome(),
                request.getBancoAgencia(),
                request.getBancoConta(),
                request.getBancoTipo(),
                request.getChavePix(),
                request.getIsFalecido(),
                request.getDetalhesObito()
        );
    }

    private Cliente findOrThrow(UUID id) {
        return clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente nao encontrado"));
    }

    private ClienteResponse toResponse(Cliente cliente) {
        if (cliente == null) {
            return null;
        }

        long numProcessos = 0;
        if (cliente.getId() != null) {
            numProcessos = processoRepository.countByClienteId(cliente.getId());
        }

        return ClienteResponse.builder()
                .id(cliente.getId() != null ? cliente.getId().toString() : "")
                .nome(defaultText(cliente.getNome()))
                .tipo(cliente.getTipo() != null ? cliente.getTipo().name() : "PESSOA_FISICA")
                .cpfCnpj(defaultText(cliente.getCpfCnpj()))
                .email(defaultText(cliente.getEmail()))
                .telefone(defaultText(cliente.getTelefone()))
                .cidade(defaultText(cliente.getCidade()))
                .estado(defaultText(cliente.getEstado()))
                .dataCadastro(formatDate(cliente.getDataCadastro()))
                .rg(defaultText(cliente.getRg()))
                .ctps(defaultText(cliente.getCtps()))
                .pis(defaultText(cliente.getPis()))
                .tituloEleitorNumero(defaultText(cliente.getTituloEleitorNumero()))
                .tituloEleitorZona(defaultText(cliente.getTituloEleitorZona()))
                .tituloEleitorSessao(defaultText(cliente.getTituloEleitorSessao()))
                .cnhNumero(defaultText(cliente.getCnhNumero()))
                .cnhCategoria(defaultText(cliente.getCnhCategoria()))
                .cnhVencimento(formatDate(cliente.getCnhVencimento()))
                .passaporteNumero(defaultText(cliente.getPassaporteNumero()))
                .certidaoReservistaNumero(defaultText(cliente.getCertidaoReservistaNumero()))
                .dataNascimento(formatDate(cliente.getDataNascimento()))
                .nomePai(defaultText(cliente.getNomePai()))
                .nomeMae(defaultText(cliente.getNomeMae()))
                .naturalidade(defaultText(cliente.getNaturalidade()))
                .nacionalidade(defaultText(cliente.getNacionalidade()))
                .estadoCivil(defaultText(cliente.getEstadoCivil()))
                .profissao(defaultText(cliente.getProfissao()))
                .empresa(defaultText(cliente.getEmpresa()))
                .atividadeEconomica(defaultText(cliente.getAtividadeEconomica()))
                .comentarios(defaultText(cliente.getComentarios()))
                .bancoNome(defaultText(cliente.getBancoNome()))
                .bancoAgencia(defaultText(cliente.getBancoAgencia()))
                .bancoConta(defaultText(cliente.getBancoConta()))
                .bancoTipo(cliente.getBancoTipo() != null ? cliente.getBancoTipo().name() : "")
                .chavePix(defaultText(cliente.getChavePix()))
                .isFalecido(Boolean.TRUE.equals(cliente.getFalecido()))
                .detalhesObito(defaultText(cliente.getDetalhesObito()))
                .processos(numProcessos)
                .advogadoId(cliente.getAdvogadoResponsavel() != null ? cliente.getAdvogadoResponsavel().getId().toString() : null)
                .advogadoResponsavel(cliente.getAdvogadoResponsavel() != null ? cliente.getAdvogadoResponsavel().getNome() : null)
                .initials(cliente.getInitials())
                .unidadeId(cliente.getUnidade() != null ? cliente.getUnidade().getId().toString() : null)
                .unidadeNome(cliente.getUnidade() != null ? cliente.getUnidade().getNome() : null)
                .ativo(Boolean.TRUE.equals(cliente.getAtivo()))
                .build();
    }

    private String defaultText(String value) {
        return value != null ? value : "";
    }

    private record ClienteDraft(
            String nome,
            String tipo,
            String cpfCnpj,
            String email,
            String telefone,
            String cidade,
            String estado,
            UUID advogadoId,
            UUID unidadeId,
            String rg,
            String ctps,
            String pis,
            String tituloEleitorNumero,
            String tituloEleitorZona,
            String tituloEleitorSessao,
            String cnhNumero,
            String cnhCategoria,
            String cnhVencimento,
            String passaporteNumero,
            String certidaoReservistaNumero,
            String dataNascimento,
            String nomePai,
            String nomeMae,
            String naturalidade,
            String nacionalidade,
            String estadoCivil,
            String profissao,
            String empresa,
            String atividadeEconomica,
            String comentarios,
            String bancoNome,
            String bancoAgencia,
            String bancoConta,
            String bancoTipo,
            String chavePix,
            Boolean isFalecido,
            String detalhesObito
    ) {
    }
}
