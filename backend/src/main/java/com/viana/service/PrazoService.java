package com.viana.service;

import com.viana.dto.request.AtualizarPrazoRequest;
import com.viana.dto.request.CriarPrazoRequest;
import com.viana.dto.response.PrazoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Prazo;
import com.viana.model.Processo;
import com.viana.model.Unidade;
import com.viana.model.Usuario;
import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.PrioridadePrazo;
import com.viana.model.enums.TipoAcao;
import com.viana.model.enums.TipoPrazo;
import com.viana.model.enums.TipoNotificacao;
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
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PrazoService {

    private final PrazoRepository prazoRepository;
    private final ProcessoRepository processoRepository;
    private final UsuarioRepository usuarioRepository;
    private final UnidadeRepository unidadeRepository;
    private final LogAuditoriaService logAuditoriaService;
    private final NotificacaoService notificacaoService;

    @Transactional(readOnly = true)
    public List<PrazoResponse> getCalendario(UUID usuarioLogadoId, UUID unidadeId,
                                              LocalDate inicio, LocalDate fim) {
        List<Prazo> prazos = prazoRepository.findCalendario(inicio, fim, usuarioLogadoId, unidadeId);
        return prazos.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<PrazoResponse> listarProximos(UUID advogadoId, int limit) {
        LocalDate hoje = LocalDate.now();
        return prazoRepository.findTop5ByAdvogadoIdAndConcluidoFalseAndDataGreaterThanEqualOrderByDataAsc(advogadoId, hoje)
                .stream()
                .map(this::toResponse)
                .toList();
    }
 
    @Transactional(readOnly = true)
    public Page<PrazoResponse> listar(UUID unidadeId, String tipo, Boolean concluido,
                                       UUID advogadoId, Pageable pageable) {
        TipoPrazo tipoEnum = parseEnum(TipoPrazo.class, tipo);
        return prazoRepository.findAllWithFilters(unidadeId, tipoEnum, concluido, advogadoId, pageable)
                .map(this::toResponse);
    }

    @Transactional
    public PrazoResponse criar(CriarPrazoRequest request, UUID usuarioLogadoId) {
        TipoPrazo tipoEnum = parseEnumRequired(TipoPrazo.class, request.getTipo(), "Tipo");
        PrioridadePrazo prioridadeEnum = parseEnumRequired(PrioridadePrazo.class, request.getPrioridade(), "Prioridade");

        Processo processo = null;
        if (request.getProcessoId() != null) {
            processo = processoRepository.findById(request.getProcessoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Processo não encontrado"));
        }

        Usuario advogado = usuarioRepository.findById(usuarioLogadoId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário logado não encontrado"));

        Unidade unidade = null;
        if (request.getUnidadeId() != null) {
            unidade = unidadeRepository.findById(request.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        }

        Prazo prazo = Prazo.builder()
                .titulo(request.getTitulo())
                .processo(processo)
                .data(request.getData())
                .hora(request.getHora())
                .tipo(tipoEnum)
                .prioridade(prioridadeEnum)
                .advogado(advogado)
                .descricao(request.getDescricao())
                .unidade(unidade)
                .build();

        PrazoResponse response = toResponse(prazoRepository.save(prazo));

        try {
            logAuditoriaService.registrar(usuarioLogadoId, TipoAcao.CRIOU, ModuloLog.PRAZOS,
                    "Prazo criado: " + request.getTitulo() + " para " + request.getData());
            
            notificacaoService.criarNotificacao(usuarioLogadoId, 
                    "Novo Prazo Registrado",
                    "Você registrou um novo prazo para o dia " + request.getData(),
                    TipoNotificacao.PRAZO,
                    "prazos");
        } catch (Exception ignored) {}

        return response;
    }

    @Transactional
    public PrazoResponse atualizar(UUID id, AtualizarPrazoRequest request, UUID usuarioLogadoId) {
        Prazo prazo = prazoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prazo não encontrado"));

        if (!prazo.getAdvogado().getId().equals(usuarioLogadoId)) {
            throw new BusinessException("Você não tem permissão para editar prazos de outros usuários.");
        }

        if (request.getTitulo() != null)    prazo.setTitulo(request.getTitulo());
        if (request.getData() != null)      prazo.setData(request.getData());
        if (request.getHora() != null)      prazo.setHora(request.getHora());
        if (request.getDescricao() != null) prazo.setDescricao(request.getDescricao());

        if (request.getTipo() != null) {
            prazo.setTipo(parseEnumRequired(TipoPrazo.class, request.getTipo(), "Tipo"));
        }
        if (request.getPrioridade() != null) {
            prazo.setPrioridade(parseEnumRequired(PrioridadePrazo.class, request.getPrioridade(), "Prioridade"));
        }
        
        if (request.getProcessoId() != null) {
            Processo p = processoRepository.findById(request.getProcessoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Processo não encontrado"));
            prazo.setProcesso(p);
        }
        if (request.getUnidadeId() != null) {
            Unidade u = unidadeRepository.findById(request.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
            prazo.setUnidade(u);
        }

        try {
            logAuditoriaService.registrar(usuarioLogadoId, TipoAcao.EDITOU, ModuloLog.PRAZOS,
                    "Prazo atualizado: " + prazo.getTitulo());
        } catch (Exception ignored) {}

        return toResponse(prazoRepository.save(prazo));
    }

    @Transactional
    public PrazoResponse marcarConcluido(UUID id, UUID usuarioLogadoId) {
        Prazo prazo = prazoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prazo não encontrado"));

        // Isolamento total: apenas o próprio dono do prazo pode concluí-lo.
        // Nem ADMINISTRADOR tem exceção — prazos são estritamente pessoais.
        // (Mesma regra já aplicada em atualizar())
        if (prazo.getAdvogado() == null || !prazo.getAdvogado().getId().equals(usuarioLogadoId)) {
            throw new BusinessException("Você não tem permissão para alterar prazos de outros usuários.");
        }

        prazo.setConcluido(!prazo.getConcluido());
        return toResponse(prazoRepository.save(prazo));
    }

    @Transactional
    public void excluir(UUID id) {
        if (!prazoRepository.existsById(id)) {
            throw new ResourceNotFoundException("Prazo não encontrado");
        }
        prazoRepository.deleteById(id);
    }

    public PrazoResponse toResponse(Prazo p) {
        return PrazoResponse.builder()
                .id(p.getId().toString())
                .titulo(p.getTitulo())
                .processoId(p.getProcesso() != null ? p.getProcesso().getId().toString() : null)
                .processoNumero(p.getProcesso() != null ? p.getProcesso().getNumero() : null)
                .clienteNome(p.getProcesso() != null ? p.getProcesso().getCliente().getNome() : null)
                .data(p.getData().toString())
                .hora(p.getHora() != null ? p.getHora().toString() : null)
                .tipo(p.getTipo().name().toLowerCase())
                .prioridade(p.getPrioridade().name().toLowerCase())
                .concluido(p.getConcluido())
                .advogadoId(p.getAdvogado() != null ? p.getAdvogado().getId().toString() : null)
                .advogadoNome(p.getAdvogado() != null ? p.getAdvogado().getNome() : null)
                .descricao(p.getDescricao())
                .unidadeId(p.getUnidade() != null ? p.getUnidade().getId().toString() : null)
                .build();
    }

    private <T extends Enum<T>> T parseEnum(Class<T> clazz, String value) {
        if (value == null || value.isBlank()) return null;
        try { return Enum.valueOf(clazz, value.toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }

    private <T extends Enum<T>> T parseEnumRequired(Class<T> clazz, String value, String fieldName) {
        try { return Enum.valueOf(clazz, value.toUpperCase()); }
        catch (IllegalArgumentException e) { throw new BusinessException(fieldName + " inválido: " + value); }
    }
}
