package com.viana.service;

import com.viana.dto.response.PublicacaoMonitoramentoResponse;
import com.viana.model.FonteSync;
import com.viana.model.PublicacaoCapturaExecucao;
import com.viana.model.PublicacaoDiarioOficial;
import com.viana.model.enums.EstrategiaColetaPublicacao;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.GrupoDiarioOficialPublicacao;
import com.viana.model.enums.StatusFluxoPublicacao;
import com.viana.model.enums.StatusDiarioOficialPublicacao;
import com.viana.model.enums.StatusIntegracao;
import com.viana.model.enums.StatusTratamento;
import com.viana.model.enums.TipoReferenciaIntegracao;
import com.viana.repository.FonteSyncRepository;
import com.viana.repository.PublicacaoCapturaExecucaoRepository;
import com.viana.repository.PublicacaoDiarioOficialRepository;
import com.viana.repository.PublicacaoFonteMonitoradaRepository;
import com.viana.repository.PublicacaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PublicacaoMonitoramentoService {

    private final PublicacaoFonteMonitoradaRepository fonteMonitoradaRepository;
    private final PublicacaoRepository publicacaoRepository;
    private final FonteSyncRepository fonteSyncRepository;
    private final PublicacaoDiarioOficialRepository diarioOficialRepository;
    private final PublicacaoCapturaExecucaoRepository capturaExecucaoRepository;

    @Value("${api.datajud.base-url:}")
    private String datajudBaseUrl;

    @Value("${api.datajud.api-key:}")
    private String datajudApiKey;

    @Value("${app.sync.djen.sla-hours:36}")
    private int djenSlaHours;

    @Value("${app.sync.djen.history-days:14}")
    private int djenHistoryDays;

    @Transactional(readOnly = true)
    public PublicacaoMonitoramentoResponse buscarStatus() {
        long publicacoesPendentes = publicacaoRepository.countByStatusTratamento(StatusTratamento.PENDENTE);
        long semVinculo = publicacaoRepository.countByProcessoIsNullAndStatusTratamento(StatusTratamento.PENDENTE);
        long semResponsavel = publicacaoRepository.countByStatusFluxoAndStatusTratamento(
                StatusFluxoPublicacao.SEM_RESPONSAVEL,
                StatusTratamento.PENDENTE
        );

        List<PublicacaoMonitoramentoResponse.CapturaDiarioSaude> djenDiarios = buildDjenDiariosSaude();
        return PublicacaoMonitoramentoResponse.builder()
                .fontesMonitoradas(fonteMonitoradaRepository.count())
                .fontesAtivas(fonteMonitoradaRepository.countByAtivoTrue())
                .publicacoesPendentes(publicacoesPendentes)
                .publicacoesSemVinculo(semVinculo)
                .publicacoesSemResponsavel(semResponsavel)
                .datajud(buildDatajudSaude())
                .djen(buildDjenSaude())
                .djenSla(buildDjenSlaResumo(djenDiarios))
                .djenDiarios(djenDiarios)
                .djenHistorico(buildDjenHistorico())
                .orientacaoOperacional("Monitoramento sem scraping por padrao: DJEN para publicacoes judiciais por nome/OAB, DataJud para processos cadastrados e Domicilio apenas na Inbox em modo seguro.")
                .build();
    }

    @Transactional(readOnly = true)
    public List<PublicacaoMonitoramentoResponse.CapturaDiarioSaude> listarDjenDiariosSaude() {
        return buildDjenDiariosSaude();
    }

    private List<PublicacaoMonitoramentoResponse.CapturaDiarioSaude> buildDjenDiariosSaude() {
        List<PublicacaoDiarioOficial> diariosColetaveis = diarioOficialRepository
                .findByGrupoAndRequerScrapingFalseAndAtivoTrueOrderByUfAscNomeAsc(GrupoDiarioOficialPublicacao.DJEN)
                .stream()
                .filter(this::isDiarioColetavelAgora)
                .sorted(Comparator
                        .comparing((PublicacaoDiarioOficial diario) -> diario.getUf() == null ? "ZZ" : diario.getUf())
                        .thenComparing(PublicacaoDiarioOficial::getCodigo))
                .toList();

        List<String> codigos = diariosColetaveis.stream()
                .map(diario -> diario.getCodigo().toUpperCase(Locale.ROOT))
                .toList();
        if (codigos.isEmpty()) {
            return List.of();
        }

        int limit = Math.max(200, codigos.size() * 5);
        Map<String, PublicacaoCapturaExecucao> ultimasPorDiario = new LinkedHashMap<>();
        capturaExecucaoRepository.findByFonteAndDiarioCodigoInOrderByIniciadoEmDesc(
                        FonteIntegracao.DJEN,
                        codigos,
                        PageRequest.of(0, limit)
                )
                .forEach(execucao -> ultimasPorDiario.putIfAbsent(
                        execucao.getDiarioCodigo().toUpperCase(Locale.ROOT),
                        execucao
                ));

        PublicacaoCapturaExecucao ultimaGlobalComunica = capturaExecucaoRepository
                .findByFonteAndDiarioCodigoInOrderByIniciadoEmDesc(
                        FonteIntegracao.DJEN,
                        List.of("COMUNICA"),
                        PageRequest.of(0, 1)
                )
                .stream()
                .findFirst()
                .orElse(null);

        LocalDateTime agora = LocalDateTime.now();
        return diariosColetaveis.stream()
                .map(diario -> toCapturaDiarioSaude(
                        diario,
                        ultimasPorDiario.getOrDefault(diario.getCodigo().toUpperCase(Locale.ROOT), ultimaGlobalComunica),
                        agora
                ))
                .toList();
    }

    private PublicacaoMonitoramentoResponse.CapturaDiarioSaude toCapturaDiarioSaude(
            PublicacaoDiarioOficial diario,
            PublicacaoCapturaExecucao ultima,
            LocalDateTime agora
    ) {
        String status = resolverStatusCaptura(ultima, agora);
        Long horasDesdeUltimaExecucao = ultima != null && ultima.getIniciadoEm() != null
                ? Math.max(0, Duration.between(ultima.getIniciadoEm(), agora).toHours())
                : null;

        return PublicacaoMonitoramentoResponse.CapturaDiarioSaude.builder()
                .codigo(diario.getCodigo())
                .nome(diario.getNome())
                .uf(diario.getUf())
                .status(status)
                .ultimoStatus(ultima != null && ultima.getStatus() != null ? ultima.getStatus().name() : null)
                .dataReferencia(ultima != null && ultima.getDataReferencia() != null ? ultima.getDataReferencia().toString() : null)
                .ultimoSyncEm(ultima != null && ultima.getIniciadoEm() != null ? ultima.getIniciadoEm().toString() : null)
                .horasDesdeUltimaExecucao(horasDesdeUltimaExecucao)
                .publicacoesLidas(ultima != null ? ultima.getPublicacoesLidas() : null)
                .publicacoesImportadas(ultima != null ? ultima.getPublicacoesImportadas() : null)
                .mensagem(ultima != null ? ultima.getMensagem() : "Coletor ativo, aguardando primeira execucao.")
                .erroTipo(ultima != null ? ultima.getErroTipo() : null)
                .erroCodigoHttp(ultima != null ? ultima.getErroCodigoHttp() : null)
                .reprocessavel(ultima != null && ultima.getStatus() == StatusIntegracao.ERRO)
                .build();
    }

    private String resolverStatusCaptura(PublicacaoCapturaExecucao ultima, LocalDateTime agora) {
        if (ultima == null) {
            return "NUNCA_EXECUTADO";
        }
        if (ultima.getStatus() == StatusIntegracao.ERRO) {
            return "ERRO";
        }
        if (ultima.getIniciadoEm() != null && Duration.between(ultima.getIniciadoEm(), agora).toHours() > Math.max(1, djenSlaHours)) {
            return "ATRASADO";
        }

        String mensagem = ultima.getMensagem() != null ? ultima.getMensagem().toLowerCase(Locale.ROOT) : "";
        if (mensagem.contains("sem caderno")) {
            return "SEM_CADERNO";
        }
        if (mensagem.contains("nenhuma publicacao bateu")
                || ((ultima.getPublicacoesLidas() != null && ultima.getPublicacoesLidas() > 0)
                && (ultima.getPublicacoesImportadas() == null || ultima.getPublicacoesImportadas() == 0))) {
            return "SEM_MATCH";
        }
        return "SAUDAVEL";
    }

    private PublicacaoMonitoramentoResponse.CapturaSlaResumo buildDjenSlaResumo(
            List<PublicacaoMonitoramentoResponse.CapturaDiarioSaude> diarios
    ) {
        int saudaveis = countStatus(diarios, "SAUDAVEL", "SEM_CADERNO", "SEM_MATCH");
        int atrasados = countStatus(diarios, "ATRASADO");
        int comErro = countStatus(diarios, "ERRO");
        int semCaderno = countStatus(diarios, "SEM_CADERNO");
        int semMatch = countStatus(diarios, "SEM_MATCH");
        int nuncaExecutados = countStatus(diarios, "NUNCA_EXECUTADO");

        return PublicacaoMonitoramentoResponse.CapturaSlaResumo.builder()
                .total(diarios.size())
                .saudaveis(saudaveis)
                .atrasados(atrasados)
                .comErro(comErro)
                .semCaderno(semCaderno)
                .semMatch(semMatch)
                .nuncaExecutados(nuncaExecutados)
                .slaHoras(Math.max(1, djenSlaHours))
                .status(resolverStatusSla(diarios.size(), comErro, atrasados, nuncaExecutados))
                .build();
    }

    private List<PublicacaoMonitoramentoResponse.CapturaHistoricoDia> buildDjenHistorico() {
        int dias = Math.max(1, Math.min(90, djenHistoryDays));
        LocalDate hoje = LocalDate.now();
        LocalDate inicio = hoje.minusDays(dias - 1L);
        Map<LocalDate, CapturaHistoricoAcumulado> historico = new LinkedHashMap<>();
        for (int i = 0; i < dias; i++) {
            historico.put(inicio.plusDays(i), new CapturaHistoricoAcumulado());
        }

        capturaExecucaoRepository.findByFonteAndIniciadoEmGreaterThanEqualOrderByIniciadoEmAsc(
                        FonteIntegracao.DJEN,
                        inicio.atStartOfDay()
                )
                .forEach(execucao -> {
                    LocalDate data = execucao.getDataReferencia() != null
                            ? execucao.getDataReferencia()
                            : execucao.getIniciadoEm().toLocalDate();
                    CapturaHistoricoAcumulado acumulado = historico.get(data);
                    if (acumulado != null) {
                        acumulado.add(execucao);
                    }
                });

        return historico.entrySet().stream()
                .map(entry -> entry.getValue().toResponse(entry.getKey()))
                .toList();
    }

    private int countStatus(List<PublicacaoMonitoramentoResponse.CapturaDiarioSaude> diarios, String... statuses) {
        List<String> statusList = List.of(statuses);
        return (int) diarios.stream()
                .filter(diario -> statusList.contains(diario.getStatus()))
                .count();
    }

    private String resolverStatusSla(int total, int comErro, int atrasados, int nuncaExecutados) {
        if (total == 0) {
            return "SEM_COLETORES";
        }
        if (comErro > 0) {
            return "COM_ERROS";
        }
        if (atrasados > 0) {
            return "ATRASADO";
        }
        if (nuncaExecutados == total) {
            return "AGUARDANDO_PRIMEIRA_EXECUCAO";
        }
        if (nuncaExecutados > 0) {
            return "PARCIAL";
        }
        return "SAUDAVEL";
    }

    private boolean isDiarioColetavelAgora(PublicacaoDiarioOficial diario) {
        return Boolean.TRUE.equals(diario.getAtivo())
                && !Boolean.TRUE.equals(diario.getRequerScraping())
                && diario.getStatus() != StatusDiarioOficialPublicacao.NAO_SUPORTADO
                && (diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.CADERNO_DJEN
                || diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.API_OFICIAL);
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

    private static class CapturaHistoricoAcumulado {
        private int totalExecucoes;
        private int sucessos;
        private int erros;
        private int pendentes;
        private int cadernosConsultados;
        private int cadernosBaixados;
        private int publicacoesLidas;
        private int publicacoesImportadas;
        private int falhas;
        private long duracaoTotalMs;
        private int duracoes;

        void add(PublicacaoCapturaExecucao execucao) {
            totalExecucoes++;
            if (execucao.getStatus() == StatusIntegracao.SUCESSO) {
                sucessos++;
            } else if (execucao.getStatus() == StatusIntegracao.ERRO) {
                erros++;
            } else {
                pendentes++;
            }
            cadernosConsultados += valor(execucao.getCadernosConsultados());
            cadernosBaixados += valor(execucao.getCadernosBaixados());
            publicacoesLidas += valor(execucao.getPublicacoesLidas());
            publicacoesImportadas += valor(execucao.getPublicacoesImportadas());
            falhas += valor(execucao.getFalhas());
            if (execucao.getDuracaoMs() != null && execucao.getDuracaoMs() >= 0) {
                duracaoTotalMs += execucao.getDuracaoMs();
                duracoes++;
            }
        }

        PublicacaoMonitoramentoResponse.CapturaHistoricoDia toResponse(LocalDate data) {
            return PublicacaoMonitoramentoResponse.CapturaHistoricoDia.builder()
                    .data(data.toString())
                    .totalExecucoes(totalExecucoes)
                    .sucessos(sucessos)
                    .erros(erros)
                    .pendentes(pendentes)
                    .cadernosConsultados(cadernosConsultados)
                    .cadernosBaixados(cadernosBaixados)
                    .publicacoesLidas(publicacoesLidas)
                    .publicacoesImportadas(publicacoesImportadas)
                    .falhas(falhas)
                    .duracaoMediaMs(duracoes > 0 ? duracaoTotalMs / duracoes : null)
                    .status(resolverStatus())
                    .build();
        }

        private String resolverStatus() {
            if (totalExecucoes == 0) {
                return "SEM_EXECUCAO";
            }
            if (erros > 0) {
                return "COM_ERROS";
            }
            if (pendentes > 0) {
                return "PENDENTE";
            }
            if (publicacoesImportadas > 0) {
                return "COM_CAPTURA";
            }
            return "EXECUTADO";
        }

        private int valor(Integer value) {
            return value != null ? value : 0;
        }
    }
}
