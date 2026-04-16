package com.viana.service;

import com.viana.dto.request.AtualizarProcessoRequest;
import com.viana.dto.request.CriarMovimentacaoRequest;
import com.viana.dto.request.CriarProcessoRequest;
import com.viana.dto.request.ParteProcessoRequest;
import com.viana.dto.request.RepresentanteParteRequest;
import com.viana.dto.response.DatajudCapaResponse;
import com.viana.dto.response.DatajudMovimentacaoResponse;
import com.viana.dto.response.ProcessoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Cliente;
import com.viana.model.FonteSync;
import com.viana.model.Movimentacao;
import com.viana.model.Processo;
import com.viana.model.ProcessoEtiqueta;
import com.viana.model.ProcessoParte;
import com.viana.model.ProcessoParteRepresentante;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.OrigemMovimentacao;
import com.viana.model.enums.PoloProcessual;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.StatusIntegracao;
import com.viana.model.enums.StatusProcesso;
import com.viana.model.enums.TipoParteProcessual;
import com.viana.model.enums.TipoAcao;
import com.viana.model.enums.TipoMovimentacao;
import com.viana.model.enums.TipoNotificacao;
import com.viana.model.enums.TipoProcesso;
import com.viana.model.enums.TipoReferenciaIntegracao;
import com.viana.repository.ClienteRepository;
import com.viana.repository.FonteSyncRepository;
import com.viana.repository.MovimentacaoRepository;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.UnidadeRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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
    private final FonteSyncService fonteSyncService;
    private final FonteSyncRepository fonteSyncRepository;
    private final NotificacaoService notificacaoService;
    private final EventoJuridicoService eventoJuridicoService;
    private final ProcessoDistribuicaoService processoDistribuicaoService;

    @Value("${app.sync.datajud.stale-hours:4}")
    private long datajudStaleHours;

    @Transactional(readOnly = true)
    public Page<ProcessoResponse> listar(UUID unidadeId, UUID clienteId, String status, String tipo, String busca, String etiqueta, Pageable pageable) {
        StatusProcesso statusEnum = parseEnum(StatusProcesso.class, status);
        TipoProcesso tipoEnum = parseEnum(TipoProcesso.class, tipo);
        String buscaNorm = (busca != null && !busca.isBlank()) ? busca : "";
        String buscaNumero = normalizarBuscaNumero(busca != null && !busca.isBlank() ? busca : null);
        buscaNumero = buscaNumero != null ? buscaNumero : "";
        String etiquetaNorm = normalizarEtiquetaFiltro(etiqueta);
        etiquetaNorm = etiquetaNorm != null ? etiquetaNorm : null; // null = sem filtro de etiqueta

        return processoRepository.findAllWithFilters(
                        unidadeId,
                        clienteId,
                        statusEnum != null ? statusEnum.name() : null,
                        tipoEnum != null ? tipoEnum.name() : null,
                        etiquetaNorm,
                        buscaNorm,
                        buscaNumero,
                        pageable
                )
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<ProcessoResponse> listarRecentes(int limite) {
        return processoRepository.findRecentesDashboard().stream()
                .limit(limite)
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ProcessoResponse buscarPorId(UUID id) {
        Processo processo = findOrThrow(id);

        if (deveSincronizarMovimentacoesDatajud(processo)) {
            sincronizarMovimentacoesDatajud(processo, false);
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
            throw new BusinessException("Número do processo é obrigatório");
        }
        if (processoRepository.existsByNumero(numeroProcesso)) {
            throw new BusinessException("Já existe um processo cadastrado com esse número.");
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
        aplicarEtiquetas(processo, request.getEtiquetas());
        aplicarPartes(processo, request.getPartes());

        try {
            processo = processoRepository.save(processo);
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessException("Já existe um processo cadastrado com esse número.");
        }
        sincronizarMovimentacoesDatajud(processo, false);

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
        if (request.getEtiquetas() != null) aplicarEtiquetas(processo, request.getEtiquetas());
        if (request.getPartes() != null) aplicarPartes(processo, request.getPartes());

        if (request.getAdvogadoIds() != null) {
            validarAdvogadosObrigatorios(request.getAdvogadoIds());
            processo.getAdvogados().clear();
            processo.getAdvogados().addAll(resolverAdvogados(request.getAdvogadoIds()));
            validarRepresentantesInternos(processo);
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

    @Transactional
    public int sincronizarMovimentacoesDatajud(UUID processoId, boolean notificarResponsaveis) {
        Processo processo = findOrThrow(processoId);
        return sincronizarMovimentacoesDatajud(processo, notificarResponsaveis);
    }

    @Transactional
    public DatajudSyncResumo sincronizarProcessosAtivosDatajud(boolean notificarResponsaveis) {
        List<UUID> processosIds = processoRepository.findIdsByStatusIn(List.of(
                StatusProcesso.EM_ANDAMENTO,
                StatusProcesso.URGENTE,
                StatusProcesso.AGUARDANDO,
                StatusProcesso.SUSPENSO
        ));

        int processosAvaliados = 0;
        int processosComNovidade = 0;
        int movimentacoesNovas = 0;
        int falhas = 0;

        for (UUID processoId : processosIds) {
            processosAvaliados++;
            try {
                int novas = sincronizarMovimentacoesDatajud(processoId, notificarResponsaveis);
                movimentacoesNovas += novas;
                if (novas > 0) {
                    processosComNovidade++;
                }
            } catch (Exception ex) {
                falhas++;
            }
        }

        return new DatajudSyncResumo(processosAvaliados, processosComNovidade, movimentacoesNovas, falhas);
    }

    private boolean deveSincronizarMovimentacoesDatajud(Processo processo) {
        if (!isNumeroCnj(processo.getNumero())) {
            return false;
        }

        FonteSync fonteSync = fonteSyncRepository.findByFonteAndReferenciaTipoAndReferenciaId(
                        FonteIntegracao.DATAJUD,
                        TipoReferenciaIntegracao.PROCESSO,
                        processo.getId()
                )
                .orElse(null);

        if (fonteSync == null) {
            return true;
        }

        if (fonteSync.getStatus() == StatusIntegracao.ERRO) {
            LocalDateTime ultimoSync = fonteSync.getUltimoSyncEm();
            return ultimoSync == null || ultimoSync.isBefore(LocalDateTime.now().minus(1, ChronoUnit.HOURS));
        }

        LocalDateTime ultimoSucesso = fonteSync.getUltimoSucessoEm();
        if (ultimoSucesso == null) {
            return true;
        }

        return ultimoSucesso.isBefore(LocalDateTime.now().minus(datajudStaleHours, ChronoUnit.HOURS));
    }

    private int sincronizarMovimentacoesDatajud(Processo processo, boolean notificarResponsaveis) {
        if (!isNumeroCnj(processo.getNumero())) {
            return 0;
        }

        try {
            DatajudCapaResponse datajud = datajudClientService.buscarCapaProcesso(processo.getNumero());
            int novasMovimentacoes = importarMovimentacoesDatajud(processo, datajud.getMovimentacoes());
            fonteSyncService.registrarSucessoDatajud(processo, novasMovimentacoes, "Sincronizacao do Datajud executada");

            if (notificarResponsaveis && novasMovimentacoes > 0) {
                notificarResponsaveisSobreSyncDatajud(processo, novasMovimentacoes);
            }

            return novasMovimentacoes;
        } catch (BusinessException | ResourceNotFoundException ex) {
            fonteSyncService.registrarErroDatajud(processo, ex.getMessage());
            return 0;
        }
    }

    private int importarMovimentacoesDatajud(Processo processo, List<DatajudMovimentacaoResponse> movimentacoesDatajud) {
        if (movimentacoesDatajud == null || movimentacoesDatajud.isEmpty()) {
            return 0;
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
            return 0;
        }

        movimentacaoRepository.saveAll(novasMovimentacoes);
        eventoJuridicoService.registrarMovimentacoesDatajud(processo, novasMovimentacoes);
        novasMovimentacoes.stream()
                .map(Movimentacao::getData)
                .max(LocalDate::compareTo)
                .ifPresent(data -> atualizarUltimaMovimentacao(processo, data));
        return novasMovimentacoes.size();
    }

    private void notificarResponsaveisSobreSyncDatajud(Processo processo, int novasMovimentacoes) {
        List<Usuario> destinatarios = processoDistribuicaoService.resolveDestinatariosProcesso(processo);
        if (destinatarios.isEmpty()) {
            return;
        }

        String descricao = String.format(
                "O processo %s recebeu %d nova(s) movimentacao(oes) do Datajud.",
                processo.getNumero(),
                novasMovimentacoes
        );

        for (Usuario advogado : destinatarios) {
            notificacaoService.criarNotificacao(
                    advogado.getId(),
                    "Novas movimentacoes sincronizadas",
                    descricao,
                    TipoNotificacao.SISTEMA,
                    "inbox"
            );
        }
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
                .etiquetas(p.getEtiquetas() == null
                        ? List.of()
                        : p.getEtiquetas().stream().map(ProcessoEtiqueta::getNome).toList())
                .partes(p.getPartes() == null
                        ? List.of()
                        : p.getPartes().stream().map(this::toParteResponse).toList())
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
    private void aplicarEtiquetas(Processo processo, List<String> etiquetas) {
        processo.getEtiquetas().clear();

        if (etiquetas == null || etiquetas.isEmpty()) {
            return;
        }

        if (etiquetas.size() > 10) {
            throw new BusinessException("Um processo pode ter no maximo 10 etiquetas.");
        }

        Set<String> etiquetasNormalizadas = new HashSet<>();

        for (String etiqueta : etiquetas) {
            String etiquetaExibicao = normalizarEtiquetaExibicao(etiqueta);
            if (etiquetaExibicao == null || etiquetaExibicao.isBlank()) {
                continue;
            }

            String etiquetaFiltro = normalizarEtiquetaFiltro(etiquetaExibicao);
            if (!etiquetasNormalizadas.add(etiquetaFiltro)) {
                continue;
            }

            processo.getEtiquetas().add(ProcessoEtiqueta.builder()
                    .processo(processo)
                    .nome(etiquetaExibicao)
                    .nomeNormalizado(etiquetaFiltro)
                    .build());
        }
    }

    private String normalizarEtiquetaExibicao(String etiqueta) {
        if (etiqueta == null) {
            return null;
        }

        String trimmed = etiqueta.trim().replaceAll("\\s+", " ");
        if (trimmed.isBlank()) {
            return null;
        }

        if (trimmed.length() > 40) {
            throw new BusinessException("Cada etiqueta deve ter no maximo 40 caracteres.");
        }

        return trimmed;
    }

    private String normalizarEtiquetaFiltro(String etiqueta) {
        if (etiqueta == null) {
            return null;
        }

        String sanitized = etiqueta.trim().replaceAll("\\s+", " ");
        if (sanitized.isBlank()) {
            return null;
        }

        return Normalizer.normalize(sanitized, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase();
    }

    private String normalizarBuscaNumero(String busca) {
        if (busca == null || busca.isBlank()) {
            return null;
        }

        String clean = busca.replaceAll("\\D", "");
        return clean.isBlank() ? null : clean;
    }

    private void aplicarPartes(Processo processo, List<ParteProcessoRequest> partes) {
        processo.getPartes().clear();

        if (partes == null || partes.isEmpty()) {
            return;
        }

        if (partes.size() > 20) {
            throw new BusinessException("Um processo pode ter no maximo 20 partes estruturadas.");
        }

        for (ParteProcessoRequest parteRequest : partes) {
            if (parteRequest == null) {
                continue;
            }

            String nomeParte = normalizeTextoObrigatorio(parteRequest.getNome(), "Nome da parte");
            TipoParteProcessual tipoParte = parseEnumRequired(
                    TipoParteProcessual.class,
                    defaultIfBlank(parteRequest.getTipo(), TipoParteProcessual.NAO_IDENTIFICADO.name()),
                    "Tipo da parte"
            );
            PoloProcessual polo = parseEnumRequired(
                    PoloProcessual.class,
                    defaultIfBlank(parteRequest.getPolo(), PoloProcessual.OUTRO.name()),
                    "Polo da parte"
            );

            ProcessoParte parte = ProcessoParte.builder()
                    .processo(processo)
                    .nome(nomeParte)
                    .documento(normalizeDocumento(parteRequest.getDocumento()))
                    .tipo(tipoParte)
                    .polo(polo)
                    .principal(Boolean.TRUE.equals(parteRequest.getPrincipal()))
                    .observacao(normalizeTextoOpcional(parteRequest.getObservacao(), 500))
                    .build();

            List<RepresentanteParteRequest> representantes = parteRequest.getRepresentantes();
            if (representantes != null) {
                if (representantes.size() > 10) {
                    throw new BusinessException("Cada parte pode ter no maximo 10 representantes.");
                }

                for (RepresentanteParteRequest representanteRequest : representantes) {
                    if (representanteRequest == null) {
                        continue;
                    }

                    String nomeRepresentante = normalizeTextoObrigatorio(
                            representanteRequest.getNome(),
                            "Nome do representante da parte"
                    );

                    Usuario usuarioInterno = null;
                    if (representanteRequest.getUsuarioInternoId() != null) {
                        usuarioInterno = usuarioRepository.findById(representanteRequest.getUsuarioInternoId())
                                .orElseThrow(() -> new ResourceNotFoundException("Usuario interno do representante nao encontrado"));
                        if (!processo.getAdvogados().contains(usuarioInterno)) {
                            throw new BusinessException("O usuario interno do representante precisa estar entre os advogados responsaveis do processo.");
                        }
                    }

                    parte.getRepresentantes().add(ProcessoParteRepresentante.builder()
                            .parte(parte)
                            .nome(nomeRepresentante)
                            .cpf(normalizeCpf(representanteRequest.getCpf()))
                            .oab(normalizeOab(representanteRequest.getOab()))
                            .usuarioInterno(usuarioInterno)
                            .principal(Boolean.TRUE.equals(representanteRequest.getPrincipal()))
                            .build());
                }
            }

            processo.getPartes().add(parte);
        }
    }

    private void validarRepresentantesInternos(Processo processo) {
        if (processo.getPartes() == null || processo.getPartes().isEmpty()) {
            return;
        }

        for (ProcessoParte parte : processo.getPartes()) {
            if (parte.getRepresentantes() == null) {
                continue;
            }

            for (ProcessoParteRepresentante representante : parte.getRepresentantes()) {
                Usuario usuarioInterno = representante.getUsuarioInterno();
                if (usuarioInterno != null && !processo.getAdvogados().contains(usuarioInterno)) {
                    throw new BusinessException("Nao e possivel remover dos advogados responsaveis um usuario vinculado como representante interno de parte.");
                }
            }
        }
    }

    private ProcessoResponse.ParteInfo toParteResponse(ProcessoParte parte) {
        return ProcessoResponse.ParteInfo.builder()
                .id(parte.getId() != null ? parte.getId().toString() : null)
                .nome(parte.getNome())
                .documento(parte.getDocumento())
                .tipo(parte.getTipo() != null ? parte.getTipo().name() : null)
                .polo(parte.getPolo() != null ? parte.getPolo().name() : null)
                .principal(parte.getPrincipal())
                .observacao(parte.getObservacao())
                .representantes(parte.getRepresentantes() == null
                        ? List.of()
                        : parte.getRepresentantes().stream().map(this::toRepresentanteResponse).toList())
                .build();
    }

    private ProcessoResponse.RepresentanteInfo toRepresentanteResponse(ProcessoParteRepresentante representante) {
        return ProcessoResponse.RepresentanteInfo.builder()
                .id(representante.getId() != null ? representante.getId().toString() : null)
                .nome(representante.getNome())
                .cpf(representante.getCpf())
                .oab(representante.getOab())
                .principal(representante.getPrincipal())
                .usuarioInternoId(representante.getUsuarioInterno() != null ? representante.getUsuarioInterno().getId().toString() : null)
                .usuarioInternoNome(representante.getUsuarioInterno() != null ? representante.getUsuarioInterno().getNome() : null)
                .build();
    }

    private String normalizeTextoObrigatorio(String value, String fieldName) {
        String normalized = normalizeTextoOpcional(value, 200);
        if (normalized == null) {
            throw new BusinessException(fieldName + " e obrigatorio.");
        }
        return normalized;
    }

    private String normalizeTextoOpcional(String value, int maxLength) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim().replaceAll("\\s+", " ");
        if (trimmed.isBlank()) {
            return null;
        }
        if (trimmed.length() > maxLength) {
            throw new BusinessException("Valor excede o limite de " + maxLength + " caracteres.");
        }
        return trimmed;
    }

    private String normalizeDocumento(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String clean = value.replaceAll("\\D", "");
        return clean.isBlank() ? null : clean;
    }

    private String normalizeCpf(String value) {
        String clean = normalizeDocumento(value);
        if (clean == null) {
            return null;
        }
        if (clean.length() != 11) {
            throw new BusinessException("CPF do representante deve conter 11 digitos.");
        }
        return clean;
    }

    private String normalizeOab(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase();
        if (normalized.length() > 20) {
            throw new BusinessException("OAB do representante deve ter no maximo 20 caracteres.");
        }
        return normalized;
    }

    private String defaultIfBlank(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }

    public record DatajudSyncResumo(
            int processosAvaliados,
            int processosComNovidade,
            int movimentacoesNovas,
            int falhas
    ) {
    }
}
