package com.viana.service;

import com.viana.dto.response.PublicacaoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.model.Processo;
import com.viana.model.Publicacao;
import com.viana.model.enums.StatusTratamento;
import com.viana.repository.PublicacaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PublicacaoService {

    private final PublicacaoRepository publicacaoRepository;

    @Transactional(readOnly = true)
    public List<PublicacaoResponse> listar(String status) {
        StatusTratamento statusTratamento = parseStatus(status);

        List<Publicacao> publicacoes = statusTratamento != null
                ? publicacaoRepository.findByStatusTratamentoOrderByDataPublicacaoDesc(statusTratamento)
                : publicacaoRepository.findAll(Sort.by(Sort.Direction.DESC, "dataPublicacao"));

        return publicacoes.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PublicacaoResponse atualizarStatus(UUID id, String novoStatus) {
        Publicacao publicacao = publicacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Publicacao nao encontrada"));

        publicacao.setStatusTratamento(parseStatusRequired(novoStatus));
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
}
