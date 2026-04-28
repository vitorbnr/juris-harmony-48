package com.viana.service;

import com.viana.dto.response.PublicacaoMonitoramentoResponse;
import com.viana.model.FonteSync;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.StatusFluxoPublicacao;
import com.viana.model.enums.StatusIntegracao;
import com.viana.model.enums.StatusTratamento;
import com.viana.model.enums.TipoReferenciaIntegracao;
import com.viana.repository.FonteSyncRepository;
import com.viana.repository.PublicacaoFonteMonitoradaRepository;
import com.viana.repository.PublicacaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PublicacaoMonitoramentoService {

    private final PublicacaoFonteMonitoradaRepository fonteMonitoradaRepository;
    private final PublicacaoRepository publicacaoRepository;
    private final FonteSyncRepository fonteSyncRepository;

    @Value("${api.datajud.base-url:}")
    private String datajudBaseUrl;

    @Value("${api.datajud.api-key:}")
    private String datajudApiKey;

    @Value("${api.inlabs.email:}")
    private String inlabsEmail;

    @Value("${api.inlabs.password:}")
    private String inlabsPassword;

    @Transactional(readOnly = true)
    public PublicacaoMonitoramentoResponse buscarStatus() {
        long publicacoesPendentes = publicacaoRepository.countByStatusTratamento(StatusTratamento.PENDENTE);
        long semVinculo = publicacaoRepository.countByProcessoIsNullAndStatusTratamento(StatusTratamento.PENDENTE);
        long semResponsavel = publicacaoRepository.countByStatusFluxoAndStatusTratamento(
                StatusFluxoPublicacao.SEM_RESPONSAVEL,
                StatusTratamento.PENDENTE
        );

        return PublicacaoMonitoramentoResponse.builder()
                .fontesMonitoradas(fonteMonitoradaRepository.count())
                .fontesAtivas(fonteMonitoradaRepository.countByAtivoTrue())
                .publicacoesPendentes(publicacoesPendentes)
                .publicacoesSemVinculo(semVinculo)
                .publicacoesSemResponsavel(semResponsavel)
                .datajud(buildDatajudSaude())
                .djen(buildDjenSaude())
                .dou(buildDouSaude())
                .orientacaoOperacional("Monitoramento sem custo e sem scraping por padrao: DJEN por caderno oficial, DOU/INLABS por dados abertos, DataJud para processos cadastrados e Domicilio apenas na Inbox em modo seguro.")
                .build();
    }

    private PublicacaoMonitoramentoResponse.FonteSaude buildDatajudSaude() {
        FonteSync ultimoSync = fonteSyncRepository
                .findFirstByFonteAndReferenciaTipoOrderByAtualizadoEmDesc(FonteIntegracao.DATAJUD, TipoReferenciaIntegracao.PROCESSO)
                .orElse(null);
        long monitorados = fonteSyncRepository.countByFonteAndReferenciaTipo(FonteIntegracao.DATAJUD, TipoReferenciaIntegracao.PROCESSO);
        long saudaveis = fonteSyncRepository.countByFonteAndReferenciaTipoAndStatus(
                FonteIntegracao.DATAJUD,
                TipoReferenciaIntegracao.PROCESSO,
                StatusIntegracao.SUCESSO
        );
        long erros = fonteSyncRepository.countByFonteAndReferenciaTipoAndStatus(
                FonteIntegracao.DATAJUD,
                TipoReferenciaIntegracao.PROCESSO,
                StatusIntegracao.ERRO
        );

        return PublicacaoMonitoramentoResponse.FonteSaude.builder()
                .fonte("DATAJUD")
                .status(resolveStatusFonte(isConfigured(datajudBaseUrl) && isConfigured(datajudApiKey), erros, ultimoSync))
                .configurada(isConfigured(datajudBaseUrl) && isConfigured(datajudApiKey))
                .monitorados(monitorados)
                .saudaveis(saudaveis)
                .comErro(erros)
                .ultimoSyncEm(ultimoSync != null && ultimoSync.getUltimoSyncEm() != null ? ultimoSync.getUltimoSyncEm().toString() : null)
                .proximoSyncEm(ultimoSync != null && ultimoSync.getProximoSyncEm() != null ? ultimoSync.getProximoSyncEm().toString() : null)
                .mensagem(ultimoSync != null ? ultimoSync.getUltimaMensagem() : "Aguardando primeira sincronizacao.")
                .build();
    }

    private PublicacaoMonitoramentoResponse.FonteSaude buildDjenSaude() {
        long fontesAtivas = fonteMonitoradaRepository.countByAtivoTrue();
        FonteSync ultimoSync = fonteSyncRepository
                .findFirstByFonteAndReferenciaTipoOrderByAtualizadoEmDesc(FonteIntegracao.DJEN, TipoReferenciaIntegracao.INSTITUICAO)
                .orElse(null);
        long monitorados = fonteSyncRepository.countByFonteAndReferenciaTipo(FonteIntegracao.DJEN, TipoReferenciaIntegracao.INSTITUICAO);
        long saudaveis = fonteSyncRepository.countByFonteAndReferenciaTipoAndStatus(
                FonteIntegracao.DJEN,
                TipoReferenciaIntegracao.INSTITUICAO,
                StatusIntegracao.SUCESSO
        );
        long erros = fonteSyncRepository.countByFonteAndReferenciaTipoAndStatus(
                FonteIntegracao.DJEN,
                TipoReferenciaIntegracao.INSTITUICAO,
                StatusIntegracao.ERRO
        );

        return PublicacaoMonitoramentoResponse.FonteSaude.builder()
                .fonte("DJEN")
                .status(resolveStatusDjen(fontesAtivas, erros, ultimoSync))
                .configurada(fontesAtivas > 0)
                .monitorados(monitorados > 0 ? monitorados : fontesAtivas)
                .saudaveis(saudaveis)
                .comErro(erros)
                .ultimoSyncEm(ultimoSync != null && ultimoSync.getUltimoSyncEm() != null ? ultimoSync.getUltimoSyncEm().toString() : null)
                .proximoSyncEm(ultimoSync != null && ultimoSync.getProximoSyncEm() != null ? ultimoSync.getProximoSyncEm().toString() : null)
                .mensagem(ultimoSync != null ? ultimoSync.getUltimaMensagem() : "Fontes monitoradas cadastradas. Aguardando primeira coleta DJEN.")
                .build();
    }

    private String resolveStatusDjen(long fontesAtivas, long erros, FonteSync ultimoSync) {
        if (fontesAtivas == 0) {
            return "SEM_FONTES";
        }
        if (erros > 0) {
            return "COM_ERROS";
        }
        if (ultimoSync == null) {
            return "PREPARADO";
        }
        return "SAUDAVEL";
    }

    private PublicacaoMonitoramentoResponse.FonteSaude buildDouSaude() {
        FonteSync ultimoSync = fonteSyncRepository
                .findFirstByFonteAndReferenciaTipoOrderByAtualizadoEmDesc(FonteIntegracao.DOU, TipoReferenciaIntegracao.INSTITUICAO)
                .orElse(null);
        long monitorados = fonteSyncRepository.countByFonteAndReferenciaTipo(FonteIntegracao.DOU, TipoReferenciaIntegracao.INSTITUICAO);
        long saudaveis = fonteSyncRepository.countByFonteAndReferenciaTipoAndStatus(
                FonteIntegracao.DOU,
                TipoReferenciaIntegracao.INSTITUICAO,
                StatusIntegracao.SUCESSO
        );
        long erros = fonteSyncRepository.countByFonteAndReferenciaTipoAndStatus(
                FonteIntegracao.DOU,
                TipoReferenciaIntegracao.INSTITUICAO,
                StatusIntegracao.ERRO
        );
        boolean configurada = isConfigured(inlabsEmail) && isConfigured(inlabsPassword);

        return PublicacaoMonitoramentoResponse.FonteSaude.builder()
                .fonte("DOU")
                .status(resolveStatusFonte(configurada, erros, ultimoSync))
                .configurada(configurada)
                .monitorados(monitorados)
                .saudaveis(saudaveis)
                .comErro(erros)
                .ultimoSyncEm(ultimoSync != null && ultimoSync.getUltimoSyncEm() != null ? ultimoSync.getUltimoSyncEm().toString() : null)
                .proximoSyncEm(ultimoSync != null && ultimoSync.getProximoSyncEm() != null ? ultimoSync.getProximoSyncEm().toString() : null)
                .mensagem(ultimoSync != null ? ultimoSync.getUltimaMensagem() : "Aguardando primeira coleta DOU/INLABS.")
                .build();
    }

    private String resolveStatusFonte(boolean configurada, long erros, FonteSync ultimoSync) {
        if (!configurada) {
            return "NAO_CONFIGURADA";
        }
        if (erros > 0) {
            return "COM_ERROS";
        }
        if (ultimoSync == null) {
            return "AGUARDANDO";
        }
        return "SAUDAVEL";
    }

    private boolean isConfigured(String value) {
        return value != null && !value.isBlank();
    }
}
