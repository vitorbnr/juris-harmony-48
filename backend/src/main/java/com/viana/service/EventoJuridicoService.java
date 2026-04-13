package com.viana.service;

import com.viana.dto.request.CriarPublicacaoDjenRequest;
import com.viana.dto.response.EventoJuridicoResponse;
import com.viana.dto.response.DomicilioComunicacaoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.EventoJuridico;
import com.viana.model.Movimentacao;
import com.viana.model.Processo;
import com.viana.model.ProcessoParte;
import com.viana.model.ProcessoParteRepresentante;
import com.viana.model.Usuario;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.StatusEventoJuridico;
import com.viana.model.enums.TipoEventoJuridico;
import com.viana.model.enums.TipoNotificacao;
import com.viana.repository.EventoJuridicoRepository;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.util.DigestUtils;
import com.viana.util.CnjUtils;

@Service
@RequiredArgsConstructor
public class EventoJuridicoService {

    private final EventoJuridicoRepository eventoJuridicoRepository;
    private final ProcessoRepository processoRepository;
    private final UsuarioRepository usuarioRepository;
    private final PrazoService prazoService;
    private final NotificacaoService notificacaoService;

    @Transactional(readOnly = true)
    public Page<EventoJuridicoResponse> listar(String status, String fonte, UUID processoId, UUID responsavelId, Pageable pageable) {
        return eventoJuridicoRepository.findAllWithFilters(
                parseStatus(status),
                parseFonte(fonte),
                processoId,
                responsavelId,
                pageable
        ).map(this::toResponse);
    }

    @Transactional
    public EventoJuridicoResponse atualizarStatus(UUID id, String status) {
        EventoJuridico evento = eventoJuridicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evento juridico nao encontrado"));

        evento.setStatus(parseStatusRequired(status));
        return toResponse(eventoJuridicoRepository.save(evento));
    }

    @Transactional
    public EventoJuridicoResponse vincularProcesso(UUID eventoId, UUID processoId) {
        if (processoId == null) {
            throw new BusinessException("Processo e obrigatorio para o vinculo.");
        }

        EventoJuridico evento = eventoJuridicoRepository.findById(eventoId)
                .orElseThrow(() -> new ResourceNotFoundException("Evento juridico nao encontrado"));
        Processo processo = processoRepository.findById(processoId)
                .orElseThrow(() -> new ResourceNotFoundException("Processo nao encontrado"));

        evento.setProcesso(processo);
        DistribuicaoAutomatica distribuicao = resolveDistribuicaoAutomatica(processo, evento.getDestinatario());
        if (evento.getResponsavel() == null) {
            evento.setResponsavel(distribuicao != null ? distribuicao.responsavel() : resolveResponsavelPadrao(processo));
        }
        if (evento.getParteRelacionada() == null && distribuicao != null) {
            evento.setParteRelacionada(distribuicao.parteRelacionada());
        }
        return toResponse(eventoJuridicoRepository.save(evento));
    }

    @Transactional
    public EventoJuridicoResponse assumirResponsabilidade(UUID eventoId, String emailResponsavel) {
        EventoJuridico evento = eventoJuridicoRepository.findById(eventoId)
                .orElseThrow(() -> new ResourceNotFoundException("Evento juridico nao encontrado"));
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(emailResponsavel)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario responsavel nao encontrado"));

        return atribuirResponsavel(evento, usuario);
    }

    @Transactional
    public EventoJuridicoResponse atribuirResponsavel(UUID eventoId, UUID responsavelId) {
        EventoJuridico evento = eventoJuridicoRepository.findById(eventoId)
                .orElseThrow(() -> new ResourceNotFoundException("Evento juridico nao encontrado"));

        if (responsavelId == null) {
            evento.setResponsavel(null);
            return toResponse(eventoJuridicoRepository.save(evento));
        }

        Usuario usuario = usuarioRepository.findById(responsavelId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario responsavel nao encontrado"));

        return atribuirResponsavel(evento, usuario);
    }

    @Transactional
    public EventoJuridicoResponse registrarPublicacaoDjen(CriarPublicacaoDjenRequest request, UUID usuarioLogadoId) {
        if (request.getProcessoId() == null) {
            throw new BusinessException("Processo e obrigatorio para registrar a publicacao.");
        }
        if (request.getTitulo() == null || request.getTitulo().isBlank()) {
            throw new BusinessException("Titulo da publicacao e obrigatorio.");
        }
        if (request.getDescricao() == null || request.getDescricao().isBlank()) {
            throw new BusinessException("Descricao da publicacao e obrigatoria.");
        }

        Processo processo = processoRepository.findById(request.getProcessoId())
                .orElseThrow(() -> new ResourceNotFoundException("Processo nao encontrado"));

        Usuario responsavel = resolveResponsavelManual(request, processo, usuarioLogadoId);
        DistribuicaoAutomatica distribuicao = resolveDistribuicaoAutomatica(processo, request.getDestinatario());
        if (responsavel == null && distribuicao != null) {
            responsavel = distribuicao.responsavel();
        }
        if (responsavel == null) {
            responsavel = resolveResponsavelPadrao(processo);
        }

        String hash = buildDjenHash(request, processo);
        if (eventoJuridicoRepository.existsByHashDeduplicacao(hash)) {
            throw new BusinessException("Ja existe uma publicacao registrada com esses dados.");
        }

        EventoJuridico evento = EventoJuridico.builder()
                .processo(processo)
                .responsavel(responsavel)
                .fonte(FonteIntegracao.DJEN)
                .tipo(TipoEventoJuridico.PUBLICACAO)
                .status(StatusEventoJuridico.NOVO)
                .titulo(request.getTitulo().trim())
                .descricao(request.getDescricao().trim())
                .orgaoJulgador(trimToNull(request.getOrgaoJulgador()))
                .referenciaExterna(trimToNull(request.getReferenciaExterna()))
                .linkOficial(trimToNull(request.getLinkOficial()))
                .destinatario(trimToNull(request.getDestinatario()))
                .parteRelacionada(resolveParteRelacionada(request, distribuicao))
                .hashDeduplicacao(hash)
                .dataEvento(resolveDataEventoManual(request))
                .build();

        EventoJuridico salvo = eventoJuridicoRepository.save(evento);
        prazoService.gerarTarefaTriagemAutomatica(salvo);
        notificarResponsaveisNovoEvento(salvo, "Nova publicacao registrada", "Uma nova publicacao do DJEN foi registrada na Inbox Juridica.");
        return toResponse(salvo);
    }

    @Transactional
    public void registrarMovimentacoesDatajud(Processo processo, List<Movimentacao> movimentacoes) {
        if (movimentacoes == null || movimentacoes.isEmpty()) {
            return;
        }

        List<EventoJuridico> eventos = new ArrayList<>();
        for (Movimentacao movimentacao : movimentacoes) {
            String hash = "DATAJUD:" + movimentacao.getChaveExterna();
            if (movimentacao.getChaveExterna() == null || eventoJuridicoRepository.existsByHashDeduplicacao(hash)) {
                continue;
            }

            eventos.add(EventoJuridico.builder()
                    .processo(processo)
                    .fonte(FonteIntegracao.DATAJUD)
                    .tipo(TipoEventoJuridico.MOVIMENTACAO)
                    .status(StatusEventoJuridico.NOVO)
                    .titulo("Nova movimentacao do Datajud")
                    .descricao(movimentacao.getDescricao())
                    .responsavel(resolveResponsavelPadrao(processo))
                    .orgaoJulgador(movimentacao.getOrgaoJulgador())
                    .referenciaExterna(movimentacao.getChaveExterna())
                    .hashDeduplicacao(hash)
                    .dataEvento(resolveDataEvento(movimentacao))
                    .build());
        }

        if (!eventos.isEmpty()) {
            List<EventoJuridico> salvos = eventoJuridicoRepository.saveAll(eventos);
            salvos.forEach(prazoService::gerarTarefaTriagemAutomatica);
        }
    }

    @Transactional
    public List<EventoJuridico> registrarComunicacoesDomicilio(List<DomicilioComunicacaoResponse> comunicacoes) {
        if (comunicacoes == null || comunicacoes.isEmpty()) {
            return List.of();
        }

        List<EventoJuridico> eventos = new ArrayList<>();
        for (DomicilioComunicacaoResponse comunicacao : comunicacoes) {
            String hash = buildDomicilioHash(comunicacao);
            if (eventoJuridicoRepository.existsByHashDeduplicacao(hash)) {
                continue;
            }

            Processo processo = resolverProcessoPorNumero(comunicacao.getNumeroProcesso());
            DistribuicaoAutomatica distribuicao = resolveDistribuicaoAutomatica(processo, comunicacao.getDestinatario());
            eventos.add(EventoJuridico.builder()
                    .processo(processo)
                    .fonte(FonteIntegracao.DOMICILIO)
                    .tipo(inferTipoEventoDomicilio(comunicacao))
                    .status(StatusEventoJuridico.NOVO)
                    .titulo(buildTituloDomicilio(comunicacao))
                    .descricao(buildDescricaoDomicilio(comunicacao))
                    .responsavel(distribuicao != null ? distribuicao.responsavel() : resolveResponsavelPadrao(processo))
                    .orgaoJulgador(comunicacao.getOrgaoOrigem())
                    .referenciaExterna(comunicacao.getIdExterno())
                    .linkOficial(trimToNull(comunicacao.getLinkConsultaOficial()))
                    .destinatario(comunicacao.getDestinatario())
                    .parteRelacionada(distribuicao != null ? distribuicao.parteRelacionada() : null)
                    .hashDeduplicacao(hash)
                    .dataEvento(resolveDataEventoDomicilio(comunicacao))
                    .build());
        }

        if (eventos.isEmpty()) {
            return List.of();
        }

        List<EventoJuridico> salvos = eventoJuridicoRepository.saveAll(eventos);
        salvos.forEach(prazoService::gerarTarefaTriagemAutomatica);
        return salvos;
    }

    private LocalDateTime resolveDataEvento(Movimentacao movimentacao) {
        if (movimentacao.getDataHoraOriginal() != null) {
            return movimentacao.getDataHoraOriginal();
        }
        return movimentacao.getData() != null ? movimentacao.getData().atStartOfDay() : null;
    }

    private LocalDateTime resolveDataEventoDomicilio(DomicilioComunicacaoResponse comunicacao) {
        return parseDateTime(comunicacao.getDataDisponibilizacao(), comunicacao.getDataCiencia());
    }

    private EventoJuridicoResponse toResponse(EventoJuridico evento) {
        Processo processo = evento.getProcesso();
        return EventoJuridicoResponse.builder()
                .id(evento.getId().toString())
                .processoId(processo != null ? processo.getId().toString() : null)
                .processoNumero(processo != null ? processo.getNumero() : null)
                .clienteNome(processo != null && processo.getCliente() != null ? processo.getCliente().getNome() : null)
                .fonte(evento.getFonte().name())
                .tipo(evento.getTipo().name())
                .status(evento.getStatus().name())
                .titulo(evento.getTitulo())
                .descricao(evento.getDescricao())
                .orgaoJulgador(evento.getOrgaoJulgador())
                .referenciaExterna(evento.getReferenciaExterna())
                .linkOficial(evento.getLinkOficial())
                .destinatario(evento.getDestinatario())
                .parteRelacionada(evento.getParteRelacionada())
                .dataEvento(evento.getDataEvento() != null ? evento.getDataEvento().toString() : null)
                .responsavelId(evento.getResponsavel() != null ? evento.getResponsavel().getId().toString() : null)
                .responsavelNome(evento.getResponsavel() != null ? evento.getResponsavel().getNome() : null)
                .criadoEm(evento.getCriadoEm().toString())
                .build();
    }

    private FonteIntegracao parseFonte(String fonte) {
        if (fonte == null || fonte.isBlank()) {
            return null;
        }

        try {
            return FonteIntegracao.valueOf(fonte.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Fonte de evento invalida: " + fonte);
        }
    }

    private StatusEventoJuridico parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }

        try {
            return StatusEventoJuridico.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Status de evento invalido: " + status);
        }
    }

    private StatusEventoJuridico parseStatusRequired(String status) {
        StatusEventoJuridico statusEvento = parseStatus(status);
        if (statusEvento == null) {
            throw new BusinessException("Status de evento e obrigatorio");
        }
        return statusEvento;
    }

    private Processo resolverProcessoPorNumero(String numeroProcesso) {
        if (numeroProcesso == null || numeroProcesso.isBlank()) {
            return null;
        }

        String formatted = CnjUtils.formatNumeroCnj(numeroProcesso);
        return processoRepository.findByNumero(formatted)
                .or(() -> processoRepository.findByNumero(numeroProcesso))
                .orElse(null);
    }

    private TipoEventoJuridico inferTipoEventoDomicilio(DomicilioComunicacaoResponse comunicacao) {
        String text = String.join(" ",
                sanitize(comunicacao.getTipoComunicacao()),
                sanitize(comunicacao.getAssunto())
        ).toLowerCase();

        if (text.contains("public")) {
            return TipoEventoJuridico.PUBLICACAO;
        }
        return TipoEventoJuridico.INTIMACAO;
    }

    private String buildTituloDomicilio(DomicilioComunicacaoResponse comunicacao) {
        String tipo = comunicacao.getTipoComunicacao();
        if (tipo == null || tipo.isBlank()) {
            return "Nova comunicacao do Domicilio";
        }
        return "Nova comunicacao do Domicilio: " + tipo;
    }

    private String buildDescricaoDomicilio(DomicilioComunicacaoResponse comunicacao) {
        List<String> partes = new ArrayList<>();
        if (comunicacao.getAssunto() != null && !comunicacao.getAssunto().isBlank()) {
            partes.add(comunicacao.getAssunto());
        }
        if (comunicacao.getStatusCiente() != null && !comunicacao.getStatusCiente().isBlank()) {
            partes.add("Status: " + comunicacao.getStatusCiente());
        }
        if (comunicacao.getDestinatario() != null && !comunicacao.getDestinatario().isBlank()) {
            partes.add("Destinatario: " + comunicacao.getDestinatario());
        }
        if (comunicacao.getNumeroProcesso() != null && !comunicacao.getNumeroProcesso().isBlank()) {
            partes.add("Processo: " + CnjUtils.formatNumeroCnj(comunicacao.getNumeroProcesso()));
        }

        return partes.isEmpty()
                ? "Comunicacao importada do Domicilio Judicial Eletronico."
                : String.join(" | ", partes);
    }

    private String buildDomicilioHash(DomicilioComunicacaoResponse comunicacao) {
        String external = sanitize(comunicacao.getIdExterno());
        if (!external.isBlank()) {
            return "DOMICILIO:" + external;
        }

        String raw = String.join("|",
                sanitize(comunicacao.getNumeroProcesso()),
                sanitize(comunicacao.getTipoComunicacao()),
                sanitize(comunicacao.getAssunto()),
                sanitize(comunicacao.getDataDisponibilizacao()),
                sanitize(comunicacao.getStatusCiente()));
        return "DOMICILIO:" + DigestUtils.md5DigestAsHex(raw.getBytes(StandardCharsets.UTF_8));
    }

    private String buildDjenHash(CriarPublicacaoDjenRequest request, Processo processo) {
        String referencia = trimToNull(request.getReferenciaExterna());
        if (referencia != null) {
            return "DJEN:" + referencia;
        }

        String raw = String.join("|",
                processo.getId().toString(),
                sanitize(request.getTitulo()),
                sanitize(request.getDescricao()),
                sanitize(request.getLinkOficial()),
                sanitize(request.getDestinatario()),
                sanitize(resolveDataEventoManual(request) != null ? resolveDataEventoManual(request).toString() : null));
        return "DJEN:" + DigestUtils.md5DigestAsHex(raw.getBytes(StandardCharsets.UTF_8));
    }

    private LocalDateTime resolveDataEventoManual(CriarPublicacaoDjenRequest request) {
        LocalDateTime fallback = LocalDateTime.now();
        if (request.getDataEvento() == null) {
            return fallback;
        }
        if (request.getHoraEvento() != null) {
            return LocalDateTime.of(request.getDataEvento(), request.getHoraEvento());
        }
        return request.getDataEvento().atStartOfDay();
    }

    private LocalDateTime parseDateTime(String... values) {
        for (String value : values) {
            if (value == null || value.isBlank()) {
                continue;
            }

            try {
                return LocalDateTime.parse(value);
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private String sanitize(String value) {
        return value == null ? "" : value.trim();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String resolveParteRelacionada(CriarPublicacaoDjenRequest request, DistribuicaoAutomatica distribuicao) {
        String parteRelacionada = trimToNull(request.getParteRelacionada());
        if (parteRelacionada != null) {
            return parteRelacionada;
        }
        return distribuicao != null ? distribuicao.parteRelacionada() : null;
    }

    private Usuario resolveResponsavelManual(CriarPublicacaoDjenRequest request, Processo processo, UUID usuarioLogadoId) {
        if (request.getResponsavelId() != null) {
            Usuario usuario = usuarioRepository.findById(request.getResponsavelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuario responsavel nao encontrado"));
            validarResponsavelAtivo(usuario);
            validarResponsavelCompativelComProcesso(processo, usuario);
            return usuario;
        }

        return usuarioRepository.findById(usuarioLogadoId)
                .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                .orElse(null);
    }

    private void notificarResponsaveisNovoEvento(EventoJuridico evento, String titulo, String descricaoBase) {
        if (evento.getResponsavel() != null) {
            notificacaoService.criarNotificacao(
                    evento.getResponsavel().getId(),
                    titulo,
                    descricaoBase + " Processo: " + (evento.getProcesso() != null ? evento.getProcesso().getNumero() : "nao vinculado") + ".",
                    TipoNotificacao.SISTEMA,
                    "inbox"
            );
            return;
        }

        Processo processo = evento.getProcesso();
        if (processo == null || processo.getAdvogados() == null) {
            return;
        }

        for (Usuario advogado : processo.getAdvogados()) {
            notificacaoService.criarNotificacao(
                    advogado.getId(),
                    titulo,
                    descricaoBase + " Processo: " + processo.getNumero() + ".",
                    TipoNotificacao.SISTEMA,
                    "inbox"
            );
        }
    }

    private Usuario resolveResponsavelPadrao(Processo processo) {
        if (processo == null || processo.getAdvogados() == null || processo.getAdvogados().isEmpty()) {
            return null;
        }

        return processo.getAdvogados().stream()
                .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                .min(Comparator.comparing(Usuario::getNome, String.CASE_INSENSITIVE_ORDER))
                .orElse(null);
    }

    private DistribuicaoAutomatica resolveDistribuicaoAutomatica(Processo processo, String destinatario) {
        if (processo == null || processo.getAdvogados() == null || processo.getAdvogados().isEmpty()) {
            return null;
        }

        String destinatarioNormalizado = normalizeMatchKey(destinatario);
        if (destinatarioNormalizado == null || destinatarioNormalizado.length() < 3) {
            return null;
        }

        if (processo.getPartes() != null) {
            for (ProcessoParte parte : processo.getPartes()) {
                if (parte.getRepresentantes() == null) {
                    continue;
                }

                for (ProcessoParteRepresentante representante : parte.getRepresentantes()) {
                    Usuario usuarioInterno = representante.getUsuarioInterno();
                    if (usuarioInterno == null || !Boolean.TRUE.equals(usuarioInterno.getAtivo())) {
                        continue;
                    }

                    if (isMatch(destinatarioNormalizado, representante.getNome())
                            || isMatch(destinatarioNormalizado, usuarioInterno.getNome())) {
                        return new DistribuicaoAutomatica(usuarioInterno, parte.getNome());
                    }
                }
            }

            for (ProcessoParte parte : processo.getPartes()) {
                if (!isMatch(destinatarioNormalizado, parte.getNome())) {
                    continue;
                }

                Usuario usuarioDaParte = resolveResponsavelDaParte(parte);
                if (usuarioDaParte != null) {
                    return new DistribuicaoAutomatica(usuarioDaParte, parte.getNome());
                }
            }
        }

        for (Usuario advogado : processo.getAdvogados()) {
            if (!Boolean.TRUE.equals(advogado.getAtivo())) {
                continue;
            }

            if (isMatch(destinatarioNormalizado, advogado.getNome())) {
                return new DistribuicaoAutomatica(advogado, null);
            }
        }

        return null;
    }

    private Usuario resolveResponsavelDaParte(ProcessoParte parte) {
        if (parte == null || parte.getRepresentantes() == null || parte.getRepresentantes().isEmpty()) {
            return null;
        }

        return parte.getRepresentantes().stream()
                .filter(representante -> representante.getUsuarioInterno() != null)
                .filter(representante -> Boolean.TRUE.equals(representante.getUsuarioInterno().getAtivo()))
                .sorted(Comparator
                        .comparing(ProcessoParteRepresentante::getPrincipal, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(representante -> representante.getUsuarioInterno().getNome(), String.CASE_INSENSITIVE_ORDER))
                .map(ProcessoParteRepresentante::getUsuarioInterno)
                .findFirst()
                .orElse(null);
    }

    private boolean isMatch(String targetNormalized, String candidate) {
        String candidateNormalized = normalizeMatchKey(candidate);
        if (targetNormalized == null || candidateNormalized == null) {
            return false;
        }

        if (targetNormalized.equals(candidateNormalized)) {
            return true;
        }

        if (candidateNormalized.length() >= 5 && targetNormalized.contains(candidateNormalized)) {
            return true;
        }

        return targetNormalized.length() >= 5 && candidateNormalized.contains(targetNormalized);
    }

    private String normalizeMatchKey(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^\\p{IsAlphabetic}\\p{IsDigit} ]", " ")
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", " ")
                .trim();

        return normalized.isBlank() ? null : normalized;
    }

    private EventoJuridicoResponse atribuirResponsavel(EventoJuridico evento, Usuario usuario) {
        validarResponsavelAtivo(usuario);
        validarResponsavelCompativelComProcesso(evento, usuario);

        evento.setResponsavel(usuario);
        if (evento.getStatus() == StatusEventoJuridico.NOVO) {
            evento.setStatus(StatusEventoJuridico.EM_TRIAGEM);
        }
        return toResponse(eventoJuridicoRepository.save(evento));
    }

    private void validarResponsavelAtivo(Usuario usuario) {
        if (!Boolean.TRUE.equals(usuario.getAtivo())) {
            throw new BusinessException("O responsavel selecionado esta inativo.");
        }
    }

    private void validarResponsavelCompativelComProcesso(EventoJuridico evento, Usuario usuario) {
        validarResponsavelCompativelComProcesso(evento != null ? evento.getProcesso() : null, usuario);
    }

    private void validarResponsavelCompativelComProcesso(Processo processo, Usuario usuario) {
        if (processo == null || processo.getUnidade() == null || usuario.getUnidade() == null) {
            return;
        }

        if (!processo.getUnidade().getId().equals(usuario.getUnidade().getId())) {
            throw new BusinessException("O responsavel precisa pertencer a mesma unidade do processo.");
        }
    }

    private record DistribuicaoAutomatica(Usuario responsavel, String parteRelacionada) {
    }
}
