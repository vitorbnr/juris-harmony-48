package com.viana.service;

import com.viana.dto.response.PublicacaoCapturaExecucaoResponse;
import com.viana.model.PublicacaoCapturaExecucao;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.StatusIntegracao;
import com.viana.repository.PublicacaoCapturaExecucaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PublicacaoCapturaExecucaoService {

    private final PublicacaoCapturaExecucaoRepository repository;

    @Transactional(readOnly = true)
    public List<PublicacaoCapturaExecucaoResponse> listarRecentes(int size) {
        int limit = Math.max(1, Math.min(size, 50));
        return repository.findAllByOrderByIniciadoEmDesc(PageRequest.of(0, limit))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UUID iniciar(FonteIntegracao fonte, String diarioCodigo, LocalDate dataReferencia) {
        PublicacaoCapturaExecucao execucao = PublicacaoCapturaExecucao.builder()
                .fonte(fonte)
                .diarioCodigo(normalizarDiario(diarioCodigo))
                .dataReferencia(dataReferencia)
                .status(StatusIntegracao.PENDENTE)
                .cadernosConsultados(1)
                .build();

        return repository.save(execucao).getId();
    }

    @Transactional
    public void concluirSucesso(UUID id, int cadernosBaixados, int publicacoesLidas, int publicacoesImportadas, String mensagem) {
        PublicacaoCapturaExecucao execucao = repository.findById(id).orElse(null);
        if (execucao == null) {
            return;
        }

        execucao.setCadernosBaixados(cadernosBaixados);
        execucao.setPublicacoesLidas(publicacoesLidas);
        execucao.setPublicacoesImportadas(publicacoesImportadas);
        execucao.setFalhas(0);
        execucao.setMensagem(mensagem);
        execucao.finalizar(StatusIntegracao.SUCESSO);
        repository.save(execucao);
    }

    @Transactional
    public void concluirErro(UUID id, String mensagem) {
        concluirErro(id, mensagem, null, null, null);
    }

    @Transactional
    public void concluirErro(UUID id, String mensagem, String erroTipo, Integer erroCodigoHttp, String erroDetalhe) {
        PublicacaoCapturaExecucao execucao = repository.findById(id).orElse(null);
        if (execucao == null) {
            return;
        }

        execucao.setFalhas(1);
        execucao.setMensagem(mensagem);
        execucao.setErroTipo(limitar(erroTipo, 80));
        execucao.setErroCodigoHttp(erroCodigoHttp);
        execucao.setErroDetalhe(limitar(erroDetalhe, 2000));
        execucao.finalizar(StatusIntegracao.ERRO);
        repository.save(execucao);
    }

    private PublicacaoCapturaExecucaoResponse toResponse(PublicacaoCapturaExecucao execucao) {
        return PublicacaoCapturaExecucaoResponse.builder()
                .id(execucao.getId() != null ? execucao.getId().toString() : null)
                .fonte(execucao.getFonte() != null ? execucao.getFonte().name() : null)
                .diarioCodigo(execucao.getDiarioCodigo())
                .dataReferencia(execucao.getDataReferencia() != null ? execucao.getDataReferencia().toString() : null)
                .status(execucao.getStatus() != null ? execucao.getStatus().name() : null)
                .cadernosConsultados(execucao.getCadernosConsultados())
                .cadernosBaixados(execucao.getCadernosBaixados())
                .publicacoesLidas(execucao.getPublicacoesLidas())
                .publicacoesImportadas(execucao.getPublicacoesImportadas())
                .falhas(execucao.getFalhas())
                .mensagem(execucao.getMensagem())
                .erroTipo(execucao.getErroTipo())
                .erroCodigoHttp(execucao.getErroCodigoHttp())
                .iniciadoEm(execucao.getIniciadoEm() != null ? execucao.getIniciadoEm().toString() : null)
                .finalizadoEm(execucao.getFinalizadoEm() != null ? execucao.getFinalizadoEm().toString() : null)
                .duracaoMs(execucao.getDuracaoMs())
                .build();
    }

    private String normalizarDiario(String value) {
        if (value == null || value.isBlank()) {
            return "NAO_INFORMADO";
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String limitar(String value, int max) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }
}
