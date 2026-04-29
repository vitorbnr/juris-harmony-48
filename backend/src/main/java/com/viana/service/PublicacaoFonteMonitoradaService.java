package com.viana.service;

import com.viana.dto.request.AtualizarFontePublicacaoMonitoradaRequest;
import com.viana.dto.request.CriarFontePublicacaoMonitoradaRequest;
import com.viana.dto.response.PublicacaoDestinatarioResponse;
import com.viana.dto.response.PublicacaoDiarioOficialResponse;
import com.viana.dto.response.PublicacaoFonteMonitoradaResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.PublicacaoDiarioOficial;
import com.viana.model.PublicacaoFonteMonitorada;
import com.viana.model.Usuario;
import com.viana.model.enums.EstrategiaColetaPublicacao;
import com.viana.model.enums.StatusDiarioOficialPublicacao;
import com.viana.model.enums.TipoFontePublicacaoMonitorada;
import com.viana.repository.PublicacaoDiarioOficialRepository;
import com.viana.repository.PublicacaoFonteMonitoradaRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PublicacaoFonteMonitoradaService {

    private final PublicacaoFonteMonitoradaRepository repository;
    private final UsuarioRepository usuarioRepository;
    private final PublicacaoDiarioOficialRepository diarioOficialRepository;

    @Transactional(readOnly = true)
    public List<PublicacaoFonteMonitoradaResponse> listar(Boolean apenasAtivas) {
        List<PublicacaoFonteMonitorada> fontes = Boolean.TRUE.equals(apenasAtivas)
                ? repository.findByAtivoTrueOrderByNomeExibicaoAsc()
                : repository.findAllByOrderByNomeExibicaoAsc();

        return fontes.stream().map(this::toResponse).toList();
    }

    @Transactional
    public PublicacaoFonteMonitoradaResponse criar(CriarFontePublicacaoMonitoradaRequest request, String usuarioEmail) {
        TipoFontePublicacaoMonitorada tipo = parseTipo(request.getTipo());
        String nomeExibicao = normalizarObrigatorio(request.getNomeExibicao(), "Nome de exibicao e obrigatorio.");
        String valor = normalizarObrigatorio(request.getValorMonitorado(), "Valor monitorado e obrigatorio.");
        String uf = normalizarUf(request.getUf());

        if (repository.existsAtiva(tipo, valor, uf)) {
            throw new BusinessException("Ja existe uma fonte ativa com este tipo, valor e UF.");
        }

        Usuario usuario = getUsuarioByEmail(usuarioEmail);
        Set<Usuario> destinatarios = buscarDestinatarios(request.getDestinatariosIds());
        Set<PublicacaoDiarioOficial> diarios = buscarDiarios(request.getDiariosCodigos());

        PublicacaoFonteMonitorada fonte = PublicacaoFonteMonitorada.builder()
                .tipo(tipo)
                .nomeExibicao(nomeExibicao)
                .valorMonitorado(valor)
                .uf(uf)
                .observacao(normalizarOpcional(request.getObservacao()))
                .ativo(true)
                .criadoPor(usuario)
                .build();
        fonte.setDestinatarios(destinatarios);
        fonte.setDiariosMonitorados(diarios);

        return toResponse(repository.save(fonte));
    }

    @Transactional
    public PublicacaoFonteMonitoradaResponse alterarAtivo(UUID id, Boolean ativo) {
        PublicacaoFonteMonitorada fonte = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fonte monitorada nao encontrada"));

        if (Boolean.TRUE.equals(ativo)
                && repository.existsAtivaDiferenteDe(id, fonte.getTipo(), fonte.getValorMonitorado(), fonte.getUf())) {
            throw new BusinessException("Ja existe uma fonte ativa com este tipo, valor e UF.");
        }

        fonte.setAtivo(Boolean.TRUE.equals(ativo));
        return toResponse(repository.save(fonte));
    }

    @Transactional
    public PublicacaoFonteMonitoradaResponse atualizar(UUID id, AtualizarFontePublicacaoMonitoradaRequest request) {
        PublicacaoFonteMonitorada fonte = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fonte monitorada nao encontrada"));

        TipoFontePublicacaoMonitorada tipo = parseTipo(request.getTipo());
        String nomeExibicao = normalizarObrigatorio(request.getNomeExibicao(), "Nome de exibicao e obrigatorio.");
        String valor = normalizarObrigatorio(request.getValorMonitorado(), "Valor monitorado e obrigatorio.");
        String uf = normalizarUf(request.getUf());

        if (Boolean.TRUE.equals(fonte.getAtivo()) && repository.existsAtivaDiferenteDe(id, tipo, valor, uf)) {
            throw new BusinessException("Ja existe uma fonte ativa com este tipo, valor e UF.");
        }

        fonte.setTipo(tipo);
        fonte.setNomeExibicao(nomeExibicao);
        fonte.setValorMonitorado(valor);
        fonte.setUf(uf);
        fonte.setObservacao(normalizarOpcional(request.getObservacao()));
        fonte.setDestinatarios(buscarDestinatarios(request.getDestinatariosIds()));
        fonte.setDiariosMonitorados(buscarDiarios(request.getDiariosCodigos()));

        return toResponse(repository.save(fonte));
    }

    private PublicacaoFonteMonitoradaResponse toResponse(PublicacaoFonteMonitorada fonte) {
        Usuario criadoPor = fonte.getCriadoPor();
        return PublicacaoFonteMonitoradaResponse.builder()
                .id(fonte.getId() != null ? fonte.getId().toString() : null)
                .tipo(fonte.getTipo() != null ? fonte.getTipo().name() : null)
                .nomeExibicao(fonte.getNomeExibicao())
                .valorMonitorado(fonte.getValorMonitorado())
                .uf(fonte.getUf())
                .observacao(fonte.getObservacao())
                .ativo(fonte.getAtivo())
                .destinatarios(toDestinatariosResponse(fonte.getDestinatarios()))
                .diariosMonitorados(toDiariosResponse(fonte.getDiariosMonitorados()))
                .abrangenciaResumo(resolverAbrangenciaResumo(fonte.getDiariosMonitorados()))
                .criadoPorUsuarioId(criadoPor != null && criadoPor.getId() != null ? criadoPor.getId().toString() : null)
                .criadoPorUsuarioNome(criadoPor != null ? criadoPor.getNome() : null)
                .dataCriacao(fonte.getDataCriacao() != null ? fonte.getDataCriacao().toString() : null)
                .dataAtualizacao(fonte.getDataAtualizacao() != null ? fonte.getDataAtualizacao().toString() : null)
                .build();
    }

    private Set<Usuario> buscarDestinatarios(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return new LinkedHashSet<>();
        }

        List<UUID> distinctIds = ids.stream().filter(id -> id != null).distinct().toList();
        List<Usuario> usuarios = usuarioRepository.findAllById(distinctIds);
        if (usuarios.size() != distinctIds.size()) {
            throw new ResourceNotFoundException("Um ou mais destinatarios nao foram encontrados.");
        }

        return usuarios.stream()
                .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                .sorted(Comparator.comparing(Usuario::getNome, String.CASE_INSENSITIVE_ORDER))
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<PublicacaoDiarioOficial> buscarDiarios(List<String> codigos) {
        if (codigos == null || codigos.isEmpty()) {
            return new LinkedHashSet<>();
        }

        List<String> normalized = codigos.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(value -> value.trim().toUpperCase(Locale.ROOT))
                .distinct()
                .toList();
        List<PublicacaoDiarioOficial> diarios = diarioOficialRepository.findByCodigoIn(normalized);
        if (diarios.size() != normalized.size()) {
            throw new ResourceNotFoundException("Um ou mais diarios oficiais nao foram encontrados.");
        }

        boolean possuiScraping = diarios.stream().anyMatch(diario -> Boolean.TRUE.equals(diario.getRequerScraping()));
        if (possuiScraping) {
            throw new BusinessException("Fontes que exigem scraping nao podem ser ativadas no fluxo padrao.");
        }

        return diarios.stream()
                .filter(diario -> Boolean.TRUE.equals(diario.getAtivo()))
                .sorted(Comparator
                        .comparing((PublicacaoDiarioOficial diario) -> diario.getGrupo().name())
                        .thenComparing(diario -> diario.getUf() == null ? "ZZ" : diario.getUf())
                        .thenComparing(PublicacaoDiarioOficial::getNome))
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    }

    private List<PublicacaoDestinatarioResponse> toDestinatariosResponse(Set<Usuario> destinatarios) {
        if (destinatarios == null || destinatarios.isEmpty()) {
            return List.of();
        }
        return destinatarios.stream()
                .sorted(Comparator.comparing(Usuario::getNome, String.CASE_INSENSITIVE_ORDER))
                .map(usuario -> PublicacaoDestinatarioResponse.builder()
                        .id(usuario.getId() != null ? usuario.getId().toString() : null)
                        .nome(usuario.getNome())
                        .email(usuario.getEmail())
                        .papel(usuario.getPapel() != null ? usuario.getPapel().name() : null)
                        .build())
                .toList();
    }

    private List<PublicacaoDiarioOficialResponse> toDiariosResponse(Set<PublicacaoDiarioOficial> diarios) {
        if (diarios == null || diarios.isEmpty()) {
            return List.of();
        }
        return diarios.stream()
                .sorted(Comparator
                        .comparing((PublicacaoDiarioOficial diario) -> diario.getGrupo().name())
                        .thenComparing(diario -> diario.getUf() == null ? "ZZ" : diario.getUf())
                        .thenComparing(PublicacaoDiarioOficial::getNome))
                .map(diario -> PublicacaoDiarioOficialResponse.builder()
                        .id(diario.getId() != null ? diario.getId().toString() : null)
                        .codigo(diario.getCodigo())
                        .nome(diario.getNome())
                        .uf(diario.getUf())
                        .grupo(diario.getGrupo() != null ? diario.getGrupo().name() : null)
                        .estrategiaColeta(diario.getEstrategiaColeta() != null ? diario.getEstrategiaColeta().name() : null)
                        .status(diario.getStatus() != null ? diario.getStatus().name() : null)
                        .coletavelAgora(isDiarioColetavelAgora(diario))
                        .statusCaptura(resolverStatusCapturaDiario(diario))
                        .requerScraping(Boolean.TRUE.equals(diario.getRequerScraping()))
                        .custoEstimado(diario.getCustoEstimado())
                        .observacao(diario.getObservacao())
                        .ativo(diario.getAtivo())
                        .build())
                .toList();
    }

    private boolean isDiarioColetavelAgora(PublicacaoDiarioOficial diario) {
        return Boolean.TRUE.equals(diario.getAtivo())
                && !Boolean.TRUE.equals(diario.getRequerScraping())
                && diario.getStatus() != StatusDiarioOficialPublicacao.NAO_SUPORTADO
                && diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.CADERNO_DJEN;
    }

    private String resolverStatusCapturaDiario(PublicacaoDiarioOficial diario) {
        if (!Boolean.TRUE.equals(diario.getAtivo())) {
            return "INATIVO";
        }
        if (Boolean.TRUE.equals(diario.getRequerScraping())) {
            return "EXIGE_SCRAPING";
        }
        if (diario.getStatus() == StatusDiarioOficialPublicacao.NAO_SUPORTADO) {
            return "NAO_SUPORTADO";
        }
        if (diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.CADERNO_DJEN) {
            return "COLETOR_ATIVO";
        }
        if (diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.DADOS_ABERTOS) {
            return "PREPARADO_PARA_CONECTOR";
        }
        return "SOMENTE_CATALOGO";
    }

    private String resolverAbrangenciaResumo(Set<PublicacaoDiarioOficial> diarios) {
        if (diarios == null || diarios.isEmpty()) {
            return "Sem diarios oficiais vinculados";
        }

        long djen = diarios.stream()
                .filter(diario -> diario.getGrupo() != null && "DJEN".equals(diario.getGrupo().name()))
                .count();
        long superiores = diarios.stream()
                .filter(diario -> diario.getGrupo() != null && "DJEN".equals(diario.getGrupo().name()))
                .filter(diario -> diario.getUf() == null)
                .count();
        long ufs = diarios.stream()
                .map(PublicacaoDiarioOficial::getUf)
                .filter(uf -> uf != null && !uf.isBlank())
                .distinct()
                .count();

        if (djen == diarios.size() && ufs >= 27 && superiores > 0) {
            return "DJEN: todos os estados e superiores";
        }
        if (djen == diarios.size() && ufs == 1 && superiores > 0) {
            String uf = diarios.stream()
                    .map(PublicacaoDiarioOficial::getUf)
                    .filter(value -> value != null && !value.isBlank())
                    .findFirst()
                    .orElse("");
            return "DJEN: " + uf + " e superiores";
        }
        return diarios.size() + " fonte(s) oficial(is), sem scraping";
    }

    private TipoFontePublicacaoMonitorada parseTipo(String value) {
        try {
            return TipoFontePublicacaoMonitorada.valueOf(normalizarObrigatorio(value, "Tipo e obrigatorio.").toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Tipo de fonte monitorada invalido: " + value);
        }
    }

    private String normalizarObrigatorio(String value, String mensagem) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(mensagem);
        }
        return value.trim();
    }

    private String normalizarOpcional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizarUf(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String uf = value.trim().toUpperCase(Locale.ROOT);
        if (uf.length() != 2) {
            throw new BusinessException("UF deve ter 2 caracteres.");
        }
        return uf;
    }

    private Usuario getUsuarioByEmail(String email) {
        return usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));
    }
}
