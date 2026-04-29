package com.viana.service;

import com.viana.dto.request.IngestarPublicacaoRequest;
import com.viana.dto.response.PublicacaoDjenSyncResponse;
import com.viana.exception.BusinessException;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
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

    @Value("${app.sync.djen.lock-ttl-minutes:60}")
    private int lockTtlMinutes;

    public PublicacaoDjenSyncResponse sincronizar(boolean ignorarEnabled) {
        List<PublicacaoFonteMonitorada> fontes = fonteMonitoradaRepository.findByAtivoTrueOrderByNomeExibicaoAsc();
        List<String> tribunais = parseTribunais(fontes);
        if (!enabled && !ignorarEnabled) {
            return PublicacaoDjenSyncResponse.builder()
                    .enabled(false)
                    .tribunais(tribunais)
                    .mensagem("Coleta DJEN desabilitada por configuracao.")
                    .build();
        }

        if (tribunais.isEmpty() || fontes.isEmpty()) {
            return PublicacaoDjenSyncResponse.builder()
                    .enabled(enabled)
                    .tribunais(tribunais)
                    .mensagem("Configure ao menos um tribunal e uma fonte monitorada ativa para coletar DJEN.")
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

        for (String tribunal : tribunais) {
            int importadasTribunal = 0;
            int falhasTribunal = 0;
            for (int dayOffset = 0; dayOffset < diasAvaliados; dayOffset++) {
                LocalDate data = LocalDate.now().minusDays(dayOffset);
                ResultadoColetaCaderno resultado = coletarCaderno(tribunal, data, cadernoTipo, fontes);
                cadernosConsultados++;
                cadernosBaixados += resultado.cadernosBaixados();
                publicacoesLidas += resultado.publicacoesLidas();
                publicacoesImportadas += resultado.publicacoesImportadas();
                falhas += resultado.falhas();
                falhasTribunal += resultado.falhas();
                importadasTribunal += resultado.publicacoesImportadas();
            }
            if (falhasTribunal == 0) {
                fonteSyncService.registrarSucessoDjen(tribunal, importadasTribunal, "Coleta DJEN executada");
            }
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

    public PublicacaoDjenSyncResponse sincronizarReplay(String tribunal, LocalDate data, String tipoCaderno) {
        String tribunalNormalizado = normalizarTribunalObrigatorio(tribunal);
        if (data == null) {
            throw new BusinessException("Data de referencia e obrigatoria para replay DJEN.");
        }

        List<PublicacaoFonteMonitorada> fontes = fonteMonitoradaRepository.findByAtivoTrueOrderByNomeExibicaoAsc();
        if (fontes.isEmpty()) {
            return PublicacaoDjenSyncResponse.builder()
                    .enabled(enabled)
                    .tribunais(List.of(tribunalNormalizado))
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
                    .tribunais(List.of(tribunalNormalizado))
                    .diasAvaliados(1)
                    .emExecucao(true)
                    .mensagem("Replay DJEN ignorado: ja existe outra coleta em andamento.")
                    .build();
        }

        try {
            ResultadoColetaCaderno resultado = coletarCaderno(tribunalNormalizado, data, caderno, fontes);
            if (resultado.falhas() == 0) {
                fonteSyncService.registrarSucessoDjen(
                        tribunalNormalizado,
                        resultado.publicacoesImportadas(),
                        "Replay DJEN executado para " + data
                );
            }

            return PublicacaoDjenSyncResponse.builder()
                    .enabled(enabled)
                    .tribunais(List.of(tribunalNormalizado))
                    .diasAvaliados(1)
                    .cadernosConsultados(1)
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
        if (ex instanceof RestClientResponseException) {
            return "HTTP";
        }
        return ex.getClass().getSimpleName();
    }

    private Integer codigoHttpErro(Exception ex) {
        if (ex instanceof DjenCadernoClientService.DjenCadernoException djenEx) {
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

        PublicacaoFonteMonitorada fontePrincipal = fontesMonitoradas.getFirst();
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
        if (fontePrincipal.getTipo() == TipoFontePublicacaoMonitorada.OAB) {
            request.setOabMonitorada((fontePrincipal.getUf() != null ? fontePrincipal.getUf() : "") + fontePrincipal.getValorMonitorado());
        }
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
                .filter(diario -> diario.getGrupo() != null && "DJEN".equals(diario.getGrupo().name()))
                .filter(diario -> diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.CADERNO_DJEN)
                .filter(diario -> !Boolean.TRUE.equals(diario.getRequerScraping()))
                .anyMatch(diario -> tribunalNormalizado.equalsIgnoreCase(diario.getCodigo()));
    }

    private List<String> parseTribunais(List<PublicacaoFonteMonitorada> fontes) {
        if (tribunaisConfig == null || tribunaisConfig.isBlank()) {
            return fontes.stream()
                    .filter(fonte -> fonte.getDiariosMonitorados() != null)
                    .flatMap(fonte -> fonte.getDiariosMonitorados().stream())
                    .filter(diario -> diario.getGrupo() != null && "DJEN".equals(diario.getGrupo().name()))
                    .filter(diario -> diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.CADERNO_DJEN)
                    .filter(diario -> !Boolean.TRUE.equals(diario.getRequerScraping()))
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
    }
}
