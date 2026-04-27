package com.viana.service;

import com.viana.dto.response.PublicacaoMetricasResponse;
import com.viana.dto.response.PublicacaoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Processo;
import com.viana.model.Publicacao;
import com.viana.model.enums.StatusTratamento;
import com.viana.repository.ProcessoRepository;
import com.viana.repository.PublicacaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PublicacaoService {

    private final PublicacaoRepository publicacaoRepository;
    private final ProcessoRepository processoRepository;

    @Transactional(readOnly = true)
    public List<PublicacaoResponse> listar(String status, String busca, Boolean somenteRiscoPrazo) {
        StatusTratamento statusTratamento = parseStatus(status);
        String buscaNormalizada = normalizarBusca(busca);
        List<Publicacao> publicacoes = publicacaoRepository.buscarParaTriagem(
                statusTratamento,
                buscaNormalizada,
                somenteRiscoPrazo
        );

        return publicacoes.stream()
                .map(this::toResponse)
                .toList();
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
                .build();
    }

    @Transactional
    public PublicacaoResponse atualizarStatus(UUID id, String novoStatus) {
        Publicacao publicacao = publicacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Publicacao nao encontrada"));

        publicacao.setStatusTratamento(parseStatusRequired(novoStatus));
        return toResponse(publicacaoRepository.save(publicacao));
    }

    @Transactional
    public PublicacaoResponse vincularProcesso(UUID publicacaoId, UUID processoId) {
        Publicacao publicacao = publicacaoRepository.findById(publicacaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Publicacao nao encontrada"));

        Processo processo = processoRepository.findById(processoId)
                .orElseThrow(() -> new ResourceNotFoundException("Processo nao encontrado"));

        publicacao.setProcesso(processo);
        return toResponse(publicacaoRepository.save(publicacao));
    }

    private PublicacaoResponse toResponse(Publicacao publicacao) {
        Processo processo = publicacao.getProcesso();

        return PublicacaoResponse.builder()
                .id(publicacao.getId() != null ? publicacao.getId().toString() : null)
                .npu(publicacao.getNpu())
                .tribunalOrigem(publicacao.getTribunalOrigem())
                .teor(publicacao.getTeor())
                .dataPublicacao(publicacao.getDataPublicacao() != null ? publicacao.getDataPublicacao().toString() : null)
                .statusTratamento(publicacao.getStatusTratamento() != null ? publicacao.getStatusTratamento().name() : null)
                .processoId(processo != null && processo.getId() != null ? processo.getId().toString() : null)
                .processoNumero(processo != null ? processo.getNumero() : null)
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

    private String normalizarBusca(String busca) {
        if (busca == null || busca.isBlank()) {
            return null;
        }
        return busca.trim();
    }
}
