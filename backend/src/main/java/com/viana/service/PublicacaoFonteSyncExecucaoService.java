package com.viana.service;

import com.viana.dto.response.PublicacaoDjenSyncResponse;
import com.viana.dto.response.PublicacaoFonteSyncExecucaoResponse;
import com.viana.model.PublicacaoFonteMonitorada;
import com.viana.model.PublicacaoFonteSyncExecucao;
import com.viana.exception.ResourceNotFoundException;
import com.viana.repository.PublicacaoFonteSyncExecucaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PublicacaoFonteSyncExecucaoService {

    public static final String TIPO_CAPTURA_DJEN = "CAPTURA_DJEN";
    public static final String TIPO_BACKFILL_DJEN = "BACKFILL_DJEN";

    private static final String STATUS_PENDENTE = "PENDENTE";
    private static final String STATUS_SUCESSO = "SUCESSO";
    private static final String STATUS_ERRO = "ERRO";
    private static final String STATUS_IGNORADO = "IGNORADO";

    private final PublicacaoFonteSyncExecucaoRepository repository;

    @Transactional
    public UUID iniciarBackfillDjen(PublicacaoFonteMonitorada fonte, LocalDate dataInicio, LocalDate dataFim) {
        PublicacaoFonteSyncExecucao execucao = PublicacaoFonteSyncExecucao.builder()
                .fonteMonitorada(fonte)
                .tipoExecucao(TIPO_BACKFILL_DJEN)
                .status(STATUS_PENDENTE)
                .dataInicio(dataInicio)
                .dataFim(dataFim)
                .iniciadoEm(LocalDateTime.now())
                .build();

        return repository.save(execucao).getId();
    }

    @Transactional
    public PublicacaoFonteSyncExecucaoResponse buscarResponse(UUID execucaoId) {
        PublicacaoFonteSyncExecucao execucao = repository.findById(execucaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Execucao de fonte monitorada nao encontrada"));
        return toResponse(execucao);
    }

    @Transactional
    public void registrarCapturaDjen(
            PublicacaoFonteMonitorada fonte,
            LocalDate dataInicio,
            LocalDate dataFim,
            int cadernosConsultados,
            int cadernosBaixados,
            int publicacoesLidas,
            int publicacoesImportadas,
            int falhas,
            String mensagem,
            LocalDateTime iniciadoEm,
            LocalDateTime finalizadoEm,
            LocalDateTime proximaExecucaoEm
    ) {
        LocalDateTime inicio = iniciadoEm != null ? iniciadoEm : LocalDateTime.now();
        LocalDateTime fim = finalizadoEm != null ? finalizadoEm : LocalDateTime.now();
        PublicacaoFonteSyncExecucao execucao = PublicacaoFonteSyncExecucao.builder()
                .fonteMonitorada(fonte)
                .tipoExecucao(TIPO_CAPTURA_DJEN)
                .status(falhas > 0 ? STATUS_ERRO : STATUS_SUCESSO)
                .dataInicio(dataInicio)
                .dataFim(dataFim)
                .cadernosConsultados(Math.max(0, cadernosConsultados))
                .cadernosBaixados(Math.max(0, cadernosBaixados))
                .publicacoesLidas(Math.max(0, publicacoesLidas))
                .publicacoesImportadas(Math.max(0, publicacoesImportadas))
                .falhas(Math.max(0, falhas))
                .mensagem(mensagem)
                .iniciadoEm(inicio)
                .finalizadoEm(fim)
                .proximaExecucaoEm(proximaExecucaoEm)
                .duracaoMs(Duration.between(inicio, fim).toMillis())
                .build();

        repository.save(execucao);
    }

    @Transactional
    public UUID registrarBackfillIgnorado(
            PublicacaoFonteMonitorada fonte,
            LocalDate dataInicio,
            LocalDate dataFim,
            String mensagem
    ) {
        PublicacaoFonteSyncExecucao execucao = PublicacaoFonteSyncExecucao.builder()
                .fonteMonitorada(fonte)
                .tipoExecucao(TIPO_BACKFILL_DJEN)
                .status(STATUS_IGNORADO)
                .dataInicio(dataInicio)
                .dataFim(dataFim)
                .mensagem(mensagem)
                .iniciadoEm(LocalDateTime.now())
                .finalizadoEm(LocalDateTime.now())
                .duracaoMs(0L)
                .build();

        return repository.save(execucao).getId();
    }

    @Transactional
    public void concluir(UUID execucaoId, PublicacaoDjenSyncResponse resultado) {
        PublicacaoFonteSyncExecucao execucao = repository.findById(execucaoId).orElse(null);
        if (execucao == null) {
            return;
        }

        execucao.setStatus(resolverStatus(resultado));
        execucao.setCadernosConsultados(resultado != null ? resultado.getCadernosConsultados() : 0);
        execucao.setCadernosBaixados(resultado != null ? resultado.getCadernosBaixados() : 0);
        execucao.setPublicacoesLidas(resultado != null ? resultado.getPublicacoesLidas() : 0);
        execucao.setPublicacoesImportadas(resultado != null ? resultado.getPublicacoesImportadas() : 0);
        execucao.setFalhas(resultado != null ? resultado.getFalhas() : 0);
        execucao.setMensagem(resultado != null ? resultado.getMensagem() : null);
        finalizar(execucao);

        repository.save(execucao);
    }

    @Transactional
    public void concluirIgnorado(UUID execucaoId, String mensagem) {
        PublicacaoFonteSyncExecucao execucao = repository.findById(execucaoId).orElse(null);
        if (execucao == null) {
            return;
        }

        execucao.setStatus(STATUS_IGNORADO);
        execucao.setMensagem(mensagem);
        finalizar(execucao);

        repository.save(execucao);
    }

    public PublicacaoFonteSyncExecucaoResponse toResponse(PublicacaoFonteSyncExecucao execucao) {
        if (execucao == null) {
            return null;
        }
        return PublicacaoFonteSyncExecucaoResponse.builder()
                .id(execucao.getId() != null ? execucao.getId().toString() : null)
                .tipoExecucao(execucao.getTipoExecucao())
                .status(execucao.getStatus())
                .dataInicio(execucao.getDataInicio() != null ? execucao.getDataInicio().toString() : null)
                .dataFim(execucao.getDataFim() != null ? execucao.getDataFim().toString() : null)
                .cadernosConsultados(execucao.getCadernosConsultados())
                .cadernosBaixados(execucao.getCadernosBaixados())
                .publicacoesLidas(execucao.getPublicacoesLidas())
                .publicacoesImportadas(execucao.getPublicacoesImportadas())
                .falhas(execucao.getFalhas())
                .mensagem(execucao.getMensagem())
                .iniciadoEm(execucao.getIniciadoEm() != null ? execucao.getIniciadoEm().toString() : null)
                .finalizadoEm(execucao.getFinalizadoEm() != null ? execucao.getFinalizadoEm().toString() : null)
                .proximaExecucaoEm(execucao.getProximaExecucaoEm() != null ? execucao.getProximaExecucaoEm().toString() : null)
                .duracaoMs(execucao.getDuracaoMs())
                .build();
    }

    @Transactional
    public void concluirErro(UUID execucaoId, Exception exception) {
        PublicacaoFonteSyncExecucao execucao = repository.findById(execucaoId).orElse(null);
        if (execucao == null) {
            return;
        }

        execucao.setStatus(STATUS_ERRO);
        execucao.setFalhas(Math.max(1, execucao.getFalhas() != null ? execucao.getFalhas() : 0));
        execucao.setMensagem(exception != null && exception.getMessage() != null
                ? exception.getMessage()
                : "Falha ao executar backfill da fonte monitorada.");
        finalizar(execucao);

        repository.save(execucao);
    }

    private String resolverStatus(PublicacaoDjenSyncResponse resultado) {
        if (resultado == null) {
            return STATUS_ERRO;
        }
        if (resultado.isEmExecucao()) {
            return STATUS_IGNORADO;
        }
        if (resultado.getFalhas() > 0) {
            return STATUS_ERRO;
        }
        return STATUS_SUCESSO;
    }

    private void finalizar(PublicacaoFonteSyncExecucao execucao) {
        LocalDateTime fim = LocalDateTime.now();
        execucao.setFinalizadoEm(fim);
        if (execucao.getIniciadoEm() != null) {
            execucao.setDuracaoMs(Duration.between(execucao.getIniciadoEm(), fim).toMillis());
        }
    }
}
