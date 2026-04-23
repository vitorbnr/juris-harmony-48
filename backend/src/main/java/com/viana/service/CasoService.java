package com.viana.service;

import com.viana.dto.request.CasoEnvolvidoRequest;
import com.viana.dto.request.CriarCasoRequest;
import com.viana.dto.response.CasoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Caso;
import com.viana.model.CasoEnvolvido;
import com.viana.model.Cliente;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.AcessoCaso;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.TipoAcao;
import com.viana.repository.CasoRepository;
import com.viana.repository.ClienteRepository;
import com.viana.repository.UnidadeRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CasoService {

    private static final int LIMITE_ETIQUETAS = 10;
    private static final int LIMITE_CARACTERES_ETIQUETA = 40;
    private static final int LIMITE_ARMAZENAMENTO_ETIQUETAS = 255;
    private static final int LIMITE_ENVOLVIDOS = 20;

    private final CasoRepository casoRepository;
    private final ClienteRepository clienteRepository;
    private final UnidadeRepository unidadeRepository;
    private final UsuarioRepository usuarioRepository;
    private final LogAuditoriaService logAuditoriaService;

    @Transactional(readOnly = true)
    public Page<CasoResponse> listar(UUID unidadeId, UUID clienteId, UUID responsavelId, String busca, Pageable pageable) {
        String buscaSafe = busca == null || busca.isBlank() ? "" : busca.trim();
        return casoRepository.findAllWithFilters(unidadeId, clienteId, responsavelId, buscaSafe, pageable)
                .map(this::toSummaryResponse);
    }

    @Transactional(readOnly = true)
    public CasoResponse buscarPorId(UUID id) {
        return toResponse(findDetalheOrThrow(id), true);
    }

    @Transactional
    public CasoResponse criar(CriarCasoRequest request, UUID usuarioLogadoId) {
        Cliente cliente = clienteRepository.findById(request.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente nao encontrado"));
        Usuario responsavel = usuarioRepository.findById(request.getResponsavelId())
                .orElseThrow(() -> new ResourceNotFoundException("Responsavel nao encontrado"));
        Unidade unidade = resolverUnidade(request.getUnidadeId(), cliente, responsavel);

        if (!Boolean.TRUE.equals(responsavel.getAtivo())) {
            throw new BusinessException("Nao e possivel atribuir o caso a um utilizador inativo.");
        }

        Caso caso = Caso.builder()
                .cliente(cliente)
                .unidade(unidade)
                .responsavel(responsavel)
                .titulo(normalizarTextoObrigatorio(request.getTitulo(), "Titulo", 255))
                .descricao(normalizarTextoOpcional(request.getDescricao(), 4000))
                .observacoes(normalizarTextoOpcional(request.getObservacoes(), 4000))
                .etiquetas(serializarEtiquetas(request.getEtiquetas()))
                .acesso(parseAcesso(request.getAcesso()))
                .build();

        aplicarEnvolvidos(caso, request.getEnvolvidos());

        Caso salvo = casoRepository.save(caso);
        registrarLog(usuarioLogadoId, TipoAcao.CRIOU, "Caso criado: " + salvo.getTitulo());

        return toResponse(findDetalheOrThrow(salvo.getId()), true);
    }

    @Transactional(readOnly = true)
    public Caso findOrThrow(UUID id) {
        return casoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Caso nao encontrado"));
    }

    private Caso findDetalheOrThrow(UUID id) {
        return casoRepository.findDetalheById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Caso nao encontrado"));
    }

    private Unidade resolverUnidade(UUID unidadeId, Cliente cliente, Usuario responsavel) {
        if (unidadeId != null) {
            return unidadeRepository.findById(unidadeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade nao encontrada"));
        }
        if (cliente.getUnidade() != null) {
            return cliente.getUnidade();
        }
        if (responsavel.getUnidade() != null) {
            return responsavel.getUnidade();
        }
        throw new BusinessException("Nao foi possivel determinar a pasta do caso.");
    }

    private void aplicarEnvolvidos(Caso caso, List<CasoEnvolvidoRequest> envolvidos) {
        caso.getEnvolvidos().clear();

        if (envolvidos == null || envolvidos.isEmpty()) {
            return;
        }

        if (envolvidos.size() > LIMITE_ENVOLVIDOS) {
            throw new BusinessException("Um caso pode ter no maximo " + LIMITE_ENVOLVIDOS + " envolvidos.");
        }

        for (CasoEnvolvidoRequest request : envolvidos) {
            if (request == null) {
                continue;
            }

            String nome = normalizarTextoObrigatorio(request.getNome(), "Nome do envolvido", 200);
            String qualificacao = normalizarTextoOpcional(request.getQualificacao(), 255);

            caso.getEnvolvidos().add(CasoEnvolvido.builder()
                    .caso(caso)
                    .nome(nome)
                    .qualificacao(qualificacao)
                    .build());
        }
    }

    private CasoResponse toSummaryResponse(Caso caso) {
        return toResponse(caso, false);
    }

    private CasoResponse toResponse(Caso caso, boolean includeEnvolvidos) {
        List<CasoResponse.EnvolvidoInfo> envolvidos = includeEnvolvidos && caso.getEnvolvidos() != null
                ? caso.getEnvolvidos().stream()
                .map(this::toEnvolvidoResponse)
                .toList()
                : List.of();

        return CasoResponse.builder()
                .id(caso.getId().toString())
                .clienteId(caso.getCliente().getId().toString())
                .clienteNome(caso.getCliente().getNome())
                .unidadeId(caso.getUnidade().getId().toString())
                .unidadeNome(caso.getUnidade().getNome())
                .responsavelId(caso.getResponsavel().getId().toString())
                .responsavelNome(caso.getResponsavel().getNome())
                .titulo(caso.getTitulo())
                .descricao(caso.getDescricao())
                .observacoes(caso.getObservacoes())
                .etiquetas(desserializarEtiquetas(caso.getEtiquetas()))
                .acesso(caso.getAcesso().name())
                .envolvidos(envolvidos)
                .dataCriacao(caso.getCriadoEm() != null ? caso.getCriadoEm().toString() : null)
                .dataAtualizacao(caso.getAtualizadoEm() != null ? caso.getAtualizadoEm().toString() : null)
                .build();
    }

    private CasoResponse.EnvolvidoInfo toEnvolvidoResponse(CasoEnvolvido envolvido) {
        return CasoResponse.EnvolvidoInfo.builder()
                .id(envolvido.getId() != null ? envolvido.getId().toString() : null)
                .nome(envolvido.getNome())
                .qualificacao(envolvido.getQualificacao())
                .build();
    }

    private AcessoCaso parseAcesso(String acesso) {
        try {
            return AcessoCaso.valueOf(acesso.trim().toUpperCase());
        } catch (Exception ex) {
            throw new BusinessException("Acesso de caso invalido: " + acesso);
        }
    }

    private String normalizarTextoObrigatorio(String value, String fieldName, int maxLength) {
        String normalizado = normalizarTextoOpcional(value, maxLength);
        if (normalizado == null) {
            throw new BusinessException(fieldName + " e obrigatorio.");
        }
        return normalizado;
    }

    private String normalizarTextoOpcional(String value, int maxLength) {
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

    private String serializarEtiquetas(List<String> etiquetas) {
        if (etiquetas == null || etiquetas.isEmpty()) {
            return null;
        }

        if (etiquetas.size() > LIMITE_ETIQUETAS) {
            throw new BusinessException("Um caso pode ter no maximo " + LIMITE_ETIQUETAS + " etiquetas.");
        }

        List<String> normalizadas = new ArrayList<>();
        Set<String> chaves = new LinkedHashSet<>();

        for (String etiqueta : etiquetas) {
            String limpa = normalizarEtiquetaExibicao(etiqueta);
            if (limpa == null) {
                continue;
            }
            String chave = normalizarEtiquetaChave(limpa);
            if (!chaves.add(chave)) {
                continue;
            }
            normalizadas.add(limpa);
        }

        if (normalizadas.isEmpty()) {
            return null;
        }

        String serializado = String.join(",", normalizadas);
        if (serializado.length() > LIMITE_ARMAZENAMENTO_ETIQUETAS) {
            throw new BusinessException("As etiquetas do caso excedem o limite de armazenamento.");
        }
        return serializado;
    }

    private List<String> desserializarEtiquetas(String etiquetas) {
        if (etiquetas == null || etiquetas.isBlank()) {
            return List.of();
        }

        return List.of(etiquetas.split(",")).stream()
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }

    private String normalizarEtiquetaExibicao(String etiqueta) {
        if (etiqueta == null) {
            return null;
        }

        String trimmed = etiqueta.trim().replaceAll("\\s+", " ");
        if (trimmed.isBlank()) {
            return null;
        }
        if (trimmed.length() > LIMITE_CARACTERES_ETIQUETA) {
            throw new BusinessException("Cada etiqueta deve ter no maximo " + LIMITE_CARACTERES_ETIQUETA + " caracteres.");
        }
        return trimmed;
    }

    private String normalizarEtiquetaChave(String etiqueta) {
        return Normalizer.normalize(etiqueta, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase();
    }

    private void registrarLog(UUID usuarioId, TipoAcao acao, String descricao) {
        try {
            logAuditoriaService.registrar(usuarioId, acao, ModuloLog.PROCESSOS, descricao);
        } catch (Exception ignored) {
        }
    }
}
