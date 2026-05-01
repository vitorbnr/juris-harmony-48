package com.viana.service;

import com.viana.dto.request.IngestarPublicacaoRequest;
import com.viana.dto.response.PublicacaoDjenSyncResponse;
import com.viana.exception.BusinessException;
import com.viana.model.PublicacaoCapturaExecucao;
import com.viana.model.PublicacaoDiarioOficial;
import com.viana.model.PublicacaoFonteMonitorada;
import com.viana.model.Usuario;
import com.viana.model.enums.EstrategiaColetaPublicacao;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.TipoFontePublicacaoMonitorada;
import com.viana.model.enums.TipoNotificacao;
import com.viana.model.enums.UserRole;
import com.viana.repository.PublicacaoFonteMonitoradaRepository;
import com.viana.repository.PublicacaoRepository;
import com.viana.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class PublicacaoDjenColetaService {

    private static final String DJEN_LOCK_NAME = "PUBLICACOES_DJEN_SYNC";
    private static final Pattern CNJ_FORMATADO_PATTERN = Pattern.compile("\\b\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4}\\b");
    private static final Pattern CNJ_DIGITOS_PATTERN = Pattern.compile("\\b\\d{20}\\b");

    private final DjenCadernoClientService djenCadernoClientService;
    private final DjenComunicacaoClientService djenComunicacaoClientService;
    private final PublicacaoFonteMonitoradaRepository fonteMonitoradaRepository;
    private final PublicacaoRepository publicacaoRepository;
    private final PublicacaoService publicacaoService;
    private final FonteSyncService fonteSyncService;
    private final PublicacaoCapturaExecucaoService capturaExecucaoService;
    private final PublicacaoJobLockService jobLockService;
    private final NotificacaoService notificacaoService;
    private final UsuarioRepository usuarioRepository;

    @Value("${app.sync.djen.enabled:false}")
    private boolean enabled;

    @Value("${app.sync.djen.tribunais:}")
    private String tribunaisConfig;

    @Value("${app.sync.djen.lookback-days:3}")
    private int lookbackDays;

    @Value("${app.sync.djen.caderno-tipo:D}")
    private String cadernoTipo;

    @Value("${app.sync.djen.comunicacao.enabled:true}")
    private boolean comunicacaoEnabled;

    @Value("${app.sync.djen.caderno-fallback.enabled:true}")
    private boolean cadernoFallbackEnabled;

    @Value("${app.sync.djen.caderno-fallback.on-empty:false}")
    private boolean cadernoFallbackOnEmpty;

    @Value("${app.sync.djen.lock-ttl-minutes:60}")
    private int lockTtlMinutes;

    @Value("${app.sync.djen.backfill-max-days:31}")
    private int backfillMaxDays;

    public PublicacaoDjenSyncResponse sincronizar(boolean ignorarEnabled) {
        List<PublicacaoFonteMonitorada> fontes = fonteMonitoradaRepository.findByAtivoTrueOrderByNomeExibicaoAsc();
        List<String> tribunais = parseTribunais(fontes);
        boolean temBuscaDireta = comunicacaoEnabled && fontes.stream().anyMatch(this::permiteBuscaDiretaComunicacao);
        if (!enabled && !ignorarEnabled) {
            return PublicacaoDjenSyncResponse.builder()
                    .enabled(false)
                    .tribunais(tribunais)
                    .mensagem("Coleta DJEN desabilitada por configuracao.")
                    .build();
        }

        if (fontes.isEmpty()) {
            return PublicacaoDjenSyncResponse.builder()
                    .enabled(enabled)
                    .tribunais(tribunais)
                    .mensagem("Configure ao menos uma fonte monitorada ativa para coletar DJEN.")
                    .build();
        }

        if (tribunais.isEmpty() && !temBuscaDireta) {
            return PublicacaoDjenSyncResponse.builder()
                    .enabled(enabled)
                    .tribunais(tribunais)
                    .mensagem("Configure ao menos um tribunal DJEN ou uma fonte NOME/OAB para busca direta no Comunica.")
                    .build();
        }

        Optional<PublicacaoJobLockService.JobLockHandle> lock = jobLockService.tentarAdquirir(DJEN_LOCK_NAME, ttlLock());
        if (lock.isEmpty()) {
            return PublicacaoDjenSyncResponse.builder()
                    .enabled(enabled)
                    .tribunais(tribunais)
                    .emExecucao(true)
                    .mensagem("Coleta DJEN ignorada: ja existe outra execucao em andamento.")
                    .build();
        }

        try {
            return executarSincronizacao(fontes, tribunais);
        } finally {
            jobLockService.liberar(lock.get());
        }
    }

    private PublicacaoDjenSyncResponse executarSincronizacao(List<PublicacaoFonteMonitorada> fontes, List<String> tribunais) {
        int diasAvaliados = Math.max(1, lookbackDays);
        int cadernosConsultados = 0;
        int cadernosBaixados = 0;
        int publicacoesLidas = 0;
        int publicacoesImportadas = 0;
        int falhas = 0;
        int importadasGlobal = 0;
        int falhasGlobal = 0;

        for (int dayOffset = 0; dayOffset < diasAvaliados; dayOffset++) {
            LocalDate data = LocalDate.now().minusDays(dayOffset);
            ResultadoColetaCaderno resultadoGlobal = null;

            if (comunicacaoEnabled) {
                resultadoGlobal = coletarComunicacoes(null, data, cadernoTipo, fontes);
                cadernosConsultados++;
                cadernosBaixados += resultadoGlobal.cadernosBaixados();
                publicacoesLidas += resultadoGlobal.publicacoesLidas();
                publicacoesImportadas += resultadoGlobal.publicacoesImportadas();
                falhas += resultadoGlobal.falhas();
                falhasGlobal += resultadoGlobal.falhas();
                importadasGlobal += resultadoGlobal.publicacoesImportadas();
            }

            if (deveExecutarFallbackCaderno(resultadoGlobal, fontes) && !tribunais.isEmpty()) {
                ResultadoAgregadoTribunais resultadoTribunais = coletarCadernosTribunais(tribunais, data, cadernoTipo, fontes);
                cadernosConsultados += resultadoTribunais.cadernosConsultados();
                cadernosBaixados += resultadoTribunais.resultado().cadernosBaixados();
                publicacoesLidas += resultadoTribunais.resultado().publicacoesLidas();
                publicacoesImportadas += resultadoTribunais.resultado().publicacoesImportadas();
                falhas += resultadoTribunais.resultado().falhas();
            }
        }

        if (falhasGlobal == 0 && comunicacaoEnabled) {
            fonteSyncService.registrarSucessoDjen("COMUNICA", importadasGlobal, "Coleta DJEN/Comunica global executada");
        }

        if (falhas > 0) {
            notificarAdministradoresFalha(cadernosConsultados, falhas);
        }

        return PublicacaoDjenSyncResponse.builder()
                .enabled(enabled)
                .tribunais(tribunais)
                .diasAvaliados(diasAvaliados)
                .cadernosConsultados(cadernosConsultados)
                .cadernosBaixados(cadernosBaixados)
                .publicacoesLidas(publicacoesLidas)
                .publicacoesImportadas(publicacoesImportadas)
                .falhas(falhas)
                .mensagem("Coleta DJEN finalizada em modo seguro.")
                .build();
    }

    public PublicacaoDjenSyncResponse sincronizarPeriodo(LocalDate dataInicio, LocalDate dataFim, String tipoCaderno) {
        if (dataInicio == null || dataFim == null) {
            throw new BusinessException("Data inicial e data final sao obrigatorias para backfill DJEN.");
        }
        if (dataInicio.isAfter(dataFim)) {
            throw new BusinessException("Data inicial nao pode ser posterior a data final.");
        }
        if (dataFim.isAfter(LocalDate.now())) {
            throw new BusinessException("Data final do backfill DJEN nao pode ser futura.");
        }

        long diasSolicitados = ChronoUnit.DAYS.between(dataInicio, dataFim) + 1;
        int limiteDias = Math.max(1, backfillMaxDays);
        if (diasSolicitados > limiteDias) {
            throw new BusinessException("Backfill DJEN limitado a " + limiteDias + " dia(s) por execucao.");
        }

        List<PublicacaoFonteMonitorada> fontes = fonteMonitoradaRepository.findByAtivoTrueOrderByNomeExibicaoAsc();
        List<String> tribunais = parseTribunais(fontes);
        boolean temBuscaDireta = comunicacaoEnabled && fontes.stream().anyMatch(this::permiteBuscaDiretaComunicacao);
        if (fontes.isEmpty()) {
            return PublicacaoDjenSyncResponse.builder()
                    .enabled(enabled)
                    .tribunais(tribunais)
                    .diasAvaliados((int) diasSolicitados)
                    .mensagem("Configure ao menos uma fonte monitorada ativa para executar backfill DJEN.")
                    .build();
        }

        if (tribunais.isEmpty() && !temBuscaDireta) {
            return PublicacaoDjenSyncResponse.builder()
                    .enabled(enabled)
                    .tribunais(tribunais)
                    .diasAvaliados((int) diasSolicitados)
                    .mensagem("Configure ao menos um tribunal DJEN ou uma fonte NOME/OAB para busca direta no Comunica.")
                    .build();
        }

        String caderno = tipoCaderno == null || tipoCaderno.isBlank()
                ? cadernoTipo
                : tipoCaderno.trim().toUpperCase(Locale.ROOT);

        Optional<PublicacaoJobLockService.JobLockHandle> lock = jobLockService.tentarAdquirir(DJEN_LOCK_NAME, ttlLock());
        if (lock.isEmpty()) {
            return PublicacaoDjenSyncResponse.builder()
                    .enabled(enabled)
                    .tribunais(referenciasBackfill(tribunais))
                    .diasAvaliados((int) diasSolicitados)
                    .emExecucao(true)
                    .mensagem("Backfill DJEN ignorado: ja existe outra coleta em andamento.")
                    .build();
        }

        try {
            int cadernosConsultados = 0;
            int cadernosBaixados = 0;
            int publicacoesLidas = 0;
            int publicacoesImportadas = 0;
            int falhas = 0;
            int importadasGlobal = 0;
            int falhasGlobal = 0;

            for (LocalDate data = dataInicio; !data.isAfter(dataFim); data = data.plusDays(1)) {
                ResultadoColetaCaderno resultadoGlobal = null;

                if (comunicacaoEnabled) {
                    resultadoGlobal = coletarComunicacoes(null, data, caderno, fontes);
                    cadernosConsultados++;
                    cadernosBaixados += resultadoGlobal.cadernosBaixados();
                    publicacoesLidas += resultadoGlobal.publicacoesLidas();
                    publicacoesImportadas += resultadoGlobal.publicacoesImportadas();
                    falhas += resultadoGlobal.falhas();
                    falhasGlobal += resultadoGlobal.falhas();
                    importadasGlobal += resultadoGlobal.publicacoesImportadas();
                }

                if (deveExecutarFallbackCaderno(resultadoGlobal, fontes) && !tribunais.isEmpty()) {
                    ResultadoAgregadoTribunais resultadoTribunais = coletarCadernosTribunais(tribunais, data, caderno, fontes);
                    cadernosConsultados += resultadoTribunais.cadernosConsultados();
                    cadernosBaixados += resultadoTribunais.resultado().cadernosBaixados();
                    publicacoesLidas += resultadoTribunais.resultado().publicacoesLidas();
                    publicacoesImportadas += resultadoTribunais.resultado().publicacoesImportadas();
                    falhas += resultadoTribunais.resultado().falhas();
                }
            }

            if (falhasGlobal == 0 && comunicacaoEnabled) {
                fonteSyncService.registrarSucessoDjen(
                        "COMUNICA",
                        importadasGlobal,
                        "Backfill DJEN/Comunica executado de " + dataInicio + " a " + dataFim
                );
            }

            if (falhas > 0) {
                notificarAdministradoresFalha(cadernosConsultados, falhas);
            }

            return PublicacaoDjenSyncResponse.builder()
                    .enabled(enabled)
                    .tribunais(referenciasBackfill(tribunais))
                    .diasAvaliados((int) diasSolicitados)
                    .cadernosConsultados(cadernosConsultados)
                    .cadernosBaixados(cadernosBaixados)
                    .publicacoesLidas(publicacoesLidas)
                    .publicacoesImportadas(publicacoesImportadas)
                    .falhas(falhas)
                    .mensagem("Backfill DJEN finalizado. Publicacoes com CNJ sem processo cadastrado ficam na fila sem vinculo.")
                    .build();
        } finally {
            jobLockService.liberar(lock.get());
        }
    }

    public PublicacaoDjenSyncResponse sincronizarReplay(String tribunal, LocalDate data, String tipoCaderno) {
        if (data == null) {
            throw new BusinessException("Data de referencia e obrigatoria para replay DJEN.");
        }
        String tribunalNormalizado = normalizarTribunalOpcional(tribunal);
        boolean replayGlobal = tribunalNormalizado == null || isCodigoGlobalComunicacao(tribunalNormalizado);
        String referenciaReplay = replayGlobal ? "COMUNICA" : tribunalNormalizado;

        List<PublicacaoFonteMonitorada> fontes = fonteMonitoradaRepository.findByAtivoTrueOrderByNomeExibicaoAsc();
        if (fontes.isEmpty()) {
            return PublicacaoDjenSyncResponse.builder()
                    .enabled(enabled)
                    .tribunais(List.of(referenciaReplay))
                    .diasAvaliados(1)
                    .mensagem("Configure ao menos uma fonte monitorada ativa para reprocessar DJEN.")
                    .build();
        }

        String caderno = tipoCaderno == null || tipoCaderno.isBlank()
                ? cadernoTipo
                : tipoCaderno.trim().toUpperCase(Locale.ROOT);

        Optional<PublicacaoJobLockService.JobLockHandle> lock = jobLockService.tentarAdquirir(DJEN_LOCK_NAME, ttlLock());
        if (lock.isEmpty()) {
            return PublicacaoDjenSyncResponse.builder()
                    .enabled(enabled)
                    .tribunais(List.of(referenciaReplay))
                    .diasAvaliados(1)
                    .emExecucao(true)
                    .mensagem("Replay DJEN ignorado: ja existe outra coleta em andamento.")
                    .build();
        }

        try {
            int cadernosConsultados = 1;
            ResultadoColetaCaderno resultado;
            if (replayGlobal) {
                resultado = comunicacaoEnabled
                        ? coletarComunicacoes(null, data, caderno, fontes)
                        : new ResultadoColetaCaderno(0, 0, 0, 0, "Busca direta DJEN/Comunica desabilitada.");

                List<String> tribunaisFallback = parseTribunais(fontes);
                if (deveExecutarFallbackCaderno(resultado, fontes) && !tribunaisFallback.isEmpty()) {
                    ResultadoAgregadoTribunais fallback = coletarCadernosTribunais(tribunaisFallback, data, caderno, fontes);
                    cadernosConsultados += fallback.cadernosConsultados();
                    resultado = resultado.somar(
                            fallback.resultado(),
                            resultado.mensagem() + " Fallback por caderno executado no replay global."
                    );
                }
            } else {
                resultado = coletarPublicacoes(tribunalNormalizado, data, caderno, fontes);
            }

            if (resultado.falhas() == 0) {
                fonteSyncService.registrarSucessoDjen(
                        referenciaReplay,
                        resultado.publicacoesImportadas(),
                        "Replay DJEN executado para " + data
                );
            }

            return PublicacaoDjenSyncResponse.builder()
                    .enabled(enabled)
                    .tribunais(List.of(referenciaReplay))
                    .diasAvaliados(1)
                    .cadernosConsultados(cadernosConsultados)
                    .cadernosBaixados(resultado.cadernosBaixados())
                    .publicacoesLidas(resultado.publicacoesLidas())
                    .publicacoesImportadas(resultado.publicacoesImportadas())
                    .falhas(resultado.falhas())
                    .mensagem(resultado.mensagem())
                    .build();
        } finally {
            jobLockService.liberar(lock.get());
        }
    }

    public PublicacaoDjenSyncResponse sincronizarReplayCaptura(UUID capturaId) {
        PublicacaoCapturaExecucao captura = capturaExecucaoService.buscarParaReprocessamento(capturaId);
        return sincronizarReplay(captura.getDiarioCodigo(), captura.getDataReferencia(), cadernoTipo);
    }

    private List<String> referenciasBackfill(List<String> tribunais) {
        List<String> referencias = new ArrayList<>();
        if (comunicacaoEnabled) {
            referencias.add("COMUNICA");
        }
        referencias.addAll(tribunais);
        return referencias.stream().distinct().toList();
    }

    private Duration ttlLock() {
        return Duration.ofMinutes(Math.max(5, lockTtlMinutes));
    }

    private String mensagemErro(Exception ex) {
        return ex.getMessage() != null ? ex.getMessage() : "Falha desconhecida ao coletar DJEN.";
    }

    private String tipoErro(Exception ex) {
        if (ex instanceof DjenCadernoClientService.DjenCadernoException djenEx) {
            return djenEx.getTipo();
        }
        if (ex instanceof DjenComunicacaoClientService.DjenComunicacaoException djenEx) {
            return djenEx.getTipo();
        }
        if (ex instanceof RestClientResponseException) {
            return "HTTP";
        }
        return ex.getClass().getSimpleName();
    }

    private Integer codigoHttpErro(Exception ex) {
        if (ex instanceof DjenCadernoClientService.DjenCadernoException djenEx) {
            return djenEx.getCodigoHttp();
        }
        if (ex instanceof DjenComunicacaoClientService.DjenComunicacaoException djenEx) {
            return djenEx.getCodigoHttp();
        }
        if (ex instanceof RestClientResponseException responseException) {
            return responseException.getStatusCode().value();
        }
        return null;
    }

    private String detalheErro(Exception ex) {
        if (ex instanceof DjenCadernoClientService.DjenCadernoException djenEx) {
            return djenEx.getDetalhe();
        }
        if (ex instanceof DjenComunicacaoClientService.DjenComunicacaoException djenEx) {
            return djenEx.getDetalhe();
        }
        if (ex instanceof RestClientResponseException responseException) {
            String body = responseException.getResponseBodyAsString();
            if (body != null && !body.isBlank()) {
                return body;
            }
        }
        return ex.getMessage();
    }

    private void notificarAdministradoresFalha(int cadernosConsultados, int falhas) {
        String chave = "PUBLICACOES_DJEN_FALHA:" + LocalDate.now();
        String descricao = "A coleta automatica DJEN terminou com "
                + falhas
                + " falha(s) em "
                + cadernosConsultados
                + " caderno(s) consultado(s). Verifique o historico de capturas em Configuracoes > Publicacoes.";

        usuarioRepository.findByPapelAndAtivoTrue(UserRole.ADMINISTRADOR)
                .forEach(admin -> notificacaoService.criarNotificacao(
                        admin.getId(),
                        "Falha na captura automatica DJEN",
                        descricao,
                        TipoNotificacao.SISTEMA,
                        "configuracoes",
                        chave,
                        "PUBLICACAO_CAPTURA",
                        null
                ));
    }

    private boolean deveExecutarFallbackCaderno(ResultadoColetaCaderno resultadoComunicacao, List<PublicacaoFonteMonitorada> fontes) {
        if (!cadernoFallbackEnabled) {
            return false;
        }
        if (!comunicacaoEnabled || resultadoComunicacao == null) {
            return true;
        }
        if (resultadoComunicacao.falhas() > 0) {
            return true;
        }
        if (existeFonteSemBuscaDireta(null, fontes)) {
            return true;
        }
        return cadernoFallbackOnEmpty && resultadoComunicacao.publicacoesLidas() == 0;
    }

    private ResultadoAgregadoTribunais coletarCadernosTribunais(
            List<String> tribunais,
            LocalDate data,
            String tipoCaderno,
            List<PublicacaoFonteMonitorada> fontes
    ) {
        int cadernosConsultados = 0;
        ResultadoColetaCaderno acumulado = new ResultadoColetaCaderno(0, 0, 0, 0, "Fallback por caderno nao executado.");

        for (String tribunal : tribunais) {
            ResultadoColetaCaderno resultado = coletarCaderno(tribunal, data, tipoCaderno, fontes);
            cadernosConsultados++;
            acumulado = acumulado.somar(resultado, resultado.mensagem());
            if (resultado.falhas() == 0) {
                fonteSyncService.registrarSucessoDjen(
                        tribunal,
                        resultado.publicacoesImportadas(),
                        "Fallback por caderno DJEN executado para " + data
                );
            }
        }

        return new ResultadoAgregadoTribunais(cadernosConsultados, acumulado);
    }

    private ResultadoColetaCaderno coletarPublicacoes(
            String tribunal,
            LocalDate data,
            String tipoCaderno,
            List<PublicacaoFonteMonitorada> fontes
    ) {
        if (!comunicacaoEnabled) {
            return coletarCaderno(tribunal, data, tipoCaderno, fontes);
        }

        ResultadoColetaCaderno resultadoComunicacao = coletarComunicacoes(tribunal, data, tipoCaderno, fontes);
        boolean precisaFallbackPorFonte = existeFonteSemBuscaDireta(tribunal, fontes);
        boolean precisaFallbackPorFalha = resultadoComunicacao.falhas() > 0;
        boolean precisaFallbackPorVazio = cadernoFallbackOnEmpty && resultadoComunicacao.publicacoesLidas() == 0;

        if (!cadernoFallbackEnabled || (!precisaFallbackPorFonte && !precisaFallbackPorFalha && !precisaFallbackPorVazio)) {
            return resultadoComunicacao;
        }

        ResultadoColetaCaderno resultadoCaderno = coletarCaderno(tribunal, data, tipoCaderno, fontes);
        String motivo = precisaFallbackPorFalha
                ? "falha na busca direta"
                : precisaFallbackPorFonte
                ? "fontes sem busca direta"
                : "busca direta sem resultado";
        return resultadoComunicacao.somar(
                resultadoCaderno,
                resultadoComunicacao.mensagem() + " Fallback por caderno executado: " + motivo + ". " + resultadoCaderno.mensagem()
        );
    }

    private ResultadoColetaCaderno coletarComunicacoes(
            String tribunal,
            LocalDate data,
            String tipoCaderno,
            List<PublicacaoFonteMonitorada> fontes
    ) {
        String codigoCaptura = tribunal == null || tribunal.isBlank() ? "COMUNICA" : tribunal;
        UUID execucaoId = capturaExecucaoService.iniciar(FonteIntegracao.DJEN, codigoCaptura, data);
        try {
            List<PublicacaoFonteMonitorada> fontesDiretas = fontes.stream()
                    .filter(fonte -> fonteMonitoraTribunal(fonte, tribunal))
                    .filter(this::permiteBuscaDiretaComunicacao)
                    .toList();

            if (fontesDiretas.isEmpty()) {
                String mensagem = "Busca direta DJEN ignorada: nenhuma fonte monitorada compativel com nome/OAB.";
                capturaExecucaoService.concluirSucesso(execucaoId, 0, 0, 0, 0, mensagem);
                return new ResultadoColetaCaderno(0, 0, 0, 0, mensagem);
            }

            Map<String, DjenCadernoClientService.DjenPublicacaoCapturada> publicacoesUnicas = new LinkedHashMap<>();
            int consultasExecutadas = 0;
            int consultasLimitadas = 0;

            for (PublicacaoFonteMonitorada fonte : fontesDiretas) {
                DjenComunicacaoClientService.ConsultaComunicacao consulta = montarConsultaComunicacao(
                        tribunal,
                        data,
                        tipoCaderno,
                        fonte
                );
                if (consulta == null) {
                    continue;
                }

                DjenComunicacaoClientService.DjenComunicacaoResultado resultado =
                        djenComunicacaoClientService.buscarComunicacoes(consulta);
                consultasExecutadas++;
                if (resultado.limiteDeclarado()) {
                    consultasLimitadas++;
                }
                for (DjenCadernoClientService.DjenPublicacaoCapturada publicacao : resultado.publicacoes()) {
                    publicacoesUnicas.putIfAbsent(chavePublicacaoCapturada(publicacao), publicacao);
                }
            }

            int importadas = 0;
            for (DjenCadernoClientService.DjenPublicacaoCapturada publicacao : publicacoesUnicas.values()) {
                List<PublicacaoFonteMonitorada> fontesEncontradas = findMatchingFontes(publicacao, tribunal, fontes);
                if (fontesEncontradas.isEmpty()) {
                    continue;
                }
                if (ingestarPublicacaoDjen(publicacao, tribunal, fontesEncontradas)) {
                    importadas++;
                }
            }

            String mensagem = "Busca direta DJEN processada; consultas="
                    + consultasExecutadas
                    + ", publicacoes_unicas="
                    + publicacoesUnicas.size()
                    + ", importadas="
                    + importadas
                    + (consultasLimitadas > 0 ? ", consultas_limitadas=" + consultasLimitadas : "")
                    + ".";
            capturaExecucaoService.concluirSucesso(
                    execucaoId,
                    consultasExecutadas,
                    0,
                    publicacoesUnicas.size(),
                    importadas,
                    mensagem
            );
            return new ResultadoColetaCaderno(0, publicacoesUnicas.size(), importadas, 0, mensagem);
        } catch (Exception ex) {
            capturaExecucaoService.concluirErro(
                    execucaoId,
                    mensagemErro(ex),
                    tipoErro(ex),
                    codigoHttpErro(ex),
                    detalheErro(ex)
            );
            fonteSyncService.registrarErroDjen(codigoCaptura, ex.getMessage());
            log.warn("[DJEN_COMUNICACAO_SYNC] Falha ao coletar tribunal={} data={}: {}", tribunal, data, ex.getMessage());
            return new ResultadoColetaCaderno(0, 0, 0, 1, ex.getMessage());
        }
    }

    private ResultadoColetaCaderno coletarCaderno(
            String tribunal,
            LocalDate data,
            String tipoCaderno,
            List<PublicacaoFonteMonitorada> fontes
    ) {
        UUID execucaoId = capturaExecucaoService.iniciar(FonteIntegracao.DJEN, tribunal, data);
        try {
            DjenCadernoClientService.DjenCadernoResultado resultadoCaderno =
                    djenCadernoClientService.baixarCadernoDetalhado(tribunal, data, tipoCaderno);
            List<DjenCadernoClientService.DjenPublicacaoCapturada> publicacoes = resultadoCaderno.publicacoes();

            int importadasCaderno = 0;
            for (DjenCadernoClientService.DjenPublicacaoCapturada publicacao : publicacoes) {
                List<PublicacaoFonteMonitorada> fontesEncontradas = findMatchingFontes(publicacao, tribunal, fontes);
                if (fontesEncontradas.isEmpty()) {
                    continue;
                }
                if (ingestarPublicacaoDjen(publicacao, tribunal, fontesEncontradas)) {
                    importadasCaderno++;
                }
            }

            String mensagemCaptura = resolverMensagemCaptura(resultadoCaderno, importadasCaderno);
            capturaExecucaoService.concluirSucesso(
                    execucaoId,
                    resultadoCaderno.zipBaixado() ? 1 : 0,
                    publicacoes.size(),
                    importadasCaderno,
                    mensagemCaptura
            );

            return new ResultadoColetaCaderno(
                    resultadoCaderno.zipBaixado() ? 1 : 0,
                    publicacoes.size(),
                    importadasCaderno,
                    0,
                    mensagemCaptura
            );
        } catch (Exception ex) {
            capturaExecucaoService.concluirErro(
                    execucaoId,
                    mensagemErro(ex),
                    tipoErro(ex),
                    codigoHttpErro(ex),
                    detalheErro(ex)
            );
            fonteSyncService.registrarErroDjen(tribunal, ex.getMessage());
            log.warn("[DJEN_SYNC] Falha ao coletar tribunal={} data={}: {}", tribunal, data, ex.getMessage());
            return new ResultadoColetaCaderno(0, 0, 0, 1, ex.getMessage());
        }
    }

    private boolean ingestarPublicacaoDjen(
            DjenCadernoClientService.DjenPublicacaoCapturada publicacao,
            String tribunalFallback,
            List<PublicacaoFonteMonitorada> fontesMonitoradas
    ) {
        if (fontesMonitoradas == null || fontesMonitoradas.isEmpty()) {
            return false;
        }

        String tribunal = publicacao.tribunal() != null && !publicacao.tribunal().isBlank()
                ? publicacao.tribunal()
                : tribunalFallback;
        String numeroProcesso = resolverNumeroProcesso(publicacao);
        String idExterno = publicacao.identificadorExterno() != null && !publicacao.identificadorExterno().isBlank()
                ? publicacao.identificadorExterno()
                : gerarFingerprintTeor(publicacao.teor());
        String hash = DigestUtils.md5DigestAsHex(
                ("djen|" + tribunal + "|" + publicacao.dataPublicacao() + "|" + idExterno + "|" + numeroProcesso)
                        .getBytes(StandardCharsets.UTF_8)
        );
        if (publicacaoRepository.existsByHashDeduplicacao(hash)) {
            return false;
        }

        IngestarPublicacaoRequest request = new IngestarPublicacaoRequest();
        request.setNpu(numeroProcesso);
        request.setTribunalOrigem("DJEN - " + tribunal);
        request.setTeor(publicacao.teor());
        request.setDataPublicacao(publicacao.dataPublicacao().atStartOfDay());
        request.setFonte("DJEN");
        request.setIdentificadorExterno(idExterno);
        request.setHashDeduplicacao(hash);
        request.setCaptadaEmNome(resumirFontesCapturadas(fontesMonitoradas));
        fontesMonitoradas.stream()
                .filter(fonte -> fonte.getTipo() == TipoFontePublicacaoMonitorada.OAB)
                .findFirst()
                .ifPresent(fonte -> request.setOabMonitorada((normalizarUf(fonte.getUf()) != null ? normalizarUf(fonte.getUf()) : "") + fonte.getValorMonitorado()));
        List<Usuario> destinatarios = coletarDestinatarios(fontesMonitoradas);
        Usuario destinatario = destinatarios.stream()
                .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                .findFirst()
                .orElse(null);
        if (destinatario != null) {
            request.setAtribuidaParaUsuarioId(destinatario.getId());
        }
        request.setDestinatariosNotificacaoIds(destinatarios.stream()
                .map(Usuario::getId)
                .filter(id -> id != null)
                .toList());

        publicacaoService.ingestarSistema(request, "Publicacao capturada automaticamente do caderno DJEN.");
        return true;
    }

    private List<PublicacaoFonteMonitorada> findMatchingFontes(
            DjenCadernoClientService.DjenPublicacaoCapturada publicacao,
            String tribunalFallback,
            List<PublicacaoFonteMonitorada> fontes
    ) {
        String tribunal = publicacao.tribunal() != null && !publicacao.tribunal().isBlank()
                ? publicacao.tribunal()
                : tribunalFallback;
        TextoBusca texto = TextoBusca.from(publicacao.textoBusca() + " " + publicacao.teor());
        return fontes.stream()
                .filter(fonte -> fonteMonitoraTribunal(fonte, tribunal))
                .filter(fonte -> matchesFonte(texto, fonte))
                .toList();
    }

    private boolean matchesFonte(TextoBusca texto, PublicacaoFonteMonitorada fonte) {
        if (texto == null || texto.compact().isBlank()) {
            return false;
        }

        if (fonte.getTipo() == TipoFontePublicacaoMonitorada.NOME) {
            return matchesNome(texto.words(), fonte.getValorMonitorado());
        }

        if (fonte.getTipo() == TipoFontePublicacaoMonitorada.CPF
                || fonte.getTipo() == TipoFontePublicacaoMonitorada.CNPJ) {
            return matchesDocumento(texto.digits(), fonte.getValorMonitorado(), fonte.getTipo());
        }

        if (fonte.getTipo() == TipoFontePublicacaoMonitorada.OAB) {
            return matchesOab(texto, fonte.getValorMonitorado(), fonte.getUf());
        }

        return false;
    }

    private boolean permiteBuscaDiretaComunicacao(PublicacaoFonteMonitorada fonte) {
        if (fonte == null || fonte.getTipo() == null) {
            return false;
        }
        if (fonte.getTipo() == TipoFontePublicacaoMonitorada.OAB) {
            return onlyDigits(fonte.getValorMonitorado()).length() >= 4;
        }
        if (fonte.getTipo() == TipoFontePublicacaoMonitorada.NOME) {
            String nome = normalizeWords(fonte.getValorMonitorado());
            return nome != null && nome.length() >= 5;
        }
        return false;
    }

    private boolean existeFonteSemBuscaDireta(String tribunal, List<PublicacaoFonteMonitorada> fontes) {
        return fontes.stream()
                .filter(fonte -> fonteMonitoraTribunal(fonte, tribunal))
                .anyMatch(fonte -> !permiteBuscaDiretaComunicacao(fonte));
    }

    private DjenComunicacaoClientService.ConsultaComunicacao montarConsultaComunicacao(
            String tribunal,
            LocalDate data,
            String tipoCaderno,
            PublicacaoFonteMonitorada fonte
    ) {
        if (fonte.getTipo() == TipoFontePublicacaoMonitorada.OAB) {
            String numeroOab = onlyDigits(fonte.getValorMonitorado());
            if (numeroOab.length() < 4) {
                return null;
            }
            return DjenComunicacaoClientService.ConsultaComunicacao.builder()
                    .tribunal(tribunal)
                    .data(data)
                    .meio(tipoCaderno)
                    .numeroOab(numeroOab)
                    .ufOab(normalizarUf(fonte.getUf()))
                    .build();
        }

        if (fonte.getTipo() == TipoFontePublicacaoMonitorada.NOME) {
            String nome = fonte.getValorMonitorado() != null ? fonte.getValorMonitorado().trim() : null;
            if (nome == null || nome.length() < 5) {
                return null;
            }
            return DjenComunicacaoClientService.ConsultaComunicacao.builder()
                    .tribunal(tribunal)
                    .data(data)
                    .meio(tipoCaderno)
                    .nomeAdvogado(nome)
                    .build();
        }

        return null;
    }

    private boolean matchesNome(String textoComEspacos, String nomeMonitorado) {
        String nome = normalizeWords(nomeMonitorado);
        if (nome == null) {
            return false;
        }

        List<String> tokens = Arrays.stream(nome.split(" "))
                .map(String::trim)
                .filter(token -> token.length() >= 3)
                .filter(token -> !isConectorNome(token))
                .distinct()
                .toList();
        if (tokens.size() >= 2) {
            return tokens.stream().allMatch(token -> containsWord(textoComEspacos, token));
        }
        return tokens.size() == 1 && tokens.getFirst().length() >= 5 && containsWord(textoComEspacos, tokens.getFirst());
    }

    private boolean matchesDocumento(String textoDigits, String valorMonitorado, TipoFontePublicacaoMonitorada tipo) {
        String digits = onlyDigits(valorMonitorado);
        int tamanhoMinimo = tipo == TipoFontePublicacaoMonitorada.CPF ? 11 : 14;
        return digits.length() >= tamanhoMinimo && textoDigits.contains(digits);
    }

    private boolean matchesOab(TextoBusca texto, String valorMonitorado, String ufMonitorada) {
        String digits = onlyDigits(valorMonitorado);
        if (digits.length() < 4) {
            return false;
        }

        String uf = normalizeCompact(ufMonitorada);
        List<String> variantes = new ArrayList<>();
        variantes.add("oab" + digits);
        if (uf != null && uf.length() == 2) {
            variantes.add("oab" + uf + digits);
            variantes.add("oab" + digits + uf);
            variantes.add(uf + digits);
            variantes.add(digits + uf);
        }
        return variantes.stream().anyMatch(texto.compact()::contains);
    }

    private boolean fonteMonitoraTribunal(PublicacaoFonteMonitorada fonte, String tribunal) {
        if (fonte.getDiariosMonitorados() == null || fonte.getDiariosMonitorados().isEmpty()) {
            return true;
        }
        String tribunalNormalizado = tribunal == null ? null : tribunal.trim().toUpperCase(Locale.ROOT);
        if (tribunalNormalizado == null || tribunalNormalizado.isBlank()) {
            return true;
        }

        return fonte.getDiariosMonitorados().stream()
                .filter(this::isDiarioDjenColetavel)
                .anyMatch(diario -> tribunalNormalizado.equalsIgnoreCase(diario.getCodigo()));
    }

    private List<String> parseTribunais(List<PublicacaoFonteMonitorada> fontes) {
        if (tribunaisConfig == null || tribunaisConfig.isBlank()) {
            return fontes.stream()
                    .filter(fonte -> fonte.getDiariosMonitorados() != null)
                    .flatMap(fonte -> fonte.getDiariosMonitorados().stream())
                    .filter(this::isDiarioDjenColetavel)
                    .map(diario -> diario.getCodigo().toUpperCase(Locale.ROOT))
                    .distinct()
                    .sorted()
                    .toList();
        }

        return Arrays.stream(tribunaisConfig.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toUpperCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    private boolean isDiarioDjenColetavel(PublicacaoDiarioOficial diario) {
        if (diario == null || diario.getGrupo() == null || !"DJEN".equals(diario.getGrupo().name())) {
            return false;
        }
        if (Boolean.TRUE.equals(diario.getRequerScraping())) {
            return false;
        }
        return diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.CADERNO_DJEN
                || diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.API_OFICIAL;
    }

    private String normalizarTribunalOpcional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isCodigoGlobalComunicacao(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        String codigo = value.trim().toUpperCase(Locale.ROOT);
        return codigo.equals("COMUNICA") || codigo.equals("COMUNICA_DJEN") || codigo.equals("DJEN") || codigo.equals("NAO_INFORMADO");
    }

    private String normalizarTribunalObrigatorio(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException("Tribunal e obrigatorio para replay DJEN.");
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String resolverMensagemCaptura(DjenCadernoClientService.DjenCadernoResultado resultado, int importadas) {
        if (!resultado.cadernoEncontrado()) {
            return "Sem caderno publicado para tribunal/data.";
        }
        if (!resultado.zipBaixado()) {
            return resultado.mensagem();
        }
        if (resultado.publicacoes().isEmpty()) {
            return resultado.mensagem();
        }
        if (importadas == 0) {
            return "Caderno processado; nenhuma publicacao bateu com as fontes monitoradas.";
        }
        return "Caderno processado; " + importadas + " publicacao(oes) importada(s).";
    }

    private String resolverNumeroProcesso(DjenCadernoClientService.DjenPublicacaoCapturada publicacao) {
        String numeroEstruturado = normalizarNumeroProcesso(publicacao.numeroProcesso());
        if (numeroEstruturado != null) {
            return numeroEstruturado;
        }
        return extrairNumeroProcesso(publicacao.teor() + " " + publicacao.textoBusca());
    }

    private String extrairNumeroProcesso(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }

        Matcher formatado = CNJ_FORMATADO_PATTERN.matcher(texto);
        if (formatado.find()) {
            return formatado.group();
        }

        Matcher digits = CNJ_DIGITOS_PATTERN.matcher(texto);
        if (digits.find()) {
            return formatarCnj(digits.group());
        }
        return null;
    }

    private String normalizarNumeroProcesso(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        Matcher formatado = CNJ_FORMATADO_PATTERN.matcher(value);
        if (formatado.find()) {
            return formatado.group();
        }
        String digits = onlyDigits(value);
        if (digits.length() == 20) {
            return formatarCnj(digits);
        }
        String trimmed = value.trim();
        return trimmed.length() <= 30 ? trimmed : null;
    }

    private String formatarCnj(String digits) {
        if (digits == null || digits.length() != 20) {
            return null;
        }
        return digits.substring(0, 7)
                + "-" + digits.substring(7, 9)
                + "." + digits.substring(9, 13)
                + "." + digits.substring(13, 14)
                + "." + digits.substring(14, 16)
                + "." + digits.substring(16);
    }

    private String gerarFingerprintTeor(String teor) {
        String texto = normalizeCompact(teor);
        if (texto == null) {
            texto = "";
        }
        return DigestUtils.md5DigestAsHex(texto.getBytes(StandardCharsets.UTF_8));
    }

    private String chavePublicacaoCapturada(DjenCadernoClientService.DjenPublicacaoCapturada publicacao) {
        String idExterno = publicacao.identificadorExterno();
        if (idExterno == null || idExterno.isBlank()) {
            idExterno = gerarFingerprintTeor(publicacao.teor());
        }
        return String.join("|",
                publicacao.tribunal() != null ? publicacao.tribunal() : "",
                publicacao.dataPublicacao() != null ? publicacao.dataPublicacao().toString() : "",
                publicacao.numeroProcesso() != null ? publicacao.numeroProcesso() : "",
                idExterno
        ).toLowerCase(Locale.ROOT);
    }

    private String resumirFontesCapturadas(List<PublicacaoFonteMonitorada> fontesMonitoradas) {
        List<String> nomes = fontesMonitoradas.stream()
                .map(PublicacaoFonteMonitorada::getNomeExibicao)
                .filter(nome -> nome != null && !nome.isBlank())
                .distinct()
                .toList();
        if (nomes.isEmpty()) {
            return null;
        }
        String resumo = String.join(", ", nomes.stream().limit(3).toList());
        if (nomes.size() > 3) {
            resumo += " +" + (nomes.size() - 3);
        }
        return resumo.length() <= 180 ? resumo : resumo.substring(0, 180);
    }

    private List<Usuario> coletarDestinatarios(List<PublicacaoFonteMonitorada> fontesMonitoradas) {
        Set<Usuario> destinatarios = new LinkedHashSet<>();
        for (PublicacaoFonteMonitorada fonte : fontesMonitoradas) {
            if (fonte.getDestinatarios() == null) {
                continue;
            }
            fonte.getDestinatarios().stream()
                    .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                    .forEach(destinatarios::add);
        }
        return destinatarios.stream().toList();
    }

    private boolean containsWord(String textoComEspacos, String token) {
        return textoComEspacos != null && textoComEspacos.contains(" " + token + " ");
    }

    private boolean isConectorNome(String token) {
        return token.equals("da") || token.equals("de") || token.equals("do") || token.equals("das") || token.equals("dos") || token.equals("e");
    }

    private String onlyDigits(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }

    private String normalizarUf(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String uf = value.trim().toUpperCase(Locale.ROOT);
        return uf.length() == 2 ? uf : null;
    }

    private String normalizeCompact(String value) {
        if (value == null) {
            return null;
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeWords(String value) {
        if (value == null) {
            return null;
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return normalized.isBlank() ? null : normalized;
    }

    private record TextoBusca(String compact, String words, String digits) {
        static TextoBusca from(String value) {
            String compact = normalizeStaticCompact(value);
            String words = normalizeStaticWords(value);
            return new TextoBusca(
                    compact != null ? compact : "",
                    words != null ? " " + words + " " : " ",
                    value == null ? "" : value.replaceAll("\\D", "")
            );
        }

        private static String normalizeStaticCompact(String value) {
            if (value == null) {
                return null;
            }
            String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "")
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("[^a-z0-9]", "");
            return normalized.isBlank() ? null : normalized;
        }

        private static String normalizeStaticWords(String value) {
            if (value == null) {
                return null;
            }
            String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "")
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("[^a-z0-9]", " ")
                    .replaceAll("\\s+", " ")
                    .trim();
            return normalized.isBlank() ? null : normalized;
        }
    }

    private record ResultadoColetaCaderno(
            int cadernosBaixados,
            int publicacoesLidas,
            int publicacoesImportadas,
            int falhas,
            String mensagem
    ) {
        ResultadoColetaCaderno somar(ResultadoColetaCaderno outra, String mensagemFinal) {
            if (outra == null) {
                return this;
            }
            return new ResultadoColetaCaderno(
                    cadernosBaixados + outra.cadernosBaixados(),
                    publicacoesLidas + outra.publicacoesLidas(),
                    publicacoesImportadas + outra.publicacoesImportadas(),
                    falhas + outra.falhas(),
                    mensagemFinal
            );
        }
    }

    private record ResultadoAgregadoTribunais(
            int cadernosConsultados,
            ResultadoColetaCaderno resultado
    ) {
    }
}
