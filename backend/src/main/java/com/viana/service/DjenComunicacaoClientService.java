package com.viana.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.viana.exception.BusinessException;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
@Slf4j
public class DjenComunicacaoClientService {

    private static final DateTimeFormatter DATA_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${api.djen.base-url:https://comunicaapi.pje.jus.br/api/v1}")
    private String baseUrl;

    @Value("${api.djen.user-agent:JurisHarmonyPublicacoes/1.0}")
    private String userAgent;

    @Value("${api.djen.timeout-seconds:60}")
    private int timeoutSeconds;

    @Value("${api.djen.retry-attempts:3}")
    private int retryAttempts;

    @Value("${api.djen.retry-backoff-ms:1500}")
    private long retryBackoffMs;

    @Value("${api.djen.comunicacao-page-size:100}")
    private int pageSizeConfig;

    @Value("${api.djen.comunicacao-max-pages:100}")
    private int maxPagesConfig;

    public DjenComunicacaoResultado buscarComunicacoes(ConsultaComunicacao consulta) {
        validarConsulta(consulta);

        int pageSize = normalizarPageSize(pageSizeConfig);
        int maxPages = Math.max(1, maxPagesConfig);
        int totalDeclarado = 0;
        int paginasConsultadas = 0;
        List<DjenCadernoClientService.DjenPublicacaoCapturada> publicacoes = new ArrayList<>();

        for (int pagina = 1; pagina <= maxPages; pagina++) {
            String url = montarUrl(consulta, pagina, pageSize);
            String response = executarComRetry(
                    () -> restClient()
                            .get()
                            .uri(url)
                            .header(HttpHeaders.USER_AGENT, userAgent)
                            .accept(MediaType.APPLICATION_JSON)
                            .retrieve()
                            .body(String.class),
                    "consulta comunicacoes DJEN " + resumoConsulta(consulta) + " pagina " + pagina
            );

            DjenComunicacaoPagina resultadoPagina = parsePagina(response, consulta);
            if (pagina == 1) {
                totalDeclarado = resultadoPagina.totalDeclarado();
            }
            paginasConsultadas++;
            publicacoes.addAll(resultadoPagina.publicacoes());

            if (resultadoPagina.publicacoes().isEmpty()) {
                break;
            }
            if (totalDeclarado > 0 && publicacoes.size() >= totalDeclarado) {
                break;
            }
            if (resultadoPagina.publicacoes().size() < pageSize) {
                break;
            }
        }

        boolean limiteDeclarado = totalDeclarado >= 10_000;
        String mensagem = limiteDeclarado
                ? "Busca direta DJEN retornou limite maximo declarado; revisar particionamento."
                : "Busca direta DJEN executada.";

        return DjenComunicacaoResultado.builder()
                .totalDeclarado(totalDeclarado)
                .paginasConsultadas(paginasConsultadas)
                .limiteDeclarado(limiteDeclarado)
                .publicacoes(publicacoes)
                .mensagem(mensagem)
                .build();
    }

    private void validarConsulta(ConsultaComunicacao consulta) {
        if (consulta == null) {
            throw new BusinessException("Consulta DJEN nao informada.");
        }
        if (consulta.data() == null) {
            throw new BusinessException("Data de disponibilizacao e obrigatoria na consulta DJEN.");
        }
        boolean temFiltro = hasText(consulta.tribunal())
                || hasText(consulta.numeroOab())
                || hasText(consulta.nomeAdvogado());
        if (!temFiltro) {
            throw new BusinessException("Consulta DJEN deve conter tribunal, OAB ou nome de advogado.");
        }
    }

    private String montarUrl(ConsultaComunicacao consulta, int pagina, int pageSize) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(normalizeBaseUrl(baseUrl))
                .pathSegment("comunicacao")
                .queryParam("pagina", pagina)
                .queryParam("itensPorPagina", pageSize)
                .queryParam("dataDisponibilizacaoInicio", consulta.data())
                .queryParam("dataDisponibilizacaoFim", consulta.data())
                .queryParam("meio", hasText(consulta.meio()) ? consulta.meio().trim().toUpperCase(Locale.ROOT) : "D");

        addParam(builder, "siglaTribunal", consulta.tribunal());
        addParam(builder, "numeroOab", consulta.numeroOab());
        addParam(builder, "ufOab", consulta.ufOab());
        addParam(builder, "nomeAdvogado", consulta.nomeAdvogado());
        return builder.toUriString();
    }

    private DjenComunicacaoPagina parsePagina(String response, ConsultaComunicacao consulta) {
        if (response == null || response.isBlank()) {
            return new DjenComunicacaoPagina(0, List.of());
        }

        try {
            JsonNode root = objectMapper.readTree(response);
            JsonNode items = root.path("items");
            int total = root.path("count").isNumber() ? root.path("count").asInt() : 0;
            if (!items.isArray() || items.isEmpty()) {
                return new DjenComunicacaoPagina(total, List.of());
            }

            List<DjenCadernoClientService.DjenPublicacaoCapturada> publicacoes = new ArrayList<>();
            for (JsonNode item : items) {
                DjenCadernoClientService.DjenPublicacaoCapturada publicacao = toPublicacao(item, consulta);
                if (publicacao != null) {
                    publicacoes.add(publicacao);
                }
            }

            return new DjenComunicacaoPagina(total > 0 ? total : publicacoes.size(), publicacoes);
        } catch (IOException ex) {
            throw new DjenComunicacaoException(
                    "Resposta invalida ao consultar comunicacoes DJEN.",
                    "RESPOSTA_INVALIDA",
                    null,
                    ex.getMessage()
            );
        }
    }

    private DjenCadernoClientService.DjenPublicacaoCapturada toPublicacao(JsonNode item, ConsultaComunicacao consulta) {
        if (item.path("ativo").isBoolean() && !item.path("ativo").asBoolean()) {
            return null;
        }

        String teor = firstText(item, "texto", "teor", "conteudo", "descricao");
        if (!hasText(teor)) {
            return null;
        }

        String tribunal = firstText(item, "siglaTribunal", "sigla_tribunal", "tribunal");
        String numeroProcesso = firstText(item, "numero_processo", "numeroProcesso", "numeroprocessocommascara");
        String data = firstText(item, "data_disponibilizacao", "dataPublicacao", "data_publicacao", "datadisponibilizacao");
        String idExterno = firstText(item, "hash", "id", "numeroComunicacao", "numero_comunicacao");

        return DjenCadernoClientService.DjenPublicacaoCapturada.builder()
                .tribunal(hasText(tribunal) ? tribunal : consulta.tribunal())
                .numeroProcesso(numeroProcesso)
                .dataPublicacao(parseDate(data, consulta.data()))
                .teor(teor)
                .identificadorExterno(idExterno)
                .textoBusca(item.toString())
                .build();
    }

    private String firstText(JsonNode node, String... fields) {
        for (String field : fields) {
            JsonNode direct = node.path(field);
            if (!direct.isMissingNode() && !direct.isNull() && !direct.asText().isBlank()) {
                return direct.asText();
            }
        }

        Iterator<Map.Entry<String, JsonNode>> iterator = node.fields();
        while (iterator.hasNext()) {
            Map.Entry<String, JsonNode> entry = iterator.next();
            for (String field : fields) {
                if (entry.getKey().equalsIgnoreCase(field)
                        && !entry.getValue().isNull()
                        && !entry.getValue().asText().isBlank()) {
                    return entry.getValue().asText();
                }
            }
        }
        return null;
    }

    private LocalDate parseDate(String value, LocalDate fallback) {
        if (!hasText(value)) {
            return fallback;
        }

        String trimmed = value.trim();
        try {
            if (trimmed.matches("\\d{2}/\\d{2}/\\d{4}")) {
                return LocalDate.parse(trimmed, DATA_BR);
            }
            return LocalDate.parse(trimmed.length() >= 10 ? trimmed.substring(0, 10) : trimmed);
        } catch (DateTimeParseException ignored) {
            return fallback;
        }
    }

    private String normalizeBaseUrl(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException("Base URL do DJEN nao configurada.");
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private RestClient restClient() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        Duration timeout = Duration.ofSeconds(Math.max(5, timeoutSeconds));
        requestFactory.setConnectTimeout(timeout);
        requestFactory.setReadTimeout(timeout);
        return restClientBuilder.clone()
                .requestFactory(requestFactory)
                .build();
    }

    private <T> T executarComRetry(Supplier<T> operacao, String contexto) {
        int tentativas = Math.max(1, retryAttempts);
        RuntimeException ultimaFalha = null;

        for (int tentativa = 1; tentativa <= tentativas; tentativa++) {
            try {
                return operacao.get();
            } catch (RestClientResponseException ex) {
                if (!isRetryable(ex)) {
                    throw ex;
                }
                ultimaFalha = ex;
                log.warn("[DJEN_COMUNICACAO] Falha temporaria em {} tentativa {}/{}: HTTP {}",
                        contexto, tentativa, tentativas, ex.getStatusCode().value());
            } catch (RestClientException ex) {
                ultimaFalha = ex;
                log.warn("[DJEN_COMUNICACAO] Falha temporaria em {} tentativa {}/{}: {}",
                        contexto, tentativa, tentativas, ex.getMessage());
            }

            aguardarAntesDeRetentar(tentativa, tentativas);
        }

        String detalhe = ultimaFalha != null && ultimaFalha.getMessage() != null
                ? ultimaFalha.getMessage()
                : "falha desconhecida";
        Integer statusCode = ultimaFalha instanceof RestClientResponseException responseException
                ? responseException.getStatusCode().value()
                : null;
        throw new DjenComunicacaoException(
                "Falha temporaria ao acessar comunicacoes DJEN apos " + tentativas + " tentativa(s): " + detalhe,
                "FALHA_TEMPORARIA",
                statusCode,
                detalhe
        );
    }

    private boolean isRetryable(RestClientResponseException ex) {
        int status = ex.getStatusCode().value();
        return status == 408 || status == 429 || status >= 500;
    }

    private void aguardarAntesDeRetentar(int tentativa, int tentativas) {
        if (tentativa >= tentativas) {
            return;
        }
        long espera = Math.max(0, retryBackoffMs) * tentativa;
        if (espera <= 0) {
            return;
        }
        try {
            Thread.sleep(espera);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException("Coleta DJEN interrompida durante retry.");
        }
    }

    private int normalizarPageSize(int value) {
        return value == 5 ? 5 : 100;
    }

    private void addParam(UriComponentsBuilder builder, String name, String value) {
        if (hasText(value)) {
            builder.queryParam(name, value.trim());
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String resumoConsulta(ConsultaComunicacao consulta) {
        if (hasText(consulta.numeroOab())) {
            return "tribunal=" + consulta.tribunal() + " oab=" + consulta.ufOab() + consulta.numeroOab();
        }
        if (hasText(consulta.nomeAdvogado())) {
            return "tribunal=" + consulta.tribunal() + " nomeAdvogado=" + consulta.nomeAdvogado();
        }
        return "tribunal=" + consulta.tribunal();
    }

    private record DjenComunicacaoPagina(
            int totalDeclarado,
            List<DjenCadernoClientService.DjenPublicacaoCapturada> publicacoes
    ) {
    }

    @Builder
    public record ConsultaComunicacao(
            String tribunal,
            LocalDate data,
            String meio,
            String numeroOab,
            String ufOab,
            String nomeAdvogado
    ) {
    }

    @Builder
    public record DjenComunicacaoResultado(
            int totalDeclarado,
            int paginasConsultadas,
            boolean limiteDeclarado,
            List<DjenCadernoClientService.DjenPublicacaoCapturada> publicacoes,
            String mensagem
    ) {
    }

    public static class DjenComunicacaoException extends BusinessException {
        private final String tipo;
        private final Integer codigoHttp;
        private final String detalhe;

        public DjenComunicacaoException(String message, String tipo, Integer codigoHttp, String detalhe) {
            super(message);
            this.tipo = tipo;
            this.codigoHttp = codigoHttp;
            this.detalhe = detalhe;
        }

        public String getTipo() {
            return tipo;
        }

        public Integer getCodigoHttp() {
            return codigoHttp;
        }

        public String getDetalhe() {
            return detalhe;
        }
    }
}
