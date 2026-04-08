package com.viana.service;

import com.viana.dto.request.AtualizarProcessoRequest;
import com.viana.dto.request.CriarMovimentacaoRequest;
import com.viana.dto.request.CriarProcessoRequest;
import com.viana.dto.response.DatajudCapaResponse;
import com.viana.dto.response.DatajudMovimentacaoResponse;
import com.viana.dto.response.ProcessoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Cliente;
import com.viana.model.Movimentacao;
import com.viana.model.Processo;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.OrigemMovimentacao;
import com.viana.model.enums.StatusProcesso;
import com.viana.model.enums.TipoAcao;
import com.viana.model.enums.TipoMovimentacao;
import com.viana.model.enums.TipoProcesso;
import com.viana.repository.ClienteRepository;
import com.viana.repository.MovimentacaoRepository;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.UnidadeRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProcessoService {

    private final ProcessoRepository processoRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final UnidadeRepository unidadeRepository;
    private final MovimentacaoRepository movimentacaoRepository;
    private final LogAuditoriaService logAuditoriaService;
    private final DatajudClientService datajudClientService;

    @Transactional(readOnly = true)
    public Page<ProcessoResponse> listar(UUID unidadeId, String status, String tipo, String busca, Pageable pageable) {
        StatusProcesso statusEnum = parseEnum(StatusProcesso.class, status);
        TipoProcesso tipoEnum = parseEnum(TipoProcesso.class, tipo);
        String buscaNorm = (busca != null && !busca.isBlank()) ? busca : null;

        return processoRepository.findAllWithFilters(unidadeId, statusEnum, tipoEnum, buscaNorm, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<ProcessoResponse> listarRecentes(int limite) {
        return processoRepository.findTop5ByOrderByCriadoEmDesc().stream()
                .limit(limite)
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ProcessoResponse buscarPorId(UUID id) {
        Processo processo = findOrThrow(id);

        if (deveSincronizarMovimentacoesDatajud(processo)) {
            sincronizarMovimentacoesDatajud(processo);
        }

        ProcessoResponse response = toResponse(processo);
        response.setMovimentacoes(
                movimentacaoRepository.findTimelineByProcessoId(id).stream()
                        .map(this::toMovimentacaoResponse)
                        .toList()
        );
        return response;
    }

    @Transactional
    public ProcessoResponse criar(CriarProcessoRequest request) {
        String numeroProcesso = request.getNumero() != null ? request.getNumero().trim() : null;
        if (numeroProcesso == null || numeroProcesso.isBlank()) {
            throw new BusinessException("NÃºmero do processo Ã© obrigatÃ³rio");
        }
        if (processoRepository.existsByNumero(numeroProcesso)) {
            throw new BusinessException("JÃ¡ existe um processo cadastrado com esse nÃºmero.");
        }

        Cliente cliente = clienteRepository.findById(request.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado"));
        Unidade unidade = unidadeRepository.findById(request.getUnidadeId())
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));

        StatusProcesso statusEnum = parseEnumRequired(StatusProcesso.class, request.getStatus(), "Status");
        TipoProcesso tipoEnum = parseEnumRequired(TipoProcesso.class, request.getTipo(), "Tipo");

        validarAdvogadosObrigatorios(request.getAdvogadoIds());
        Set<Usuario> advogados = resolverAdvogados(request.getAdvogadoIds());

        Processo processo = Processo.builder()
                .numero(numeroProcesso)
                .cliente(cliente)
                .tipo(tipoEnum)
                .vara(request.getVara())
                .tribunal(request.getTribunal())
                .advogados(advogados)
                .status(statusEnum)
                .dataDistribuicao(request.getDataDistribuicao())
                .valorCausa(request.getValorCausa())
                .descricao(request.getDescricao())
                .unidade(unidade)
                .build();

        try {
            processo = processoRepository.save(processo);
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessException("JÃ¡ existe um processo cadastrado com esse nÃºmero.");
        }
        sincronizarMovimentacoesDatajud(processo);

        // Log de auditoria (best-effort)
        try {
            UUID logUserId = advogados.stream().findFirst().map(Usuario::getId).orElse(null);
            if (logUserId != null) {
                logAuditoriaService.registrar(logUserId, TipoAcao.CRIOU, ModuloLog.PROCESSOS,
                        "Processo criado: " + request.getNumero() + " â€” " + cliente.getNome());
            }
        } catch (Exception ignored) {
        }

        return toResponse(processo);
    }

    private void validarAdvogadosObrigatorios(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new BusinessException("Pelo menos um advogado responsável é obrigatório");
        }
    }

    @Transactional
    public ProcessoResponse atualizar(UUID id, AtualizarProcessoRequest request) {
        Processo processo = findOrThrow(id);

        if (request.getTipo() != null) {
            processo.setTipo(parseEnumRequired(TipoProcesso.class, request.getTipo(), "Tipo"));
        }
        if (request.getStatus() != null) {
            processo.setStatus(parseEnumRequired(StatusProcesso.class, request.getStatus(), "Status"));
        }
        if (request.getVara() != null) processo.setVara(request.getVara());
        if (request.getTribunal() != null) processo.setTribunal(request.getTribunal());
        if (request.getDataDistribuicao() != null) processo.setDataDistribuicao(request.getDataDistribuicao());
        if (request.getValorCausa() != null) processo.setValorCausa(request.getValorCausa());
        if (request.getDescricao() != null) processo.setDescricao(request.getDescricao());

        if (request.getAdvogadoIds() != null) {
            validarAdvogadosObrigatorios(request.getAdvogadoIds());
            processo.getAdvogados().clear();
            processo.getAdvogados().addAll(resolverAdvogados(request.getAdvogadoIds()));
        }

        if (request.getUnidadeId() != null) {
            Unidade unidade = unidadeRepository.findById(request.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
            processo.setUnidade(unidade);
        }

        return toResponse(processoRepository.save(processo));
    }

    @Transactional
    public ProcessoResponse alterarStatus(UUID id, String novoStatus) {
        Processo processo = findOrThrow(id);
        StatusProcesso statusEnum = parseEnumRequired(StatusProcesso.class, novoStatus, "Status");
        processo.setStatus(statusEnum);
        return toResponse(processoRepository.save(processo));
    }

    @Transactional
    public ProcessoResponse.MovimentacaoResponse adicionarMovimentacao(UUID processoId, CriarMovimentacaoRequest request) {
        Processo processo = findOrThrow(processoId);
        TipoMovimentacao tipoEnum = parseEnumRequired(TipoMovimentacao.class, request.getTipo(), "Tipo");

        Movimentacao mov = Movimentacao.builder()
                .processo(processo)
                .data(request.getData())
                .descricao(request.getDescricao())
                .tipo(tipoEnum)
                .origem(OrigemMovimentacao.MANUAL)
                .build();

        mov = movimentacaoRepository.save(mov);
        atualizarUltimaMovimentacao(processo, request.getData());

        return toMovimentacaoResponse(mov);
    }

    @Transactional(readOnly = true)
    public long contarAtivos() {
        return processoRepository.countByStatusIn(List.of(
                StatusProcesso.EM_ANDAMENTO, StatusProcesso.URGENTE, StatusProcesso.AGUARDANDO));
    }

    private boolean deveSincronizarMovimentacoesDatajud(Processo processo) {
        return isNumeroCnj(processo.getNumero())
                && movimentacaoRepository.findChavesExternasByProcessoId(processo.getId()).isEmpty();
    }

    private void sincronizarMovimentacoesDatajud(Processo processo) {
        if (!isNumeroCnj(processo.getNumero())) {
            return;
        }

        try {
            DatajudCapaResponse datajud = datajudClientService.buscarCapaProcesso(processo.getNumero());
            importarMovimentacoesDatajud(processo, datajud.getMovimentacoes());
        } catch (BusinessException | ResourceNotFoundException ignored) {
            // O processo local não deve falhar por indisponibilidade ou ausência de dados no Datajud.
        }
    }

    private void importarMovimentacoesDatajud(Processo processo, List<DatajudMovimentacaoResponse> movimentacoesDatajud) {
        if (movimentacoesDatajud == null || movimentacoesDatajud.isEmpty()) {
            return;
        }

        Set<String> chavesExistentes = new HashSet<>(movimentacaoRepository.findChavesExternasByProcessoId(processo.getId()));
        List<Movimentacao> novasMovimentacoes = new ArrayList<>();

        for (DatajudMovimentacaoResponse movimento : movimentacoesDatajud) {
            if (movimento.getChaveExterna() == null || chavesExistentes.contains(movimento.getChaveExterna())) {
                continue;
            }

            LocalDate data = parseLocalDate(movimento.getData(), movimento.getDataHora());
            if (data == null) {
                continue;
            }

            novasMovimentacoes.add(Movimentacao.builder()
                    .processo(processo)
                    .data(data)
                    .descricao(movimento.getDescricao() != null ? movimento.getDescricao() : movimento.getNome())
                    .tipo(parseEnumRequired(TipoMovimentacao.class, movimento.getTipo(), "Tipo"))
                    .origem(OrigemMovimentacao.DATAJUD)
                    .codigoExterno(movimento.getCodigo())
                    .chaveExterna(movimento.getChaveExterna())
                    .orgaoJulgador(movimento.getOrgaoJulgador())
                    .dataHoraOriginal(parseLocalDateTime(movimento.getDataHora()))
                    .build());

            chavesExistentes.add(movimento.getChaveExterna());
        }

        if (novasMovimentacoes.isEmpty()) {
            return;
        }

        movimentacaoRepository.saveAll(novasMovimentacoes);
        novasMovimentacoes.stream()
                .map(Movimentacao::getData)
                .max(LocalDate::compareTo)
                .ifPresent(data -> atualizarUltimaMovimentacao(processo, data));
    }

    private void atualizarUltimaMovimentacao(Processo processo, LocalDate data) {
        if (data == null) {
            return;
        }

        if (processo.getUltimaMovimentacao() == null || data.isAfter(processo.getUltimaMovimentacao())) {
            processo.setUltimaMovimentacao(data);
            processoRepository.save(processo);
        }
    }

    private LocalDate parseLocalDate(String data, String dataHora) {
        if (data != null && !data.isBlank()) {
            try {
                return LocalDate.parse(data);
            } catch (DateTimeParseException ignored) {
            }
        }

        LocalDateTime parsedDateTime = parseLocalDateTime(dataHora);
        return parsedDateTime != null ? parsedDateTime.toLocalDate() : null;
    }

    private LocalDateTime parseLocalDateTime(String dataHora) {
        if (dataHora == null || dataHora.isBlank()) {
            return null;
        }

        try {
            return LocalDateTime.parse(dataHora);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private boolean isNumeroCnj(String numeroProcesso) {
        return numeroProcesso != null && numeroProcesso.replaceAll("\\D", "").length() == 20;
    }

    private Set<Usuario> resolverAdvogados(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) return new HashSet<>();
        return ids.stream()
                .map(uid -> usuarioRepository.findById(uid)
                        .orElseThrow(() -> new ResourceNotFoundException("Advogado não encontrado: " + uid)))
                .collect(Collectors.toCollection(HashSet::new));
    }

    private Processo findOrThrow(UUID id) {
        return processoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Processo não encontrado"));
    }

    private ProcessoResponse toResponse(Processo p) {
        List<ProcessoResponse.AdvogadoInfo> advogadoInfos = p.getAdvogados() == null
                ? new ArrayList<>()
                : p.getAdvogados().stream()
                .map(a -> ProcessoResponse.AdvogadoInfo.builder()
                        .id(a.getId().toString())
                        .nome(a.getNome())
                        .build())
                .collect(Collectors.toList());

        String advogadoId = advogadoInfos.isEmpty() ? null : advogadoInfos.get(0).getId();
        String advogadoNome = advogadoInfos.isEmpty() ? null : advogadoInfos.get(0).getNome();

        return ProcessoResponse.builder()
                .id(p.getId().toString())
                .numero(p.getNumero())
                .clienteId(p.getCliente().getId().toString())
                .clienteNome(p.getCliente().getNome())
                .tipo(p.getTipo().name())
                .vara(p.getVara())
                .tribunal(p.getTribunal())
                .advogados(advogadoInfos)
                .advogadoId(advogadoId)
                .advogadoNome(advogadoNome)
                .status(p.getStatus().name())
                .dataDistribuicao(p.getDataDistribuicao() != null ? p.getDataDistribuicao().toString() : null)
                .ultimaMovimentacao(p.getUltimaMovimentacao() != null ? p.getUltimaMovimentacao().toString() : null)
                .proximoPrazo(p.getProximoPrazo() != null ? p.getProximoPrazo().toString() : null)
                .valorCausa(p.getValorCausa() != null ? p.getValorCausa().toString() : null)
                .descricao(p.getDescricao())
                .unidadeId(p.getUnidade().getId().toString())
                .unidadeNome(p.getUnidade().getNome())
                .build();
    }

    private ProcessoResponse.MovimentacaoResponse toMovimentacaoResponse(Movimentacao m) {
        return ProcessoResponse.MovimentacaoResponse.builder()
                .id(m.getId().toString())
                .data(m.getData() != null ? m.getData().toString() : null)
                .dataHora(m.getDataHoraOriginal() != null ? m.getDataHoraOriginal().toString() : null)
                .descricao(m.getDescricao())
                .tipo(m.getTipo().name())
                .origem(m.getOrigem() != null ? m.getOrigem().name() : null)
                .orgaoJulgador(m.getOrgaoJulgador())
                .build();
    }

    private <T extends Enum<T>> T parseEnum(Class<T> clazz, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(clazz, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private <T extends Enum<T>> T parseEnumRequired(Class<T> clazz, String value, String fieldName) {
        try {
            return Enum.valueOf(clazz, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(fieldName + " inválido: " + value);
        }
    }
}
