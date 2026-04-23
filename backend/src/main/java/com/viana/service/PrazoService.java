package com.viana.service;

import com.viana.dto.request.AtualizarPrazoRequest;
import com.viana.dto.request.CriarPrazoEventoRequest;
import com.viana.dto.request.CriarPrazoRequest;
import com.viana.dto.response.PrazoDetalheResponse;
import com.viana.dto.response.PrazoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Atendimento;
import com.viana.model.EventoJuridico;
import com.viana.model.Prazo;
import com.viana.model.PrazoComentario;
import com.viana.model.Processo;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.EtapaPrazo;
import com.viana.model.enums.ModalidadeAtividade;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.PrioridadePrazo;
import com.viana.model.enums.TipoEventoJuridico;
import com.viana.model.enums.StatusEventoJuridico;
import com.viana.model.enums.TipoAcao;
import com.viana.model.enums.TipoNotificacao;
import com.viana.model.enums.TipoPrazo;
import com.viana.model.enums.TipoUnidadeAlertaPrazo;
import com.viana.model.enums.TipoVinculoPrazo;
import com.viana.model.enums.UserRole;
import com.viana.repository.AtendimentoRepository;
import com.viana.repository.EventoJuridicoRepository;
import com.viana.repository.PrazoComentarioRepository;
import com.viana.repository.PrazoRepository;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.UnidadeRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PrazoService {

    private static final String REFERENCIA_TIPO_PRAZO = "PRAZO";

    private final PrazoRepository prazoRepository;
    private final ProcessoRepository processoRepository;
    private final AtendimentoRepository atendimentoRepository;
    private final EventoJuridicoRepository eventoJuridicoRepository;
    private final PrazoComentarioRepository prazoComentarioRepository;
    private final UsuarioRepository usuarioRepository;
    private final UnidadeRepository unidadeRepository;
    private final LogAuditoriaService logAuditoriaService;
    private final NotificacaoService notificacaoService;

    @Transactional(readOnly = true)
    public List<PrazoResponse> getCalendario(UUID usuarioLogadoId, UUID unidadeId, LocalDate inicio, LocalDate fim, UUID responsavelId) {
        List<Prazo> prazos = prazoRepository.findCalendario(inicio, fim, usuarioLogadoId, unidadeId, responsavelId);
        return prazos.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<PrazoResponse> listarProximos(UUID advogadoId, int limit) {
        LocalDate hoje = LocalDate.now();
        return prazoRepository.findTop5ByAdvogadoIdAndConcluidoFalseAndDataGreaterThanEqualOrderByDataAsc(advogadoId, hoje)
                .stream()
                .map(this::toResponse)
                .limit(limit)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<PrazoResponse> listar(
            UUID unidadeId,
            String tipo,
            Boolean concluido,
            UUID usuarioLogadoId,
            UUID responsavelId,
            Pageable pageable
    ) {
        TipoPrazo tipoEnum = parseEnum(TipoPrazo.class, tipo);
        return prazoRepository.findAllWithFilters(unidadeId, tipoEnum, concluido, usuarioLogadoId, responsavelId, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public PrazoResponse buscarPorId(UUID id, UUID usuarioLogadoId) {
        Prazo prazo = prazoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prazo nao encontrado"));
        Usuario usuarioLogado = findUsuarioOrThrow(usuarioLogadoId);

        validarPermissaoVisualizacaoPrazo(prazo, usuarioLogado, "Voce nao tem permissao para visualizar este prazo.");
        return toResponse(prazo);
    }

    @Transactional(readOnly = true)
    public PrazoDetalheResponse buscarDetalhePorId(UUID id, UUID usuarioLogadoId) {
        Prazo prazo = prazoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prazo nao encontrado"));
        Usuario usuarioLogado = findUsuarioOrThrow(usuarioLogadoId);

        validarPermissaoVisualizacaoPrazo(prazo, usuarioLogado, "Voce nao tem permissao para visualizar este prazo.");

        List<PrazoComentario> comentarios = prazoComentarioRepository.findByPrazoIdOrderByCriadoEmDesc(prazo.getId());
        List<LogAuditoriaService.LogAuditoriaResponse> historicoLogs =
                logAuditoriaService.listarPorReferencia(REFERENCIA_TIPO_PRAZO, prazo.getId());

        String criadoPorNome = historicoLogs.stream()
                .filter(log -> TipoAcao.CRIOU.name().equals(log.getAcao()))
                .reduce((first, second) -> second)
                .map(LogAuditoriaService.LogAuditoriaResponse::getUsuarioNome)
                .orElse(null);

        List<PrazoDetalheResponse.HistoricoInfo> historico = historicoLogs.stream()
                .map(this::toHistoricoInfo)
                .toList();

        if (historico.isEmpty()) {
            historico = List.of(PrazoDetalheResponse.HistoricoInfo.builder()
                    .id("sintetico-criacao-" + prazo.getId())
                    .descricao("Prazo registado no sistema.")
                    .acao(TipoAcao.CRIOU.name())
                    .usuarioNome(criadoPorNome)
                    .dataHora(prazo.getCriadoEm() != null ? prazo.getCriadoEm().toString() : null)
                    .build());
        }

        Processo processo = prazo.getProcesso();
        EventoJuridico eventoJuridico = prazo.getEventoJuridico();

        return PrazoDetalheResponse.builder()
                .prazo(toResponse(prazo))
                .criadoEm(prazo.getCriadoEm() != null ? prazo.getCriadoEm().toString() : null)
                .criadoPorNome(criadoPorNome)
                .unidadeNome(prazo.getUnidade() != null ? prazo.getUnidade().getNome() : null)
                .processo(processo == null ? null : PrazoDetalheResponse.ProcessoInfo.builder()
                        .id(processo.getId().toString())
                        .numero(processo.getNumero())
                        .clienteNome(processo.getCliente() != null ? processo.getCliente().getNome() : null)
                        .tribunal(processo.getTribunal())
                        .vara(processo.getVara())
                        .build())
                .eventoJuridico(toEventoInfo(eventoJuridico))
                .comentarios(comentarios.stream().map(this::toComentarioInfo).toList())
                .historico(historico)
                .build();
    }

    @Transactional
    public PrazoDetalheResponse.ComentarioInfo adicionarComentario(UUID id, String conteudo, UUID usuarioLogadoId) {
        Prazo prazo = prazoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prazo nao encontrado"));
        Usuario usuarioLogado = findUsuarioOrThrow(usuarioLogadoId);

        validarPermissaoVisualizacaoPrazo(prazo, usuarioLogado, "Voce nao tem permissao para comentar neste prazo.");

        String conteudoNormalizado = normalizeTextoOpcional(conteudo, 2000);
        if (conteudoNormalizado == null) {
            throw new BusinessException("Comentario e obrigatorio.");
        }

        PrazoComentario comentario = PrazoComentario.builder()
                .prazo(prazo)
                .usuario(usuarioLogado)
                .conteudo(conteudoNormalizado)
                .build();

        PrazoComentario salvo = prazoComentarioRepository.save(comentario);

        try {
            logAuditoriaService.registrar(
                    usuarioLogadoId,
                    TipoAcao.EDITOU,
                    ModuloLog.PRAZOS,
                    "Comentario interno adicionado ao prazo: " + prazo.getTitulo(),
                    REFERENCIA_TIPO_PRAZO,
                    prazo.getId()
            );
        } catch (Exception ignored) {
        }

        return toComentarioInfo(salvo);
    }

    @Transactional(readOnly = true)
    public long contarAtrasados(UUID advogadoId) {
        return prazoRepository.countByAdvogadoIdAndConcluidoFalseAndDataLessThan(advogadoId, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public long contarVencendoHoje(UUID advogadoId) {
        return prazoRepository.countByAdvogadoIdAndConcluidoFalseAndData(advogadoId, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public long contarTarefasAbertas(UUID advogadoId) {
        return prazoRepository.countByAdvogadoIdAndTipoAndConcluidoFalse(advogadoId, TipoPrazo.TAREFA_INTERNA);
    }

    @Transactional
    public PrazoResponse criar(CriarPrazoRequest request, UUID usuarioLogadoId) {
        Usuario usuarioLogado = findUsuarioOrThrow(usuarioLogadoId);
        Prazo prazo = criarPrazoInterno(
                request.getTitulo(),
                request.getData(),
                request.getHora(),
                request.getDataFim(),
                request.getHoraFim(),
                request.getDiaInteiro(),
                request.getTipo(),
                request.getPrioridade(),
                request.getEtapa(),
                request.getEtiqueta(),
                request.getDescricao(),
                request.getLocal(),
                request.getModalidade(),
                request.getSala(),
                request.getAlertaValor(),
                request.getAlertaUnidade(),
                request.getVinculoTipo(),
                request.getVinculoReferenciaId(),
                request.getQuadroKanban(),
                request.getProcessoId(),
                request.getUnidadeId(),
                request.getAdvogadoId(),
                request.getParticipantesIds(),
                null,
                usuarioLogado
        );
        return toResponse(prazo);
    }

    @Transactional
    public PrazoResponse criarAPartirDoEvento(UUID eventoId, CriarPrazoEventoRequest request, UUID usuarioLogadoId) {
        EventoJuridico evento = eventoJuridicoRepository.findById(eventoId)
                .orElseThrow(() -> new ResourceNotFoundException("Evento juridico nao encontrado"));
        Usuario usuarioLogado = findUsuarioOrThrow(usuarioLogadoId);

        UUID processoId = evento.getProcesso() != null ? evento.getProcesso().getId() : null;
        UUID unidadeId = evento.getProcesso() != null && evento.getProcesso().getUnidade() != null
                ? evento.getProcesso().getUnidade().getId()
                : null;
        UUID advogadoId = request.getAdvogadoId() != null
                ? request.getAdvogadoId()
                : evento.getResponsavel() != null
                ? evento.getResponsavel().getId()
                : usuarioLogado.getId();

        String descricao = request.getDescricao();
        if ((descricao == null || descricao.isBlank()) && evento.getDescricao() != null) {
            descricao = evento.getDescricao();
        }

        Prazo prazo = criarPrazoInterno(
                request.getTitulo(),
                request.getData(),
                request.getHora(),
                null,
                null,
                false,
                request.getTipo(),
                request.getPrioridade(),
                request.getEtapa(),
                null,
                descricao,
                null,
                null,
                null,
                null,
                null,
                processoId != null ? TipoVinculoPrazo.PROCESSO.name() : null,
                processoId,
                "Operacional",
                processoId,
                unidadeId,
                advogadoId,
                null,
                evento,
                usuarioLogado
        );

        if (evento.getStatus() == StatusEventoJuridico.NOVO) {
            evento.setStatus(StatusEventoJuridico.EM_TRIAGEM);
            eventoJuridicoRepository.save(evento);
        }

        return toResponse(prazo);
    }

    @Transactional
    public PrazoResponse atualizar(UUID id, AtualizarPrazoRequest request, UUID usuarioLogadoId) {
        Prazo prazo = prazoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prazo nao encontrado"));
        Usuario usuarioLogado = findUsuarioOrThrow(usuarioLogadoId);

        validarPermissaoGestaoPrazo(prazo, usuarioLogado, "Voce nao tem permissao para editar prazos de outros usuarios.");

        Processo processoAnterior = prazo.getProcesso();

        if (request.getTitulo() != null) prazo.setTitulo(normalizeTextoObrigatorio(request.getTitulo(), "Titulo"));
        if (request.getData() != null) prazo.setData(request.getData());
        if (request.getHora() != null) prazo.setHora(request.getHora());
        if (request.getDataFim() != null) prazo.setDataFim(request.getDataFim());
        if (request.getHoraFim() != null) prazo.setHoraFim(request.getHoraFim());
        if (request.getDiaInteiro() != null) prazo.setDiaInteiro(request.getDiaInteiro());
        if (request.getDescricao() != null) prazo.setDescricao(normalizeTextoOpcional(request.getDescricao(), 4000));
        if (request.getEtiqueta() != null) prazo.setEtiqueta(normalizeTextoOpcional(request.getEtiqueta(), 80));
        if (request.getLocal() != null) prazo.setLocal(normalizeTextoOpcional(request.getLocal(), 255));
        if (request.getSala() != null) prazo.setSala(normalizeTextoOpcional(request.getSala(), 120));
        if (request.getAlertaValor() != null) prazo.setAlertaValor(request.getAlertaValor());
        if (request.getQuadroKanban() != null) prazo.setQuadroKanban(resolveQuadroKanban(request.getQuadroKanban()));
        if (request.getModalidade() != null) {
            prazo.setModalidade(parseOptionalEnumRequired(ModalidadeAtividade.class, request.getModalidade(), "Modalidade"));
        }
        if (request.getAlertaUnidade() != null) {
            prazo.setAlertaUnidade(parseOptionalEnumRequired(TipoUnidadeAlertaPrazo.class, request.getAlertaUnidade(), "Unidade de alerta"));
        }
        if (request.getVinculoTipo() != null || request.getVinculoReferenciaId() != null) {
            aplicarVinculoAtividade(prazo, request.getVinculoTipo(), request.getVinculoReferenciaId());
        }

        if (request.getTipo() != null) {
            prazo.setTipo(parseEnumRequired(TipoPrazo.class, request.getTipo(), "Tipo"));
        }
        if (request.getPrioridade() != null) {
            prazo.setPrioridade(parseEnumRequired(PrioridadePrazo.class, request.getPrioridade(), "Prioridade"));
        }
        if (request.getEtapa() != null) {
            prazo.setEtapa(parseEnumRequired(EtapaPrazo.class, request.getEtapa(), "Etapa"));
            prazo.setConcluido(prazo.getEtapa() == EtapaPrazo.CONCLUIDO);
        }

        if (request.getProcessoId() != null) {
            Processo processo = processoRepository.findById(request.getProcessoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Processo nao encontrado"));
            prazo.setProcesso(processo);
            prazo.setVinculoTipo(TipoVinculoPrazo.PROCESSO);
            prazo.setVinculoReferenciaId(processo.getId());
        }
        if (request.getUnidadeId() != null) {
            Unidade unidade = unidadeRepository.findById(request.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade nao encontrada"));
            prazo.setUnidade(unidade);
        }
        if (request.getAdvogadoId() != null) {
            prazo.setAdvogado(resolveResponsavelPermitido(request.getAdvogadoId(), usuarioLogado));
        }
        if (request.getParticipantesIds() != null) {
            prazo.setParticipantes(resolveParticipantes(request.getParticipantesIds(), prazo.getAdvogado() != null ? prazo.getAdvogado().getId() : null));
        }

        normalizarPeriodo(prazo);
        atualizarMarcoConclusao(prazo);
        validarConfiguracaoAtividade(prazo);

        Prazo salvo = prazoRepository.save(prazo);
        atualizarProximoPrazoProcesso(processoAnterior);
        atualizarProximoPrazoProcesso(salvo.getProcesso());

        try {
            logAuditoriaService.registrar(
                    usuarioLogadoId,
                    TipoAcao.EDITOU,
                    ModuloLog.PRAZOS,
                    "Prazo atualizado: " + salvo.getTitulo(),
                    REFERENCIA_TIPO_PRAZO,
                    salvo.getId()
            );
        } catch (Exception ignored) {
        }

        return toResponse(salvo);
    }

    @Transactional
    public PrazoResponse marcarConcluido(UUID id, UUID usuarioLogadoId) {
        Prazo prazo = prazoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prazo nao encontrado"));
        Usuario usuarioLogado = findUsuarioOrThrow(usuarioLogadoId);

        validarPermissaoFluxoPrazo(prazo, usuarioLogado, "Voce nao tem permissao para alterar prazos de outros usuarios.");

        prazo.setConcluido(!prazo.getConcluido());
        prazo.setEtapa(prazo.getConcluido() ? EtapaPrazo.CONCLUIDO : EtapaPrazo.A_FAZER);
        atualizarMarcoConclusao(prazo);
        Prazo salvo = prazoRepository.save(prazo);
        atualizarProximoPrazoProcesso(salvo.getProcesso());

        try {
            logAuditoriaService.registrar(
                    usuarioLogadoId,
                    TipoAcao.EDITOU,
                    ModuloLog.PRAZOS,
                    (salvo.getConcluido() ? "Prazo concluido: " : "Prazo reaberto: ") + salvo.getTitulo(),
                    REFERENCIA_TIPO_PRAZO,
                    salvo.getId()
            );
        } catch (Exception ignored) {
        }

        return toResponse(salvo);
    }

    @Transactional
    public PrazoResponse atualizarEtapa(UUID id, String etapa, UUID usuarioLogadoId) {
        return atualizarEtapaKanban(id, etapa, usuarioLogadoId);
    }

    @Transactional
    public PrazoResponse atualizarEtapaKanban(UUID id, String etapa, UUID usuarioLogadoId) {
        Prazo prazo = prazoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prazo nao encontrado"));
        Usuario usuarioLogado = findUsuarioOrThrow(usuarioLogadoId);

        validarPermissaoFluxoPrazo(prazo, usuarioLogado, "Voce nao tem permissao para alterar tarefas de outros usuarios.");

        EtapaPrazo etapaPrazo = parseEnumRequired(EtapaPrazo.class, etapa, "Etapa");
        prazo.setEtapa(etapaPrazo);
        prazo.setConcluido(etapaPrazo == EtapaPrazo.CONCLUIDO);
        atualizarMarcoConclusao(prazo);

        Prazo salvo = prazoRepository.save(prazo);
        atualizarProximoPrazoProcesso(salvo.getProcesso());

        try {
            logAuditoriaService.registrar(
                    usuarioLogadoId,
                    TipoAcao.EDITOU,
                    ModuloLog.PRAZOS,
                    "Prazo movido no Kanban para " + etapaPrazo.name() + ": " + salvo.getTitulo(),
                    REFERENCIA_TIPO_PRAZO,
                    salvo.getId()
            );
        } catch (Exception ignored) {
        }

        return toResponse(salvo);
    }

    @Transactional
    public void gerarTarefaTriagemAutomatica(EventoJuridico evento) {
        if (evento == null || evento.getId() == null) {
            return;
        }
        if (evento.getTipo() == TipoEventoJuridico.MOVIMENTACAO) {
            return;
        }
        if (prazoRepository.existsByEventoJuridicoIdAndTipo(evento.getId(), TipoPrazo.TAREFA_INTERNA)) {
            return;
        }

        Usuario responsavel = resolveResponsavelEvento(evento);
        if (responsavel == null) {
            return;
        }

        Processo processo = evento.getProcesso();
        Unidade unidade = processo != null ? processo.getUnidade() : null;

        Prazo prazo = Prazo.builder()
                .titulo(buildTituloTriagem(evento, processo))
                .processo(processo)
                .eventoJuridico(evento)
                .data(resolveDataTriagem(evento))
                .tipo(TipoPrazo.TAREFA_INTERNA)
                .prioridade(resolvePrioridadeTriagem(evento))
                .etapa(EtapaPrazo.A_FAZER)
                .concluido(false)
                .advogado(responsavel)
                .descricao(buildDescricaoTriagem(evento))
                .unidade(unidade)
                .build();

        prazoRepository.save(prazo);
        atualizarProximoPrazoProcesso(processo);
    }

    @Transactional
    public void excluir(UUID id, UUID usuarioLogadoId) {
        Prazo prazo = prazoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prazo nao encontrado"));
        Usuario usuarioLogado = findUsuarioOrThrow(usuarioLogadoId);

        validarPermissaoGestaoPrazo(prazo, usuarioLogado, "Voce nao tem permissao para excluir prazos de outros usuarios.");

        try {
            logAuditoriaService.registrar(
                    usuarioLogadoId,
                    TipoAcao.EXCLUIU,
                    ModuloLog.PRAZOS,
                    "Prazo excluido: " + prazo.getTitulo(),
                    REFERENCIA_TIPO_PRAZO,
                    prazo.getId()
            );
        } catch (Exception ignored) {
        }

        Processo processo = prazo.getProcesso();
        prazoRepository.delete(prazo);
        atualizarProximoPrazoProcesso(processo);
    }

    public PrazoResponse toResponse(Prazo prazo) {
        return PrazoResponse.builder()
                .id(prazo.getId().toString())
                .titulo(prazo.getTitulo())
                .processoId(prazo.getProcesso() != null ? prazo.getProcesso().getId().toString() : null)
                .eventoJuridicoId(prazo.getEventoJuridico() != null ? prazo.getEventoJuridico().getId().toString() : null)
                .processoNumero(prazo.getProcesso() != null ? prazo.getProcesso().getNumero() : null)
                .clienteNome(prazo.getProcesso() != null && prazo.getProcesso().getCliente() != null ? prazo.getProcesso().getCliente().getNome() : null)
                .data(prazo.getData().toString())
                .hora(prazo.getHora() != null ? prazo.getHora().toString() : null)
                .dataFim(prazo.getDataFim() != null ? prazo.getDataFim().toString() : null)
                .horaFim(prazo.getHoraFim() != null ? prazo.getHoraFim().toString() : null)
                .diaInteiro(Boolean.TRUE.equals(prazo.getDiaInteiro()))
                .tipo(prazo.getTipo().name().toLowerCase())
                .prioridade(prazo.getPrioridade().name().toLowerCase())
                .etapa(prazo.getEtapa() != null ? prazo.getEtapa().name().toLowerCase() : null)
                .concluido(Boolean.TRUE.equals(prazo.getConcluido()))
                .advogadoId(prazo.getAdvogado() != null ? prazo.getAdvogado().getId().toString() : null)
                .advogadoNome(prazo.getAdvogado() != null ? prazo.getAdvogado().getNome() : null)
                .participantes(
                        prazo.getParticipantes() == null ? List.of() : prazo.getParticipantes().stream()
                                .map(participante -> PrazoResponse.ParticipanteInfo.builder()
                                        .id(participante.getId().toString())
                                        .nome(participante.getNome())
                                        .build())
                                .toList()
                )
                .etiqueta(prazo.getEtiqueta())
                .descricao(prazo.getDescricao())
                .local(prazo.getLocal())
                .modalidade(prazo.getModalidade() != null ? prazo.getModalidade().name().toLowerCase() : null)
                .sala(prazo.getSala())
                .alertaValor(prazo.getAlertaValor())
                .alertaUnidade(prazo.getAlertaUnidade() != null ? prazo.getAlertaUnidade().name().toLowerCase() : null)
                .vinculoTipo(prazo.getVinculoTipo() != null ? prazo.getVinculoTipo().name().toLowerCase() : null)
                .vinculoReferenciaId(prazo.getVinculoReferenciaId() != null ? prazo.getVinculoReferenciaId().toString() : null)
                .quadroKanban(prazo.getQuadroKanban())
                .unidadeId(prazo.getUnidade() != null ? prazo.getUnidade().getId().toString() : null)
                .build();
    }

    private PrazoDetalheResponse.EventoJuridicoInfo toEventoInfo(EventoJuridico eventoJuridico) {
        if (eventoJuridico == null) {
            return null;
        }

        return PrazoDetalheResponse.EventoJuridicoInfo.builder()
                .id(eventoJuridico.getId().toString())
                .fonte(eventoJuridico.getFonte() != null ? eventoJuridico.getFonte().name() : null)
                .tipo(eventoJuridico.getTipo() != null ? eventoJuridico.getTipo().name() : null)
                .status(eventoJuridico.getStatus() != null ? eventoJuridico.getStatus().name() : null)
                .titulo(eventoJuridico.getTitulo())
                .descricao(eventoJuridico.getDescricao())
                .orgaoJulgador(eventoJuridico.getOrgaoJulgador())
                .referenciaExterna(eventoJuridico.getReferenciaExterna())
                .linkOficial(eventoJuridico.getLinkOficial())
                .destinatario(eventoJuridico.getDestinatario())
                .parteRelacionada(eventoJuridico.getParteRelacionada())
                .dataEvento(eventoJuridico.getDataEvento() != null ? eventoJuridico.getDataEvento().toString() : null)
                .responsavelId(eventoJuridico.getResponsavel() != null ? eventoJuridico.getResponsavel().getId().toString() : null)
                .responsavelNome(eventoJuridico.getResponsavel() != null ? eventoJuridico.getResponsavel().getNome() : null)
                .criadoEm(eventoJuridico.getCriadoEm() != null ? eventoJuridico.getCriadoEm().toString() : null)
                .build();
    }

    private PrazoDetalheResponse.ComentarioInfo toComentarioInfo(PrazoComentario comentario) {
        return PrazoDetalheResponse.ComentarioInfo.builder()
                .id(comentario.getId().toString())
                .conteudo(comentario.getConteudo())
                .criadoEm(comentario.getCriadoEm() != null ? comentario.getCriadoEm().toString() : null)
                .autorId(comentario.getUsuario() != null ? comentario.getUsuario().getId().toString() : null)
                .autorNome(comentario.getUsuario() != null ? comentario.getUsuario().getNome() : null)
                .build();
    }

    private PrazoDetalheResponse.HistoricoInfo toHistoricoInfo(LogAuditoriaService.LogAuditoriaResponse log) {
        return PrazoDetalheResponse.HistoricoInfo.builder()
                .id(log.getId())
                .descricao(log.getDescricao())
                .acao(log.getAcao())
                .usuarioNome(log.getUsuarioNome())
                .dataHora(log.getDataHora())
                .build();
    }

    private Prazo criarPrazoInterno(
            String titulo,
            LocalDate data,
            LocalTime hora,
            LocalDate dataFim,
            LocalTime horaFim,
            Boolean diaInteiro,
            String tipo,
            String prioridade,
            String etapa,
            String etiqueta,
            String descricao,
            String local,
            String modalidade,
            String sala,
            Integer alertaValor,
            String alertaUnidade,
            String vinculoTipo,
            UUID vinculoReferenciaId,
            String quadroKanban,
            UUID processoId,
            UUID unidadeId,
            UUID advogadoId,
            List<UUID> participantesIds,
            EventoJuridico eventoJuridico,
            Usuario usuarioLogado
    ) {
        TipoPrazo tipoEnum = parseEnumRequired(TipoPrazo.class, tipo, "Tipo");
        PrioridadePrazo prioridadeEnum = parseEnumRequired(PrioridadePrazo.class, prioridade, "Prioridade");
        EtapaPrazo etapaEnum = parseEnum(EtapaPrazo.class, etapa);
        if (etapaEnum == null) {
            etapaEnum = EtapaPrazo.A_FAZER;
        }

        Processo processo = null;
        if (processoId != null) {
            processo = processoRepository.findById(processoId)
                    .orElseThrow(() -> new ResourceNotFoundException("Processo nao encontrado"));
        }

        Usuario advogado = resolveResponsavelPermitido(advogadoId, usuarioLogado);

        Unidade unidade = null;
        if (unidadeId != null) {
            unidade = unidadeRepository.findById(unidadeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade nao encontrada"));
        }

        Prazo prazo = Prazo.builder()
                .titulo(normalizeTextoObrigatorio(titulo, "Titulo"))
                .processo(processo)
                .eventoJuridico(eventoJuridico)
                .data(data)
                .hora(hora)
                .dataFim(dataFim)
                .horaFim(horaFim)
                .diaInteiro(Boolean.TRUE.equals(diaInteiro))
                .tipo(tipoEnum)
                .prioridade(prioridadeEnum)
                .etapa(etapaEnum)
                .concluido(etapaEnum == EtapaPrazo.CONCLUIDO)
                .advogado(advogado)
                .participantes(resolveParticipantes(participantesIds, advogado.getId()))
                .etiqueta(normalizeTextoOpcional(etiqueta, 80))
                .descricao(normalizeTextoOpcional(descricao, 4000))
                .local(normalizeTextoOpcional(local, 255))
                .modalidade(parseEnum(ModalidadeAtividade.class, modalidade))
                .sala(normalizeTextoOpcional(sala, 120))
                .alertaValor(alertaValor)
                .alertaUnidade(parseEnum(TipoUnidadeAlertaPrazo.class, alertaUnidade))
                .quadroKanban(resolveQuadroKanban(quadroKanban))
                .unidade(unidade)
                .build();

        aplicarVinculoAtividade(prazo, vinculoTipo, vinculoReferenciaId);
        if (processo != null) {
            prazo.setVinculoTipo(TipoVinculoPrazo.PROCESSO);
            prazo.setVinculoReferenciaId(processo.getId());
        }

        normalizarPeriodo(prazo);
        atualizarMarcoConclusao(prazo);
        validarConfiguracaoAtividade(prazo);

        Prazo salvo = prazoRepository.save(prazo);
        atualizarProximoPrazoProcesso(salvo.getProcesso());

        try {
            logAuditoriaService.registrar(
                    usuarioLogado.getId(),
                    TipoAcao.CRIOU,
                    ModuloLog.PRAZOS,
                    "Prazo criado: " + titulo + " para " + data,
                    REFERENCIA_TIPO_PRAZO,
                    salvo.getId()
            );
            notificacaoService.criarNotificacao(
                    advogado.getId(),
                    "Novo Prazo Registrado",
                    "Foi registrado um novo prazo para o dia " + data,
                    TipoNotificacao.PRAZO,
                    "prazos"
            );
            for (Usuario participante : salvo.getParticipantes()) {
                notificacaoService.criarNotificacao(
                        participante.getId(),
                        "Nova atividade partilhada",
                        "Voce foi adicionado(a) como participante em \"" + salvo.getTitulo() + "\".",
                        TipoNotificacao.PRAZO,
                        "agenda-notas"
                );
            }
        } catch (Exception ignored) {
        }

        return salvo;
    }

    private Usuario resolveResponsavelPermitido(UUID advogadoId, Usuario usuarioLogado) {
        UUID responsavelId = advogadoId != null ? advogadoId : usuarioLogado.getId();
        if (!isAdministrador(usuarioLogado) && !responsavelId.equals(usuarioLogado.getId())) {
            throw new BusinessException("Apenas administradores podem atribuir atividades a outro responsavel.");
        }

        Usuario advogado = usuarioRepository.findById(responsavelId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario responsavel nao encontrado"));
        validarResponsavelAtivo(advogado);
        return advogado;
    }

    private void validarPermissaoGestaoPrazo(Prazo prazo, Usuario usuarioLogado, String mensagemErro) {
        if (isAdministrador(usuarioLogado)) {
            return;
        }

        if (!isResponsavelDoPrazo(prazo, usuarioLogado.getId())) {
            throw new BusinessException(mensagemErro);
        }
    }

    private void validarPermissaoFluxoPrazo(Prazo prazo, Usuario usuarioLogado, String mensagemErro) {
        if (isAdministrador(usuarioLogado)) {
            return;
        }

        if (isResponsavelDoPrazo(prazo, usuarioLogado.getId()) || isParticipanteDoPrazo(prazo, usuarioLogado.getId())) {
            return;
        }

        throw new BusinessException(mensagemErro);
    }

    private void validarPermissaoVisualizacaoPrazo(Prazo prazo, Usuario usuarioLogado, String mensagemErro) {
        validarPermissaoFluxoPrazo(prazo, usuarioLogado, mensagemErro);
    }

    private boolean isResponsavelDoPrazo(Prazo prazo, UUID usuarioId) {
        return prazo.getAdvogado() != null
                && usuarioId != null
                && prazo.getAdvogado().getId().equals(usuarioId);
    }

    private boolean isParticipanteDoPrazo(Prazo prazo, UUID usuarioId) {
        if (usuarioId == null || prazo.getParticipantes() == null || prazo.getParticipantes().isEmpty()) {
            return false;
        }

        return prazo.getParticipantes().stream()
                .anyMatch(participante -> usuarioId.equals(participante.getId()));
    }

    private boolean isAdministrador(Usuario usuario) {
        return usuario != null && usuario.getPapel() == UserRole.ADMINISTRADOR;
    }

    private void validarResponsavelAtivo(Usuario usuario) {
        if (!Boolean.TRUE.equals(usuario.getAtivo())) {
            throw new BusinessException("O responsavel selecionado esta inativo.");
        }
    }

    private Usuario findUsuarioOrThrow(UUID usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario logado nao encontrado"));
    }

    private Set<Usuario> resolveParticipantes(List<UUID> participantesIds, UUID advogadoResponsavelId) {
        if (participantesIds == null || participantesIds.isEmpty()) {
            return new LinkedHashSet<>();
        }

        List<UUID> ids = participantesIds.stream()
                .filter(id -> id != null && !id.equals(advogadoResponsavelId))
                .distinct()
                .toList();

        if (ids.isEmpty()) {
            return new LinkedHashSet<>();
        }

        List<Usuario> participantes = usuarioRepository.findAllById(ids);
        if (participantes.size() != ids.size()) {
            throw new ResourceNotFoundException("Um ou mais participantes nao foram encontrados");
        }

        return new LinkedHashSet<>(participantes);
    }

    private void aplicarVinculoAtividade(Prazo prazo, String vinculoTipo, UUID vinculoReferenciaId) {
        TipoVinculoPrazo tipo = parseEnum(TipoVinculoPrazo.class, vinculoTipo);
        if (tipo == null && vinculoTipo != null && !vinculoTipo.isBlank()) {
            throw new BusinessException("Tipo de vinculo invalido: " + vinculoTipo);
        }

        if (tipo == null && vinculoReferenciaId == null) {
            prazo.setVinculoTipo(null);
            prazo.setVinculoReferenciaId(null);
            return;
        }

        if (tipo == null || vinculoReferenciaId == null) {
            throw new BusinessException("Tipo de vinculo e referencia devem ser informados em conjunto.");
        }

        if (tipo == TipoVinculoPrazo.PROCESSO) {
            Processo processoVinculado = processoRepository.findById(vinculoReferenciaId)
                    .orElseThrow(() -> new ResourceNotFoundException("Processo vinculado nao encontrado"));
            prazo.setProcesso(processoVinculado);
        } else if (tipo == TipoVinculoPrazo.ATENDIMENTO) {
            Atendimento atendimento = atendimentoRepository.findById(vinculoReferenciaId)
                    .orElseThrow(() -> new ResourceNotFoundException("Atendimento vinculado nao encontrado"));
            if (prazo.getProcesso() == null && atendimento.getProcesso() != null) {
                prazo.setProcesso(atendimento.getProcesso());
            }
        }

        prazo.setVinculoTipo(tipo);
        prazo.setVinculoReferenciaId(vinculoReferenciaId);
    }

    private void normalizarPeriodo(Prazo prazo) {
        if (Boolean.TRUE.equals(prazo.getDiaInteiro())) {
            prazo.setHora(null);
            prazo.setHoraFim(null);
        }

        if (prazo.getDataFim() == null) {
            prazo.setDataFim(prazo.getData());
        }
    }

    private void atualizarMarcoConclusao(Prazo prazo) {
        if (Boolean.TRUE.equals(prazo.getConcluido())) {
            if (prazo.getEtapa() != EtapaPrazo.CONCLUIDO) {
                prazo.setEtapa(EtapaPrazo.CONCLUIDO);
            }
            if (prazo.getConcluidoEm() == null) {
                prazo.setConcluidoEm(LocalDateTime.now());
            }
            return;
        }

        prazo.setConcluidoEm(null);
        if (prazo.getEtapa() == EtapaPrazo.CONCLUIDO) {
            prazo.setEtapa(EtapaPrazo.A_FAZER);
        }
    }

    private void validarConfiguracaoAtividade(Prazo prazo) {
        if (prazo.getData() == null) {
            throw new BusinessException("Data e obrigatoria.");
        }

        if (prazo.getDataFim() != null && prazo.getDataFim().isBefore(prazo.getData())) {
            throw new BusinessException("A data final nao pode ser anterior a data inicial.");
        }

        if (prazo.getDataFim() != null
                && prazo.getDataFim().isEqual(prazo.getData())
                && prazo.getHora() != null
                && prazo.getHoraFim() != null
                && prazo.getHoraFim().isBefore(prazo.getHora())) {
            throw new BusinessException("O horario final nao pode ser anterior ao horario inicial.");
        }

        if (prazo.getAlertaValor() != null && prazo.getAlertaValor() < 0) {
            throw new BusinessException("O alerta deve ser zero ou positivo.");
        }

        if (prazo.getAlertaValor() != null && prazo.getAlertaUnidade() == null) {
            throw new BusinessException("A unidade do alerta deve ser informada.");
        }

        if (prazo.getAlertaValor() == null) {
            prazo.setAlertaUnidade(null);
        }

        if (prazo.getTipo() == TipoPrazo.AUDIENCIA && prazo.getProcesso() == null) {
            throw new BusinessException("Audiencias exigem um processo vinculado.");
        }
    }

    private String resolveQuadroKanban(String quadroKanban) {
        String quadro = normalizeTextoOpcional(quadroKanban, 80);
        return quadro != null ? quadro : "Operacional";
    }

    private String normalizeTextoObrigatorio(String value, String fieldName) {
        String normalizado = normalizeTextoOpcional(value, 255);
        if (normalizado == null) {
            throw new BusinessException(fieldName + " e obrigatorio.");
        }
        return normalizado;
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

    private void atualizarProximoPrazoProcesso(Processo processo) {
        if (processo == null || processo.getId() == null) {
            return;
        }

        LocalDate proximoPrazo = prazoRepository.findFirstByProcessoIdAndConcluidoFalseOrderByDataAscHoraAsc(processo.getId())
                .map(Prazo::getData)
                .orElse(null);

        processo.setProximoPrazo(proximoPrazo);
        processoRepository.save(processo);
    }

    private Usuario resolveResponsavelEvento(EventoJuridico evento) {
        if (evento.getResponsavel() != null) {
            return evento.getResponsavel();
        }
        Processo processo = evento.getProcesso();
        if (processo == null || processo.getAdvogados() == null) {
            return null;
        }

        return processo.getAdvogados().stream()
                .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                .min(Comparator.comparing(Usuario::getNome, String.CASE_INSENSITIVE_ORDER))
                .orElse(null);
    }

    private String buildTituloTriagem(EventoJuridico evento, Processo processo) {
        String base = switch (evento.getTipo()) {
            case INTIMACAO -> "Triar intimacao";
            case PUBLICACAO -> "Triar publicacao";
            case MOVIMENTACAO -> "Triar movimentacao";
        };

        if (processo != null && processo.getNumero() != null) {
            return base + " - " + processo.getNumero();
        }

        return base;
    }

    private String buildDescricaoTriagem(EventoJuridico evento) {
        StringBuilder descricao = new StringBuilder("Tarefa automatica de triagem gerada a partir da Inbox Juridica.");
        if (evento.getDescricao() != null && !evento.getDescricao().isBlank()) {
            descricao.append(" ").append(evento.getDescricao());
        }
        descricao.append(" Revise o evento e, se houver prazo fatal, confirme manualmente antes de atuar.");
        return descricao.toString();
    }

    private LocalDate resolveDataTriagem(EventoJuridico evento) {
        LocalDate hoje = LocalDate.now();
        if (evento.getDataEvento() != null) {
            return evento.getDataEvento().toLocalDate();
        }
        return hoje;
    }

    private PrioridadePrazo resolvePrioridadeTriagem(EventoJuridico evento) {
        return switch (evento.getTipo()) {
            case INTIMACAO -> PrioridadePrazo.ALTA;
            case PUBLICACAO -> PrioridadePrazo.MEDIA;
            case MOVIMENTACAO -> PrioridadePrazo.BAIXA;
        };
    }

    private <T extends Enum<T>> T parseEnum(Class<T> clazz, String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
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
            throw new BusinessException(fieldName + " invalido: " + value);
        }
    }

    private <T extends Enum<T>> T parseOptionalEnumRequired(Class<T> clazz, String value, String fieldName) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return parseEnumRequired(clazz, value, fieldName);
    }
}
