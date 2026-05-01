package com.viana.service;

import com.viana.dto.request.CriarAtividadePublicacaoRequest;
import com.viana.dto.request.CriarPrazoEventoRequest;
import com.viana.dto.request.DescartarPublicacaoRequest;
import com.viana.dto.request.IngestarPublicacaoRequest;
import com.viana.dto.response.DatajudMovimentacaoResponse;
import com.viana.dto.response.PrazoResponse;
import com.viana.dto.response.PublicacaoAtividadeResponse;
import com.viana.dto.response.PublicacaoMetricasResponse;
import com.viana.dto.response.PublicacaoHistoricoResponse;
import com.viana.dto.response.PublicacaoResponse;
import com.viana.dto.response.PublicacaoTratamentoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.EventoJuridico;
import com.viana.model.Prazo;
import com.viana.model.Processo;
import com.viana.model.Publicacao;
import com.viana.model.PublicacaoHistorico;
import com.viana.model.Usuario;
import com.viana.model.enums.AcaoHistoricoPublicacao;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.StatusEventoJuridico;
import com.viana.model.enums.StatusFluxoPublicacao;
import com.viana.model.enums.StatusTratamento;
import com.viana.model.enums.TipoNotificacao;
import com.viana.model.enums.TipoPrazo;
import com.viana.model.enums.TipoEventoJuridico;
import com.viana.repository.EventoJuridicoRepository;
import com.viana.repository.PublicacaoHistoricoRepository;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.PublicacaoRepository;
import com.viana.repository.PrazoRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class PublicacaoService {

    private final PublicacaoRepository publicacaoRepository;
    private final ProcessoRepository processoRepository;
    private final UsuarioRepository usuarioRepository;
    private final PublicacaoHistoricoRepository publicacaoHistoricoRepository;
    private final EventoJuridicoRepository eventoJuridicoRepository;
    private final PrazoRepository prazoRepository;
    private final PublicacaoTriagemInteligenteService triagemInteligenteService;
    private final NotificacaoService notificacaoService;
    private final PrazoService prazoService;

    @Transactional(readOnly = true)
    public List<PublicacaoResponse> listar(
            String status,
            String busca,
            Boolean somenteRiscoPrazo,
            String statusFluxo,
            Boolean somenteHoje,
            Boolean minhas,
            String usuarioEmail
    ) {
        StatusTratamento statusTratamento = parseStatus(status);
        StatusFluxoPublicacao statusFluxoPublicacao = parseStatusFluxo(statusFluxo);
        String buscaNormalizada = normalizarBusca(busca);
        UUID usuarioResponsavelId = Boolean.TRUE.equals(minhas) ? getUsuarioByEmail(usuarioEmail).getId() : null;
        IntervaloData intervalo = resolverIntervaloHoje(somenteHoje);
        List<Publicacao> publicacoes = publicacaoRepository.buscarParaTriagem(
                statusTratamento,
                buscaNormalizada,
                somenteRiscoPrazo,
                statusFluxoPublicacao,
                intervalo.inicio(),
                intervalo.fim(),
                usuarioResponsavelId
        );

        Map<UUID, List<PublicacaoAtividadeResponse>> atividadesPorPublicacao = buscarAtividadesPorPublicacao(publicacoes);
        return publicacoes.stream()
                .map(publicacao -> toResponse(
                        publicacao,
                        atividadesPorPublicacao.getOrDefault(publicacao.getId(), List.of())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<PublicacaoResponse> listarPaginado(
            String status,
            String busca,
            Boolean somenteRiscoPrazo,
            String statusFluxo,
            Boolean somenteHoje,
            Boolean minhas,
            String usuarioEmail,
            Pageable pageable
    ) {
        StatusTratamento statusTratamento = parseStatus(status);
        StatusFluxoPublicacao statusFluxoPublicacao = parseStatusFluxo(statusFluxo);
        String buscaNormalizada = normalizarBusca(busca);
        UUID usuarioResponsavelId = Boolean.TRUE.equals(minhas) ? getUsuarioByEmail(usuarioEmail).getId() : null;
        IntervaloData intervalo = resolverIntervaloHoje(somenteHoje);
        Page<Publicacao> pagina = publicacaoRepository.buscarParaTriagemPaginada(
                statusTratamento,
                buscaNormalizada,
                somenteRiscoPrazo,
                statusFluxoPublicacao,
                intervalo.inicio(),
                intervalo.fim(),
                usuarioResponsavelId,
                pageable
        );

        Map<UUID, List<PublicacaoAtividadeResponse>> atividadesPorPublicacao = buscarAtividadesPorPublicacao(pagina.getContent());
        List<PublicacaoResponse> respostas = pagina.getContent().stream()
                .map(publicacao -> toResponse(
                        publicacao,
                        atividadesPorPublicacao.getOrDefault(publicacao.getId(), List.of())
                ))
                .toList();
        return new PageImpl<>(respostas, pageable, pagina.getTotalElements());
    }

    @Transactional(readOnly = true)
    public PublicacaoResponse buscar(UUID id) {
        Publicacao publicacao = publicacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Publicacao nao encontrada"));
        return toResponse(publicacao);
    }

    @Transactional(readOnly = true)
    public PublicacaoMetricasResponse buscarMetricas() {
        LocalDate hoje = LocalDate.now();
        LocalDateTime inicioDia = hoje.atStartOfDay();
        LocalDateTime fimDia = hoje.plusDays(1).atStartOfDay().minusNanos(1);

        return PublicacaoMetricasResponse.builder()
                .naoTratadasHoje(publicacaoRepository.countByStatusTratamentoAndDataPublicacaoBetween(
                        StatusTratamento.PENDENTE,
                        inicioDia,
                        fimDia
                ))
                .tratadasHoje(publicacaoRepository.countByStatusTratamentoAndDataPublicacaoBetween(
                        StatusTratamento.TRATADA,
                        inicioDia,
                        fimDia
                ))
                .descartadasHoje(publicacaoRepository.countByStatusTratamentoAndDataPublicacaoBetween(
                        StatusTratamento.DESCARTADA,
                        inicioDia,
                        fimDia
                ))
                .naoTratadas(publicacaoRepository.countByStatusTratamento(StatusTratamento.PENDENTE))
                .prazoSuspeito(publicacaoRepository.countByRiscoPrazoTrueAndStatusTratamento(StatusTratamento.PENDENTE))
                .semVinculo(publicacaoRepository.countByProcessoIsNullAndStatusTratamento(StatusTratamento.PENDENTE))
                .semResponsavel(publicacaoRepository.countByStatusFluxoAndStatusTratamento(
                        StatusFluxoPublicacao.SEM_RESPONSAVEL,
                        StatusTratamento.PENDENTE
                ))
                .build();
    }

    @Transactional
    public PublicacaoResponse ingestar(IngestarPublicacaoRequest request, String usuarioEmail) {
        return ingestar(request, getUsuarioByEmail(usuarioEmail), "Publicacao recebida por ingestao interna.");
    }

    @Transactional
    public PublicacaoResponse ingestarSistema(IngestarPublicacaoRequest request, String observacaoHistorico) {
        return ingestar(request, null, observacaoHistorico);
    }

    private PublicacaoResponse ingestar(IngestarPublicacaoRequest request, Usuario usuario, String observacaoHistorico) {
        String hash = normalizarHash(request.getHashDeduplicacao());
        if (hash == null) {
            hash = gerarHashDeduplicacao(request);
        }

        Publicacao existente = publicacaoRepository.findByHashDeduplicacao(hash).orElse(null);
        if (existente != null) {
            return toResponse(existente);
        }

        Processo processo = buscarProcessoPorNpu(request.getNpu());
        Usuario responsavel = escolherResponsavelProcesso(processo);
        Usuario destinoPreferencial = buscarUsuarioPorIdOpcional(request.getAtribuidaParaUsuarioId());
        Usuario atribuidaPara = responsavel != null ? responsavel : destinoPreferencial;
        LocalDateTime agora = LocalDateTime.now();

        Publicacao publicacao = Publicacao.builder()
                .npu(normalizarOpcional(request.getNpu()))
                .tribunalOrigem(normalizarObrigatorio(request.getTribunalOrigem(), "Tribunal de origem e obrigatorio."))
                .teor(normalizarObrigatorio(request.getTeor(), "Teor da publicacao e obrigatorio."))
                .dataPublicacao(request.getDataPublicacao())
                .statusTratamento(StatusTratamento.PENDENTE)
                .statusFluxo(StatusFluxoPublicacao.RECEBIDA)
                .processo(processo)
                .fonte(normalizarOpcional(request.getFonte()))
                .identificadorExterno(normalizarOpcional(request.getIdentificadorExterno()))
                .captadaEmNome(normalizarOpcional(request.getCaptadaEmNome()))
                .oabMonitorada(normalizarOpcional(request.getOabMonitorada()))
                .hashDeduplicacao(hash)
                .responsavelProcesso(responsavel)
                .atribuidaPara(atribuidaPara)
                .dataAtribuicao(atribuidaPara != null ? agora : null)
                .build();

        triagemInteligenteService.enriquecer(publicacao);
        atualizarStatusFluxoOperacional(publicacao);

        Publicacao salva = publicacaoRepository.save(publicacao);
        registrarHistorico(salva, AcaoHistoricoPublicacao.CAPTURADA, usuario, atribuidaPara, observacaoHistorico);
        gerarTarefaTriagemAutomatica(salva, usuario, atribuidaPara);
        notificarNovaPublicacao(salva, request);
        return toResponse(salva);
    }

    @Transactional
    public boolean ingestarDatajudMovimentacao(Processo processo, DatajudMovimentacaoResponse movimento) {
        if (processo == null || movimento == null || !deveGerarPublicacaoDatajud(movimento)) {
            return false;
        }

        String chaveExterna = normalizarOpcional(movimento.getChaveExterna());
        if (chaveExterna == null) {
            return false;
        }

        String hash = normalizarHash("datajud-publicacao|" + processo.getId() + "|" + chaveExterna);
        if (publicacaoRepository.findByHashDeduplicacao(hash).isPresent()) {
            return false;
        }

        Usuario responsavel = escolherResponsavelProcesso(processo);
        LocalDateTime dataPublicacao = resolverDataPublicacaoDatajud(movimento);
        LocalDateTime agora = LocalDateTime.now();
        String descricao = normalizarOpcional(movimento.getDescricao()) != null
                ? movimento.getDescricao()
                : movimento.getNome();

        Publicacao publicacao = Publicacao.builder()
                .npu(processo.getNumero())
                .tribunalOrigem(resolverTribunalOrigemDatajud(movimento))
                .teor(normalizarObrigatorio(descricao, "Descricao da movimentacao DataJud e obrigatoria."))
                .dataPublicacao(dataPublicacao)
                .statusTratamento(StatusTratamento.PENDENTE)
                .statusFluxo(StatusFluxoPublicacao.RECEBIDA)
                .processo(processo)
                .fonte("DATAJUD")
                .identificadorExterno(chaveExterna)
                .hashDeduplicacao(hash)
                .responsavelProcesso(responsavel)
                .atribuidaPara(responsavel)
                .dataAtribuicao(responsavel != null ? agora : null)
                .build();

        triagemInteligenteService.enriquecer(publicacao);
        atualizarStatusFluxoOperacional(publicacao);

        Publicacao salva = publicacaoRepository.save(publicacao);
        registrarHistorico(salva, AcaoHistoricoPublicacao.CAPTURADA, null, responsavel, "Publicacao derivada de movimentacao DataJud segura.");
        gerarTarefaTriagemAutomatica(salva, null, responsavel);
        return true;
    }

    @Transactional
    public PublicacaoResponse atualizarStatus(UUID id, String novoStatus, String usuarioEmail) {
        Publicacao publicacao = publicacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Publicacao nao encontrada"));
        Usuario usuario = getUsuarioByEmail(usuarioEmail);

        StatusTratamento status = parseStatusRequired(novoStatus);
        publicacao.setStatusTratamento(status);

        if (status == StatusTratamento.TRATADA) {
            publicacao.setStatusFluxo(StatusFluxoPublicacao.TRATADA);
            publicacao.setTratadaPor(usuario);
            publicacao.setDataTratamento(LocalDateTime.now());
        } else if (status == StatusTratamento.DESCARTADA) {
            publicacao.setStatusFluxo(StatusFluxoPublicacao.DESCARTADA);
            publicacao.setTratadaPor(usuario);
            publicacao.setDataTratamento(LocalDateTime.now());
        } else {
            publicacao.setDataTratamento(null);
            publicacao.setTratadaPor(null);
            publicacao.setMotivoDescarte(null);
            atualizarStatusFluxoOperacional(publicacao);
        }

        Publicacao salva = publicacaoRepository.save(publicacao);
        registrarHistorico(salva, AcaoHistoricoPublicacao.STATUS_ALTERADO, usuario, null, "Status alterado para " + status.name());
        return toResponse(salva);
    }

    @Transactional
    public PublicacaoResponse descartar(UUID id, DescartarPublicacaoRequest request, String usuarioEmail) {
        Publicacao publicacao = publicacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Publicacao nao encontrada"));
        Usuario usuario = getUsuarioByEmail(usuarioEmail);
        String motivo = normalizarObrigatorio(request.getMotivo(), "Motivo do descarte e obrigatorio.");
        if (motivo.length() > 255) {
            throw new BusinessException("Motivo do descarte deve ter no maximo 255 caracteres.");
        }

        publicacao.setStatusTratamento(StatusTratamento.DESCARTADA);
        publicacao.setStatusFluxo(StatusFluxoPublicacao.DESCARTADA);
        publicacao.setMotivoDescarte(motivo);
        publicacao.setTratadaPor(usuario);
        publicacao.setDataTratamento(LocalDateTime.now());

        Publicacao salva = publicacaoRepository.save(publicacao);
        registrarHistorico(salva, AcaoHistoricoPublicacao.DESCARTADA, usuario, null, "Publicacao descartada. Motivo: " + motivo);
        return toResponse(salva);
    }

    @Transactional
    public PublicacaoTratamentoResponse criarTarefa(UUID publicacaoId, CriarAtividadePublicacaoRequest request, String usuarioEmail) {
        return criarAtividade(publicacaoId, request, usuarioEmail, TipoPrazo.TAREFA_INTERNA, AcaoHistoricoPublicacao.TAREFA_CRIADA, "Tarefa criada a partir da publicacao.");
    }

    @Transactional
    public PublicacaoTratamentoResponse criarPrazo(UUID publicacaoId, CriarAtividadePublicacaoRequest request, String usuarioEmail) {
        return criarAtividade(publicacaoId, request, usuarioEmail, TipoPrazo.PRAZO_PROCESSUAL, AcaoHistoricoPublicacao.PRAZO_CRIADO, "Prazo criado a partir da publicacao.");
    }

    @Transactional
    public PublicacaoTratamentoResponse criarAudiencia(UUID publicacaoId, CriarAtividadePublicacaoRequest request, String usuarioEmail) {
        return criarAtividade(publicacaoId, request, usuarioEmail, TipoPrazo.AUDIENCIA, AcaoHistoricoPublicacao.AUDIENCIA_CRIADA, "Audiencia criada a partir da publicacao.");
    }

    private PublicacaoTratamentoResponse criarAtividade(
            UUID publicacaoId,
            CriarAtividadePublicacaoRequest request,
            String usuarioEmail,
            TipoPrazo tipoPrazo,
            AcaoHistoricoPublicacao acaoHistorico,
            String mensagemHistorico
    ) {
        Publicacao publicacao = publicacaoRepository.findById(publicacaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Publicacao nao encontrada"));
        Usuario usuario = getUsuarioByEmail(usuarioEmail);

        if (publicacao.getProcesso() == null) {
            throw new BusinessException("Vincule a publicacao a um processo antes de criar atividade.");
        }

        EventoJuridico evento = getOrCreateEventoPublicacao(publicacao);
        CriarPrazoEventoRequest prazoRequest = new CriarPrazoEventoRequest();
        prazoRequest.setTitulo(normalizarObrigatorio(request.getTitulo(), "Titulo e obrigatorio."));
        prazoRequest.setData(request.getData());
        prazoRequest.setHora(request.getHora());
        prazoRequest.setTipo(tipoPrazo.name());
        prazoRequest.setPrioridade(resolverPrioridadeAtividade(request, publicacao));
        prazoRequest.setEtapa(request.getEtapa() != null && !request.getEtapa().isBlank() ? request.getEtapa() : "A_FAZER");
        prazoRequest.setAdvogadoId(request.getAdvogadoId());
        prazoRequest.setDescricao(resolverDescricaoAtividade(request, publicacao, tipoPrazo));

        PrazoResponse atividade = prazoService.criarAPartirDoEvento(evento.getId(), prazoRequest, usuario.getId());
        marcarComoTratada(publicacao, usuario);
        Publicacao salva = publicacaoRepository.save(publicacao);

        registrarHistorico(
                salva,
                acaoHistorico,
                usuario,
                null,
                mensagemHistorico + " Atividade: " + atividade.getTitulo() + "."
        );

        return PublicacaoTratamentoResponse.builder()
                .publicacao(toResponse(salva))
                .atividade(atividade)
                .eventoJuridicoId(evento.getId().toString())
                .mensagem(mensagemHistorico)
                .build();
    }

    @Transactional
    public PublicacaoResponse vincularProcesso(UUID publicacaoId, UUID processoId, String usuarioEmail) {
        Publicacao publicacao = publicacaoRepository.findById(publicacaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Publicacao nao encontrada"));
        Usuario usuario = getUsuarioByEmail(usuarioEmail);

        Processo processo = processoRepository.findById(processoId)
                .orElseThrow(() -> new ResourceNotFoundException("Processo nao encontrado"));

        publicacao.setProcesso(processo);
        Usuario responsavel = escolherResponsavelProcesso(processo);
        publicacao.setResponsavelProcesso(responsavel);
        if (responsavel != null && publicacao.getAtribuidaPara() == null) {
            publicacao.setAtribuidaPara(responsavel);
            publicacao.setDataAtribuicao(LocalDateTime.now());
        }
        atualizarStatusFluxoOperacional(publicacao);

        Publicacao salva = publicacaoRepository.save(publicacao);
        registrarHistorico(salva, AcaoHistoricoPublicacao.VINCULADA_PROCESSO, usuario, responsavel, "Processo vinculado: " + processo.getNumero());
        return toResponse(salva);
    }

    @Transactional
    public PublicacaoResponse atribuir(UUID publicacaoId, UUID usuarioDestinoId, String usuarioEmail) {
        Publicacao publicacao = publicacaoRepository.findById(publicacaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Publicacao nao encontrada"));
        Usuario usuario = getUsuarioByEmail(usuarioEmail);
        Usuario destino = usuarioRepository.findById(usuarioDestinoId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario destino nao encontrado"));

        publicacao.setAtribuidaPara(destino);
        publicacao.setDataAtribuicao(LocalDateTime.now());
        if (publicacao.getStatusTratamento() == StatusTratamento.PENDENTE) {
            publicacao.setStatusFluxo(StatusFluxoPublicacao.ATRIBUIDA);
        }

        Publicacao salva = publicacaoRepository.save(publicacao);
        registrarHistorico(salva, AcaoHistoricoPublicacao.ATRIBUIDA, usuario, destino, "Publicacao atribuida para tratamento.");
        return toResponse(salva);
    }

    @Transactional
    public PublicacaoResponse assumir(UUID publicacaoId, String usuarioEmail) {
        Publicacao publicacao = publicacaoRepository.findById(publicacaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Publicacao nao encontrada"));
        Usuario usuario = getUsuarioByEmail(usuarioEmail);

        publicacao.setAssumidaPor(usuario);
        publicacao.setAtribuidaPara(usuario);
        publicacao.setDataAssuncao(LocalDateTime.now());
        publicacao.setDataAtribuicao(publicacao.getDataAtribuicao() != null ? publicacao.getDataAtribuicao() : LocalDateTime.now());
        if (publicacao.getStatusTratamento() == StatusTratamento.PENDENTE) {
            publicacao.setStatusFluxo(StatusFluxoPublicacao.EM_TRATAMENTO);
        }

        Publicacao salva = publicacaoRepository.save(publicacao);
        registrarHistorico(salva, AcaoHistoricoPublicacao.ASSUMIDA, usuario, usuario, "Publicacao assumida para tratamento.");
        return toResponse(salva);
    }

    @Transactional
    public PublicacaoResponse reprocessarTriagemInteligente(UUID publicacaoId, String usuarioEmail) {
        Publicacao publicacao = publicacaoRepository.findById(publicacaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Publicacao nao encontrada"));
        Usuario usuario = getUsuarioByEmail(usuarioEmail);

        triagemInteligenteService.enriquecer(publicacao);
        atualizarStatusFluxoOperacional(publicacao);

        Publicacao salva = publicacaoRepository.save(publicacao);
        registrarHistorico(salva, AcaoHistoricoPublicacao.IA_REPROCESSADA, usuario, null, "Triagem inteligente reprocessada com explicabilidade.");
        return toResponse(salva);
    }

    private EventoJuridico getOrCreateEventoPublicacao(Publicacao publicacao) {
        return eventoJuridicoRepository.findFirstByPublicacaoId(publicacao.getId())
                .map(evento -> atualizarEventoComPublicacao(evento, publicacao))
                .orElseGet(() -> eventoJuridicoRepository.save(EventoJuridico.builder()
                        .publicacao(publicacao)
                        .processo(publicacao.getProcesso())
                        .responsavel(resolverResponsavelPublicacao(publicacao))
                        .fonte(resolverFonteEvento(publicacao))
                        .tipo(TipoEventoJuridico.PUBLICACAO)
                        .status(StatusEventoJuridico.EM_TRIAGEM)
                        .titulo(buildTituloEventoPublicacao(publicacao))
                        .descricao(buildDescricaoEventoPublicacao(publicacao))
                        .orgaoJulgador(publicacao.getTribunalOrigem())
                        .referenciaExterna(publicacao.getIdentificadorExterno())
                        .destinatario(publicacao.getCaptadaEmNome())
                        .hashDeduplicacao("PUBLICACAO:" + publicacao.getId())
                        .dataEvento(publicacao.getDataPublicacao())
                        .build()));
    }

    private EventoJuridico atualizarEventoComPublicacao(EventoJuridico evento, Publicacao publicacao) {
        boolean changed = false;
        if (evento.getProcesso() == null && publicacao.getProcesso() != null) {
            evento.setProcesso(publicacao.getProcesso());
            changed = true;
        }
        if (evento.getResponsavel() == null && resolverResponsavelPublicacao(publicacao) != null) {
            evento.setResponsavel(resolverResponsavelPublicacao(publicacao));
            changed = true;
        }
        if (evento.getStatus() == StatusEventoJuridico.NOVO) {
            evento.setStatus(StatusEventoJuridico.EM_TRIAGEM);
            changed = true;
        }
        return changed ? eventoJuridicoRepository.save(evento) : evento;
    }

    private Usuario resolverResponsavelPublicacao(Publicacao publicacao) {
        if (publicacao.getAtribuidaPara() != null) {
            return publicacao.getAtribuidaPara();
        }
        if (publicacao.getAssumidaPor() != null) {
            return publicacao.getAssumidaPor();
        }
        return publicacao.getResponsavelProcesso();
    }

    private FonteIntegracao resolverFonteEvento(Publicacao publicacao) {
        String fonte = publicacao.getFonte();
        if (fonte == null || fonte.isBlank()) {
            return FonteIntegracao.DJEN;
        }
        try {
            return FonteIntegracao.valueOf(fonte.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return FonteIntegracao.DJEN;
        }
    }

    private String buildTituloEventoPublicacao(Publicacao publicacao) {
        String processo = publicacao.getNpu() != null && !publicacao.getNpu().isBlank()
                ? " - " + publicacao.getNpu()
                : "";
        String titulo = "Publicacao " + publicacao.getTribunalOrigem() + processo;
        return titulo.length() <= 255 ? titulo : titulo.substring(0, 255);
    }

    private String buildDescricaoEventoPublicacao(Publicacao publicacao) {
        String resumo = publicacao.getResumoOperacional() != null && !publicacao.getResumoOperacional().isBlank()
                ? publicacao.getResumoOperacional()
                : publicacao.getTeor();
        return resumo != null ? resumo : "Publicacao importada para tratamento operacional.";
    }

    private String resolverPrioridadeAtividade(CriarAtividadePublicacaoRequest request, Publicacao publicacao) {
        if (request.getPrioridade() != null && !request.getPrioridade().isBlank()) {
            return request.getPrioridade();
        }
        return publicacao.isRiscoPrazo() ? "ALTA" : "MEDIA";
    }

    private String resolverDescricaoAtividade(CriarAtividadePublicacaoRequest request, Publicacao publicacao, TipoPrazo tipoPrazo) {
        if (request.getDescricao() != null && !request.getDescricao().isBlank()) {
            return request.getDescricao();
        }

        String tipo = switch (tipoPrazo) {
            case AUDIENCIA -> "Audiencia criada a partir de publicacao.";
            case TAREFA_INTERNA -> "Tarefa criada a partir de publicacao.";
            case PRAZO_PROCESSUAL -> "Prazo criado a partir de publicacao.";
            case REUNIAO -> "Atividade criada a partir de publicacao.";
        };
        String resumo = publicacao.getResumoOperacional() != null && !publicacao.getResumoOperacional().isBlank()
                ? publicacao.getResumoOperacional()
                : publicacao.getTeor();
        return limitarTexto(tipo + "\n\n" + (resumo != null ? resumo : ""), 3900);
    }

    private void marcarComoTratada(Publicacao publicacao, Usuario usuario) {
        publicacao.setStatusTratamento(StatusTratamento.TRATADA);
        publicacao.setStatusFluxo(StatusFluxoPublicacao.TRATADA);
        publicacao.setTratadaPor(usuario);
        publicacao.setDataTratamento(LocalDateTime.now());
    }

    private String limitarTexto(String value, int max) {
        if (value == null || value.length() <= max) {
            return value;
        }
        return value.substring(0, max);
    }

    @Transactional(readOnly = true)
    public List<PublicacaoHistoricoResponse> listarHistorico(UUID publicacaoId) {
        if (!publicacaoRepository.existsById(publicacaoId)) {
            throw new ResourceNotFoundException("Publicacao nao encontrada");
        }

        return publicacaoHistoricoRepository.findByPublicacaoIdOrderByCriadoEmDesc(publicacaoId)
                .stream()
                .map(this::toHistoricoResponse)
                .toList();
    }

    private PublicacaoResponse toResponse(Publicacao publicacao) {
        return toResponse(publicacao, buscarAtividadesPorPublicacao(publicacao));
    }

    private PublicacaoResponse toResponse(Publicacao publicacao, List<PublicacaoAtividadeResponse> atividadesVinculadas) {
        Processo processo = publicacao.getProcesso();
        Usuario responsavelProcesso = publicacao.getResponsavelProcesso();
        Usuario atribuidaPara = publicacao.getAtribuidaPara();
        Usuario assumidaPor = publicacao.getAssumidaPor();
        Usuario tratadaPor = publicacao.getTratadaPor();

        return PublicacaoResponse.builder()
                .id(publicacao.getId() != null ? publicacao.getId().toString() : null)
                .npu(publicacao.getNpu())
                .tribunalOrigem(publicacao.getTribunalOrigem())
                .teor(publicacao.getTeor())
                .dataPublicacao(publicacao.getDataPublicacao() != null ? publicacao.getDataPublicacao().toString() : null)
                .statusTratamento(publicacao.getStatusTratamento() != null ? publicacao.getStatusTratamento().name() : null)
                .statusFluxo(publicacao.getStatusFluxo() != null ? publicacao.getStatusFluxo().name() : null)
                .processoId(processo != null && processo.getId() != null ? processo.getId().toString() : null)
                .processoNumero(processo != null ? processo.getNumero() : null)
                .fonte(publicacao.getFonte())
                .identificadorExterno(publicacao.getIdentificadorExterno())
                .captadaEmNome(publicacao.getCaptadaEmNome())
                .oabMonitorada(publicacao.getOabMonitorada())
                .responsavelProcessoId(toId(responsavelProcesso))
                .responsavelProcessoNome(responsavelProcesso != null ? responsavelProcesso.getNome() : null)
                .atribuidaParaUsuarioId(toId(atribuidaPara))
                .atribuidaParaUsuarioNome(atribuidaPara != null ? atribuidaPara.getNome() : null)
                .assumidaPorUsuarioId(toId(assumidaPor))
                .assumidaPorUsuarioNome(assumidaPor != null ? assumidaPor.getNome() : null)
                .tratadaPorUsuarioId(toId(tratadaPor))
                .tratadaPorUsuarioNome(tratadaPor != null ? tratadaPor.getNome() : null)
                .dataAtribuicao(publicacao.getDataAtribuicao() != null ? publicacao.getDataAtribuicao().toString() : null)
                .dataAssuncao(publicacao.getDataAssuncao() != null ? publicacao.getDataAssuncao().toString() : null)
                .dataTratamento(publicacao.getDataTratamento() != null ? publicacao.getDataTratamento().toString() : null)
                .motivoDescarte(publicacao.getMotivoDescarte())
                .dataCriacao(publicacao.getDataCriacao() != null ? publicacao.getDataCriacao().toString() : null)
                .dataAtualizacao(publicacao.getDataAtualizacao() != null ? publicacao.getDataAtualizacao().toString() : null)
                .iaAcaoSugerida(publicacao.getIaAcaoSugerida())
                .iaPrazoSugeridoDias(publicacao.getIaPrazoSugeridoDias())
                .resumoOperacional(publicacao.getResumoOperacional())
                .riscoPrazo(publicacao.isRiscoPrazo())
                .scorePrioridade(publicacao.getScorePrioridade())
                .justificativaPrioridade(publicacao.getJustificativaPrioridade())
                .iaConfianca(publicacao.getIaConfianca())
                .iaTrechosRelevantes(publicacao.getIaTrechosRelevantes())
                .ladoProcessualEstimado(publicacao.getLadoProcessualEstimado() != null ? publicacao.getLadoProcessualEstimado().name() : null)
                .atividadesVinculadas(atividadesVinculadas)
                .build();
    }

    private List<PublicacaoAtividadeResponse> buscarAtividadesPorPublicacao(Publicacao publicacao) {
        if (publicacao == null || publicacao.getId() == null) {
            return List.of();
        }
        return buscarAtividadesPorPublicacao(List.of(publicacao))
                .getOrDefault(publicacao.getId(), List.of());
    }

    private Map<UUID, List<PublicacaoAtividadeResponse>> buscarAtividadesPorPublicacao(List<Publicacao> publicacoes) {
        List<UUID> publicacaoIds = publicacoes.stream()
                .map(Publicacao::getId)
                .filter(Objects::nonNull)
                .toList();
        if (publicacaoIds.isEmpty()) {
            return Map.of();
        }

        return prazoRepository.findByEventoJuridicoPublicacaoIdInOrderByDossie(publicacaoIds)
                .stream()
                .filter(prazo -> prazo.getEventoJuridico() != null
                        && prazo.getEventoJuridico().getPublicacao() != null
                        && prazo.getEventoJuridico().getPublicacao().getId() != null)
                .collect(Collectors.groupingBy(
                        prazo -> prazo.getEventoJuridico().getPublicacao().getId(),
                        LinkedHashMap::new,
                        Collectors.mapping(this::toAtividadeResponse, Collectors.toList())
                ));
    }

    private PublicacaoAtividadeResponse toAtividadeResponse(Prazo prazo) {
        Usuario advogado = prazo.getAdvogado();
        EventoJuridico eventoJuridico = prazo.getEventoJuridico();
        return PublicacaoAtividadeResponse.builder()
                .id(prazo.getId() != null ? prazo.getId().toString() : null)
                .titulo(prazo.getTitulo())
                .tipo(prazo.getTipo() != null ? prazo.getTipo().name() : null)
                .data(prazo.getData() != null ? prazo.getData().toString() : null)
                .hora(prazo.getHora() != null ? prazo.getHora().toString() : null)
                .prioridade(prazo.getPrioridade() != null ? prazo.getPrioridade().name() : null)
                .etapa(prazo.getEtapa() != null ? prazo.getEtapa().name() : null)
                .concluido(prazo.getConcluido())
                .advogadoId(toId(advogado))
                .advogadoNome(advogado != null ? advogado.getNome() : null)
                .eventoJuridicoId(eventoJuridico != null && eventoJuridico.getId() != null ? eventoJuridico.getId().toString() : null)
                .build();
    }

    private PublicacaoHistoricoResponse toHistoricoResponse(PublicacaoHistorico historico) {
        Usuario usuario = historico.getUsuario();
        Usuario destino = historico.getUsuarioDestino();
        return PublicacaoHistoricoResponse.builder()
                .id(historico.getId() != null ? historico.getId().toString() : null)
                .acao(historico.getAcao() != null ? historico.getAcao().name() : null)
                .usuarioId(toId(usuario))
                .usuarioNome(usuario != null ? usuario.getNome() : null)
                .usuarioDestinoId(toId(destino))
                .usuarioDestinoNome(destino != null ? destino.getNome() : null)
                .observacao(historico.getObservacao())
                .criadoEm(historico.getCriadoEm() != null ? historico.getCriadoEm().toString() : null)
                .build();
    }

    private StatusTratamento parseStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return StatusTratamento.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Status de tratamento invalido: " + value);
        }
    }

    private StatusTratamento parseStatusRequired(String value) {
        StatusTratamento status = parseStatus(value);
        if (status == null) {
            throw new BusinessException("Status de tratamento e obrigatorio.");
        }
        return status;
    }

    private StatusFluxoPublicacao parseStatusFluxo(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return StatusFluxoPublicacao.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Status de fluxo invalido: " + value);
        }
    }

    private String normalizarBusca(String busca) {
        if (busca == null || busca.isBlank()) {
            return null;
        }
        return busca.trim();
    }

    private IntervaloData resolverIntervaloHoje(Boolean somenteHoje) {
        if (!Boolean.TRUE.equals(somenteHoje)) {
            return new IntervaloData(null, null);
        }
        LocalDate hoje = LocalDate.now();
        return new IntervaloData(hoje.atStartOfDay(), hoje.plusDays(1).atStartOfDay());
    }

    private String normalizarOpcional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizarObrigatorio(String value, String mensagem) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(mensagem);
        }
        return value.trim();
    }

    private String normalizarHash(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean deveGerarPublicacaoDatajud(DatajudMovimentacaoResponse movimento) {
        String tipo = movimento.getTipo();
        String texto = String.join(" ",
                tipo != null ? tipo : "",
                movimento.getNome() != null ? movimento.getNome() : "",
                movimento.getDescricao() != null ? movimento.getDescricao() : ""
        ).toLowerCase(Locale.ROOT);

        return "PUBLICACAO".equalsIgnoreCase(tipo)
                || texto.contains("publica")
                || texto.contains("diario")
                || texto.contains("diário")
                || texto.contains("intim")
                || texto.contains("disponibiliza");
    }

    private LocalDateTime resolverDataPublicacaoDatajud(DatajudMovimentacaoResponse movimento) {
        LocalDateTime dataHora = parseLocalDateTime(movimento.getDataHora());
        if (dataHora != null) {
            return dataHora;
        }

        String data = movimento.getData();
        if (data != null && !data.isBlank()) {
            try {
                return LocalDate.parse(data).atStartOfDay();
            } catch (DateTimeParseException ignored) {
            }
        }

        return LocalDateTime.now();
    }

    private LocalDateTime parseLocalDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private String resolverTribunalOrigemDatajud(DatajudMovimentacaoResponse movimento) {
        String orgao = normalizarOpcional(movimento.getOrgaoJulgador());
        if (orgao == null) {
            return "DataJud";
        }

        String value = "DataJud - " + orgao;
        return value.length() <= 150 ? value : value.substring(0, 150);
    }

    private Usuario getUsuarioByEmail(String email) {
        return usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));
    }

    private Usuario buscarUsuarioPorIdOpcional(UUID id) {
        if (id == null) {
            return null;
        }
        return usuarioRepository.findById(id)
                .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                .orElse(null);
    }

    private Processo buscarProcessoPorNpu(String npu) {
        String numero = normalizarOpcional(npu);
        if (numero == null) {
            return null;
        }
        return processoRepository.findByNumero(numero).orElse(null);
    }

    private Usuario escolherResponsavelProcesso(Processo processo) {
        if (processo == null || processo.getAdvogados() == null || processo.getAdvogados().isEmpty()) {
            return null;
        }

        return processo.getAdvogados().stream()
                .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                .sorted((a, b) -> a.getNome().compareToIgnoreCase(b.getNome()))
                .findFirst()
                .orElse(null);
    }

    private void atualizarStatusFluxoOperacional(Publicacao publicacao) {
        if (publicacao.getStatusTratamento() == StatusTratamento.TRATADA) {
            publicacao.setStatusFluxo(StatusFluxoPublicacao.TRATADA);
            return;
        }
        if (publicacao.getStatusTratamento() == StatusTratamento.DESCARTADA) {
            publicacao.setStatusFluxo(StatusFluxoPublicacao.DESCARTADA);
            return;
        }
        if (publicacao.getAssumidaPor() != null) {
            publicacao.setStatusFluxo(StatusFluxoPublicacao.EM_TRATAMENTO);
            return;
        }
        if (publicacao.getAtribuidaPara() != null) {
            publicacao.setStatusFluxo(StatusFluxoPublicacao.ATRIBUIDA);
            return;
        }
        if (publicacao.getProcesso() == null) {
            publicacao.setStatusFluxo(StatusFluxoPublicacao.SEM_VINCULO);
            return;
        }
        publicacao.setStatusFluxo(StatusFluxoPublicacao.SEM_RESPONSAVEL);
    }

    private void registrarHistorico(
            Publicacao publicacao,
            AcaoHistoricoPublicacao acao,
            Usuario usuario,
            Usuario destino,
            String observacao
    ) {
        publicacaoHistoricoRepository.save(PublicacaoHistorico.builder()
                .publicacao(publicacao)
                .acao(acao)
                .usuario(usuario)
                .usuarioDestino(destino)
                .observacao(observacao)
                .build());
    }

    private void notificarNovaPublicacao(Publicacao publicacao, IngestarPublicacaoRequest request) {
        Set<UUID> destinatariosIds = new LinkedHashSet<>();
        if (request.getDestinatariosNotificacaoIds() != null) {
            request.getDestinatariosNotificacaoIds().stream()
                    .filter(id -> id != null)
                    .forEach(destinatariosIds::add);
        }
        if (publicacao.getAtribuidaPara() != null && publicacao.getAtribuidaPara().getId() != null) {
            destinatariosIds.add(publicacao.getAtribuidaPara().getId());
        }
        if (publicacao.getResponsavelProcesso() != null && publicacao.getResponsavelProcesso().getId() != null) {
            destinatariosIds.add(publicacao.getResponsavelProcesso().getId());
        }
        if (destinatariosIds.isEmpty()) {
            return;
        }

        String descricao = construirDescricaoNotificacao(publicacao);
        String chaveBase = "publicacao:" + publicacao.getId();
        for (UUID destinatarioId : destinatariosIds) {
            notificacaoService.criarNotificacao(
                    destinatarioId,
                    "Nova publicacao capturada",
                    descricao,
                    TipoNotificacao.SISTEMA,
                    "publicacoes",
                    chaveBase + ":" + destinatarioId,
                    "PUBLICACAO",
                    publicacao.getId()
            );
        }
    }

    private String construirDescricaoNotificacao(Publicacao publicacao) {
        String numero = publicacao.getNpu() != null && !publicacao.getNpu().isBlank()
                ? publicacao.getNpu()
                : "sem processo vinculado";
        String captadaEmNome = publicacao.getCaptadaEmNome() != null && !publicacao.getCaptadaEmNome().isBlank()
                ? " Captada em nome de " + publicacao.getCaptadaEmNome() + "."
                : "";
        return "Uma publicacao foi encontrada em " + publicacao.getTribunalOrigem()
                + ". Processo: " + numero + "." + captadaEmNome;
    }

    private void gerarTarefaTriagemAutomatica(Publicacao publicacao, Usuario usuario, Usuario responsavelDestino) {
        if (publicacao == null || publicacao.getId() == null || publicacao.getStatusTratamento() != StatusTratamento.PENDENTE) {
            return;
        }
        Usuario responsavel = resolverResponsavelPublicacao(publicacao);
        if (responsavel == null) {
            return;
        }

        try {
            EventoJuridico evento = getOrCreateEventoPublicacao(publicacao);
            if (prazoService.gerarTarefaTriagemAutomatica(evento)) {
                registrarHistorico(
                        publicacao,
                        AcaoHistoricoPublicacao.TAREFA_CRIADA,
                        usuario,
                        responsavelDestino != null ? responsavelDestino : responsavel,
                        "Tarefa automatica de triagem criada para a publicacao capturada."
                );
            }
        } catch (RuntimeException ex) {
            log.warn("Nao foi possivel gerar tarefa automatica de triagem para publicacao {}.", publicacao.getId(), ex);
        }
    }

    private String toId(Usuario usuario) {
        return usuario != null && usuario.getId() != null ? usuario.getId().toString() : null;
    }

    private String gerarHashDeduplicacao(IngestarPublicacaoRequest request) {
        String base = String.join("|",
                normalizarHash(request.getFonte()) != null ? normalizarHash(request.getFonte()) : "",
                normalizarHash(request.getIdentificadorExterno()) != null ? normalizarHash(request.getIdentificadorExterno()) : "",
                normalizarHash(request.getNpu()) != null ? normalizarHash(request.getNpu()) : "",
                normalizarHash(request.getTribunalOrigem()) != null ? normalizarHash(request.getTribunalOrigem()) : "",
                request.getDataPublicacao() != null ? request.getDataPublicacao().toString() : "",
                normalizarHash(request.getTeor()) != null ? normalizarHash(request.getTeor()) : ""
        );

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(base.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new BusinessException("Nao foi possivel gerar hash de deduplicacao da publicacao.");
        }
    }

    private record IntervaloData(LocalDateTime inicio, LocalDateTime fim) {
    }
}
