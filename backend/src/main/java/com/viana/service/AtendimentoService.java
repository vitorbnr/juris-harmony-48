package com.viana.service;

import com.viana.dto.request.CriarAtendimentoRequest;
import com.viana.dto.response.AtendimentoResponse;
import com.viana.dto.response.ProcessoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Atendimento;
import com.viana.model.Caso;
import com.viana.model.Cliente;
import com.viana.model.Processo;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.StatusAtendimento;
import com.viana.model.enums.TipoAcao;
import com.viana.model.enums.TipoVinculoAtendimento;
import com.viana.repository.AtendimentoRepository;
import com.viana.repository.CasoRepository;
import com.viana.repository.ClienteRepository;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.UnidadeRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AtendimentoService {

    private static final int LIMITE_ETIQUETAS = 10;
    private static final int LIMITE_CARACTERES_ETIQUETA = 40;
    private static final int LIMITE_ARMAZENAMENTO_ETIQUETAS = 255;

    private final AtendimentoRepository atendimentoRepository;
    private final CasoRepository casoRepository;
    private final ClienteRepository clienteRepository;
    private final ProcessoRepository processoRepository;
    private final UsuarioRepository usuarioRepository;
    private final UnidadeRepository unidadeRepository;
    private final LogAuditoriaService logAuditoriaService;

    @Transactional(readOnly = true)
    public Page<AtendimentoResponse> listar(UUID unidadeId, UUID clienteId, String status, String busca, Pageable pageable) {
        String buscaSafe = busca == null || busca.isBlank() ? "" : busca.trim();
        StatusFilter statusFilter = resolveStatusFilter(status);

        return atendimentoRepository.findAllWithFilters(
                        unidadeId,
                        clienteId,
                        statusFilter.statuses(),
                        statusFilter.filtrar(),
                        buscaSafe,
                        pageable
                )
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public AtendimentoResponse buscarPorId(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public AtendimentoResponse criarAtendimento(CriarAtendimentoRequest request, UUID usuarioLogadoId) {
        Cliente cliente = clienteRepository.findById(request.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente nao encontrado"));
        Usuario autor = usuarioRepository.findById(usuarioLogadoId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));
        VinculoAtendimentoInfo vinculo = resolverVinculo(request, cliente);
        Unidade unidade = resolverUnidade(request.getUnidadeId(), cliente, autor, vinculo.processo());

        Atendimento atendimento = Atendimento.builder()
                .cliente(cliente)
                .usuario(autor)
                .unidade(unidade)
                .processo(vinculo.processo())
                .vinculoTipo(vinculo.tipo())
                .vinculoReferenciaId(vinculo.referenciaId())
                .assunto(normalizarTextoObrigatorio(request.getAssunto(), "Assunto"))
                .descricao(normalizarTextoOpcional(request.getDescricao(), 4000))
                .status(StatusAtendimento.ABERTO)
                .etiquetas(serializarEtiquetas(request.getEtiquetas()))
                .build();

        Atendimento salvo = atendimentoRepository.save(atendimento);

        registrarLog(autor.getId(), TipoAcao.CRIOU,
                "Atendimento criado para " + cliente.getNome() + ": " + salvo.getAssunto());

        return toResponse(salvo);
    }

    @Transactional
    public AtendimentoResponse atualizar(UUID id, CriarAtendimentoRequest request, UUID usuarioLogadoId) {
        Atendimento atendimento = findOrThrow(id);
        validarAutoria(atendimento, usuarioLogadoId);

        Cliente cliente = clienteRepository.findById(request.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente nao encontrado"));
        VinculoAtendimentoInfo vinculo = resolverVinculo(request, cliente);
        Unidade unidade = resolverUnidade(request.getUnidadeId(), cliente, atendimento.getUsuario(), vinculo.processo());

        atendimento.setCliente(cliente);
        atendimento.setUnidade(unidade);
        atendimento.setProcesso(vinculo.processo());
        atendimento.setVinculoTipo(vinculo.tipo());
        atendimento.setVinculoReferenciaId(vinculo.referenciaId());
        atendimento.setAssunto(normalizarTextoObrigatorio(request.getAssunto(), "Assunto"));
        atendimento.setDescricao(normalizarTextoOpcional(request.getDescricao(), 4000));
        atendimento.setEtiquetas(serializarEtiquetas(request.getEtiquetas()));

        Atendimento salvo = atendimentoRepository.save(atendimento);

        registrarLog(usuarioLogadoId, TipoAcao.EDITOU,
                "Atendimento atualizado: " + salvo.getAssunto());

        return toResponse(salvo);
    }

    @Transactional
    public void excluir(UUID id, UUID usuarioLogadoId) {
        Atendimento atendimento = findOrThrow(id);
        validarAutoria(atendimento, usuarioLogadoId);

        atendimentoRepository.delete(atendimento);

        registrarLog(usuarioLogadoId, TipoAcao.EXCLUIU,
                "Atendimento excluido: " + atendimento.getAssunto());
    }

    @Transactional
    public AtendimentoResponse fechar(UUID id, UUID usuarioLogadoId) {
        Atendimento atendimento = findOrThrow(id);
        validarAutoria(atendimento, usuarioLogadoId);

        if (atendimento.getStatus() == StatusAtendimento.CONVERTIDO) {
            throw new BusinessException("Atendimentos convertidos em processo nao podem ser fechados manualmente.");
        }
        if (atendimento.getStatus() == StatusAtendimento.ARQUIVADO) {
            throw new BusinessException("Este atendimento ja esta fechado.");
        }

        atendimento.setStatus(StatusAtendimento.ARQUIVADO);
        atendimento.setDataAtualizacao(LocalDateTime.now());

        Atendimento salvo = atendimentoRepository.save(atendimento);

        registrarLog(usuarioLogadoId, TipoAcao.EDITOU,
                "Atendimento fechado: " + salvo.getAssunto());

        return toResponse(salvo);
    }

    @Transactional
    public AtendimentoResponse reabrir(UUID id, UUID usuarioLogadoId) {
        Atendimento atendimento = findOrThrow(id);
        validarAutoria(atendimento, usuarioLogadoId);

        if (atendimento.getStatus() == StatusAtendimento.CONVERTIDO) {
            throw new BusinessException("Atendimentos convertidos em processo nao podem ser reabertos.");
        }
        if (atendimento.getStatus() != StatusAtendimento.ARQUIVADO) {
            throw new BusinessException("Apenas atendimentos fechados podem ser reabertos.");
        }

        atendimento.setStatus(StatusAtendimento.ABERTO);
        atendimento.setDataAtualizacao(LocalDateTime.now());

        Atendimento salvo = atendimentoRepository.save(atendimento);

        registrarLog(usuarioLogadoId, TipoAcao.EDITOU,
                "Atendimento reaberto: " + salvo.getAssunto());

        return toResponse(salvo);
    }

    @Transactional
    public ProcessoResponse converterParaProcesso(UUID atendimentoId, UUID usuarioLogadoId) {
        throw new BusinessException("Atendimentos nao sao encaminhados para a area de processos neste fluxo.");
    }

    private VinculoAtendimentoInfo resolverVinculo(CriarAtendimentoRequest request, Cliente cliente) {
        TipoVinculoAtendimento tipo = parseTipoVinculo(request.getTipoVinculo());
        UUID referenciaId = request.getVinculoReferenciaId();
        UUID processoId = request.getProcessoId();

        if (processoId != null) {
            Processo processo = resolverProcessoDoCliente(processoId, cliente);

            if (tipo != null && tipo != TipoVinculoAtendimento.PROCESSO) {
                throw new BusinessException("Quando um processo e informado, o tipo de vinculo deve ser PROCESSO.");
            }
            if (referenciaId != null && !referenciaId.equals(processoId)) {
                throw new BusinessException("A referencia do vinculo deve corresponder ao processo selecionado.");
            }

            return new VinculoAtendimentoInfo(TipoVinculoAtendimento.PROCESSO, processo.getId(), processo);
        }

        if (tipo == null && referenciaId == null) {
            return new VinculoAtendimentoInfo(null, null, null);
        }
        if (tipo == null || referenciaId == null) {
            throw new BusinessException("Tipo de vinculo e referencia devem ser informados em conjunto.");
        }

        if (tipo == TipoVinculoAtendimento.PROCESSO) {
            Processo processo = resolverProcessoDoCliente(referenciaId, cliente);
            return new VinculoAtendimentoInfo(TipoVinculoAtendimento.PROCESSO, processo.getId(), processo);
        }

        if (tipo == TipoVinculoAtendimento.CASO) {
            Caso caso = resolverCasoDoCliente(referenciaId, cliente);
            return new VinculoAtendimentoInfo(TipoVinculoAtendimento.CASO, caso.getId(), null);
        }

        return new VinculoAtendimentoInfo(tipo, referenciaId, null);
    }

    private Processo resolverProcessoDoCliente(UUID processoId, Cliente cliente) {
        Processo processo = processoRepository.findById(processoId)
                .orElseThrow(() -> new ResourceNotFoundException("Processo nao encontrado"));

        if (!processo.getCliente().getId().equals(cliente.getId())) {
            throw new BusinessException("O processo selecionado nao pertence ao cliente informado.");
        }

        return processo;
    }

    private Caso resolverCasoDoCliente(UUID casoId, Cliente cliente) {
        Caso caso = casoRepository.findById(casoId)
                .orElseThrow(() -> new ResourceNotFoundException("Caso nao encontrado"));

        if (!caso.getCliente().getId().equals(cliente.getId())) {
            throw new BusinessException("O caso selecionado nao pertence ao cliente informado.");
        }

        return caso;
    }

    private Unidade resolverUnidade(UUID unidadeId, Cliente cliente, Usuario responsavel, Processo processo) {
        if (unidadeId != null) {
            return unidadeRepository.findById(unidadeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade nao encontrada"));
        }
        if (processo != null && processo.getUnidade() != null) {
            return processo.getUnidade();
        }
        if (cliente.getUnidade() != null) {
            return cliente.getUnidade();
        }
        return responsavel.getUnidade();
    }

    private Atendimento findOrThrow(UUID id) {
        return atendimentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Atendimento nao encontrado"));
    }

    private void validarAutoria(Atendimento atendimento, UUID usuarioLogadoId) {
        if (!atendimento.getUsuario().getId().equals(usuarioLogadoId)) {
            throw new AccessDeniedException("Apenas o autor do atendimento pode editar ou excluir este registo.");
        }
    }

    private AtendimentoResponse toResponse(Atendimento atendimento) {
        return AtendimentoResponse.builder()
                .id(atendimento.getId().toString())
                .clienteId(atendimento.getCliente().getId().toString())
                .clienteNome(atendimento.getCliente().getNome())
                .usuarioId(atendimento.getUsuario().getId().toString())
                .usuarioNome(atendimento.getUsuario().getNome())
                .unidadeId(atendimento.getUnidade() != null ? atendimento.getUnidade().getId().toString() : null)
                .unidadeNome(atendimento.getUnidade() != null ? atendimento.getUnidade().getNome() : null)
                .processoId(atendimento.getProcesso() != null ? atendimento.getProcesso().getId().toString() : null)
                .processoNumero(atendimento.getProcesso() != null ? atendimento.getProcesso().getNumero() : null)
                .vinculoTipo(atendimento.getVinculoTipo() != null ? atendimento.getVinculoTipo().name() : null)
                .vinculoReferenciaId(atendimento.getVinculoReferenciaId() != null ? atendimento.getVinculoReferenciaId().toString() : null)
                .assunto(atendimento.getAssunto())
                .descricao(atendimento.getDescricao())
                .status(atendimento.getStatus().name())
                .etiquetas(desserializarEtiquetas(atendimento.getEtiquetas()))
                .dataCriacao(atendimento.getDataCriacao() != null ? atendimento.getDataCriacao().toString() : null)
                .dataAtualizacao(atendimento.getDataAtualizacao() != null ? atendimento.getDataAtualizacao().toString() : null)
                .build();
    }

    private StatusFilter resolveStatusFilter(String status) {
        if (status == null || status.isBlank()) {
            return new StatusFilter(List.of(StatusAtendimento.values()), false);
        }

        String normalizado = status.trim().toUpperCase();
        return switch (normalizado) {
            case "ABERTOS", "EM_ABERTO" -> new StatusFilter(
                    List.of(StatusAtendimento.ABERTO, StatusAtendimento.EM_ANALISE),
                    true
            );
            case "FECHADOS", "FECHADO" -> new StatusFilter(
                    List.of(StatusAtendimento.CONVERTIDO, StatusAtendimento.ARQUIVADO),
                    true
            );
            default -> new StatusFilter(List.of(parseStatus(normalizado)), true);
        };
    }

    private StatusAtendimento parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return StatusAtendimento.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Status de atendimento invalido: " + status);
        }
    }

    private TipoVinculoAtendimento parseTipoVinculo(String tipoVinculo) {
        if (tipoVinculo == null || tipoVinculo.isBlank()) {
            return null;
        }
        try {
            return TipoVinculoAtendimento.valueOf(tipoVinculo.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Tipo de vinculo invalido: " + tipoVinculo);
        }
    }

    private String normalizarTextoObrigatorio(String value, String fieldName) {
        String normalizado = normalizarTextoOpcional(value, 255);
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
            throw new BusinessException("Um atendimento pode ter no maximo " + LIMITE_ETIQUETAS + " etiquetas.");
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
            throw new BusinessException("As etiquetas do atendimento excedem o limite de armazenamento.");
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
            logAuditoriaService.registrar(usuarioId, acao, ModuloLog.ATENDIMENTOS, descricao);
        } catch (Exception ignored) {
        }
    }

    private record VinculoAtendimentoInfo(
            TipoVinculoAtendimento tipo,
            UUID referenciaId,
            Processo processo
    ) {
    }

    private record StatusFilter(List<StatusAtendimento> statuses, boolean filtrar) {
    }
}
