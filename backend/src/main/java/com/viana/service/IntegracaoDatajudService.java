package com.viana.service;

import com.viana.dto.response.IntegracaoDatajudResponse;
import com.viana.model.FonteSync;
import com.viana.model.Processo;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.StatusIntegracao;
import com.viana.model.enums.TipoReferenciaIntegracao;
import com.viana.repository.FonteSyncRepository;
import com.viana.repository.ProcessoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IntegracaoDatajudService {

    private final FonteSyncRepository fonteSyncRepository;
    private final ProcessoRepository processoRepository;

    @Value("${api.datajud.base-url:}")
    private String datajudBaseUrl;

    @Value("${api.datajud.api-key:}")
    private String datajudApiKey;

    @Value("${app.sync.datajud.cron:0 0 */4 * * *}")
    private String datajudCron;

    @Value("${app.sync.datajud.stale-hours:4}")
    private Integer datajudStaleHours;

    @Transactional(readOnly = true)
    public IntegracaoDatajudResponse buscarDiagnostico() {
        long processosMonitorados = fonteSyncRepository.countByFonteAndReferenciaTipo(
                FonteIntegracao.DATAJUD,
                TipoReferenciaIntegracao.PROCESSO
        );
        long processosComErro = fonteSyncRepository.countByFonteAndReferenciaTipoAndStatus(
                FonteIntegracao.DATAJUD,
                TipoReferenciaIntegracao.PROCESSO,
                StatusIntegracao.ERRO
        );
        long processosPendentes = fonteSyncRepository.countByFonteAndReferenciaTipoAndStatus(
                FonteIntegracao.DATAJUD,
                TipoReferenciaIntegracao.PROCESSO,
                StatusIntegracao.PENDENTE
        );
        long processosSaudaveis = fonteSyncRepository.countByFonteAndReferenciaTipoAndStatus(
                FonteIntegracao.DATAJUD,
                TipoReferenciaIntegracao.PROCESSO,
                StatusIntegracao.SUCESSO
        );

        FonteSync ultimoSync = fonteSyncRepository
                .findFirstByFonteAndReferenciaTipoOrderByAtualizadoEmDesc(FonteIntegracao.DATAJUD, TipoReferenciaIntegracao.PROCESSO)
                .orElse(null);

        List<FonteSync> falhas = fonteSyncRepository.findTop10ByFonteAndReferenciaTipoAndStatusOrderByAtualizadoEmDesc(
                FonteIntegracao.DATAJUD,
                TipoReferenciaIntegracao.PROCESSO,
                StatusIntegracao.ERRO
        );

        Map<UUID, Processo> processosPorId = processoRepository.findAllById(
                falhas.stream().map(FonteSync::getReferenciaId).toList()
        ).stream().collect(Collectors.toMap(Processo::getId, Function.identity()));

        return IntegracaoDatajudResponse.builder()
                .prontaParaConsumo(isConfigured(datajudBaseUrl) && isConfigured(datajudApiKey))
                .baseUrl(datajudBaseUrl)
                .baseUrlConfigurada(isConfigured(datajudBaseUrl))
                .apiKeyConfigurada(isConfigured(datajudApiKey))
                .cron(datajudCron)
                .staleHours(datajudStaleHours)
                .processosMonitorados(processosMonitorados)
                .processosSaudaveis(processosSaudaveis)
                .processosComErro(processosComErro)
                .processosPendentes(processosPendentes)
                .ultimoSync(toSyncResumo(ultimoSync))
                .falhasRecentes(falhas.stream()
                        .map(sync -> toFalhaResumo(sync, processosPorId.get(sync.getReferenciaId())))
                        .toList())
                .build();
    }

    private boolean isConfigured(String value) {
        return value != null && !value.isBlank();
    }

    private IntegracaoDatajudResponse.SyncResumo toSyncResumo(FonteSync fonteSync) {
        if (fonteSync == null) {
            return null;
        }

        return IntegracaoDatajudResponse.SyncResumo.builder()
                .status(fonteSync.getStatus().name())
                .ultimoSyncEm(fonteSync.getUltimoSyncEm() != null ? fonteSync.getUltimoSyncEm().toString() : null)
                .ultimoSucessoEm(fonteSync.getUltimoSucessoEm() != null ? fonteSync.getUltimoSucessoEm().toString() : null)
                .proximoSyncEm(fonteSync.getProximoSyncEm() != null ? fonteSync.getProximoSyncEm().toString() : null)
                .tentativas(fonteSync.getTentativas())
                .mensagem(fonteSync.getUltimaMensagem())
                .build();
    }

    private IntegracaoDatajudResponse.FalhaResumo toFalhaResumo(FonteSync fonteSync, Processo processo) {
        return IntegracaoDatajudResponse.FalhaResumo.builder()
                .syncId(fonteSync.getId().toString())
                .processoId(processo != null ? processo.getId().toString() : null)
                .processoNumero(processo != null ? processo.getNumero() : fonteSync.getReferenciaExterna())
                .clienteNome(processo != null && processo.getCliente() != null ? processo.getCliente().getNome() : null)
                .status(fonteSync.getStatus().name())
                .ultimoSyncEm(fonteSync.getUltimoSyncEm() != null ? fonteSync.getUltimoSyncEm().toString() : null)
                .proximoSyncEm(fonteSync.getProximoSyncEm() != null ? fonteSync.getProximoSyncEm().toString() : null)
                .tentativas(fonteSync.getTentativas())
                .mensagem(fonteSync.getUltimaMensagem())
                .build();
    }
}
