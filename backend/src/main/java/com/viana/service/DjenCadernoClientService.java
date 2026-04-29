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
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Supplier;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class DjenCadernoClientService {

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

    public List<DjenPublicacaoCapturada> baixarCaderno(String tribunal, LocalDate data, String tipoCaderno) {
        return baixarCadernoDetalhado(tribunal, data, tipoCaderno).publicacoes();
    }

    public DjenCadernoResultado baixarCadernoDetalhado(String tribunal, LocalDate data, String tipoCaderno) {
        String urlZip = buscarUrlCaderno(tribunal, data, tipoCaderno);
        if (urlZip == null || urlZip.isBlank()) {
            return DjenCadernoResultado.builder()
                    .cadernoEncontrado(false)
                    .zipBaixado(false)
                    .arquivosProcessados(0)
                    .arquivosInvalidos(0)
                    .publicacoes(List.of())
                    .mensagem("Nenhum caderno DJEN retornado para o tribunal/data.")
                    .build();
        }

        byte[] zip = executarComRetry(
                () -> restClient()
                        .get()
                        .uri(urlZip)
                        .header(HttpHeaders.USER_AGENT, userAgent)
                        .accept(MediaType.APPLICATION_OCTET_STREAM, MediaType.APPLICATION_JSON)
                        .retrieve()
                        .body(byte[].class),
                "download ZIP DJEN " + tribunal + " " + data
        );

        if (zip == null || zip.length == 0) {
            return DjenCadernoResultado.builder()
                    .cadernoEncontrado(true)
                    .zipBaixado(false)
                    .arquivosProcessados(0)
                    .arquivosInvalidos(0)
                    .publicacoes(List.of())
                    .mensagem("Caderno DJEN retornou ZIP vazio.")
                    .build();
        }

        ExtracaoZipResultado extracao = extrairPublicacoesDoZip(zip, tribunal, data);
        String mensagem = extracao.publicacoes().isEmpty()
                ? "Caderno DJEN baixado, mas sem publicacoes extraiveis."
                : "Caderno DJEN baixado e processado.";
        if (extracao.arquivosInvalidos() > 0) {
            mensagem += " Arquivos invalidos: " + extracao.arquivosInvalidos() + ".";
        }

        return DjenCadernoResultado.builder()
                .cadernoEncontrado(true)
                .zipBaixado(true)
                .arquivosProcessados(extracao.arquivosProcessados())
                .arquivosInvalidos(extracao.arquivosInvalidos())
                .publicacoes(extracao.publicacoes())
                .mensagem(mensagem)
                .build();
    }

    private String buscarUrlCaderno(String tribunal, LocalDate data, String tipoCaderno) {
        String url = UriComponentsBuilder
                .fromHttpUrl(normalizeBaseUrl(baseUrl))
                .pathSegment("caderno", tribunal.toUpperCase(Locale.ROOT), data.toString(), tipoCaderno)
                .toUriString();

        String response;
        try {
            response = executarComRetry(
                    () -> restClient()
                            .get()
                            .uri(url)
                            .header(HttpHeaders.USER_AGENT, userAgent)
                            .accept(MediaType.APPLICATION_JSON)
                            .retrieve()
                            .body(String.class),
                    "consulta URL caderno DJEN " + tribunal + " " + data
            );
        } catch (HttpClientErrorException.NotFound ex) {
            return null;
        }

        if (response == null || response.isBlank()) {
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(response);
            JsonNode urlNode = root.path("url");
            if (!urlNode.isMissingNode() && !urlNode.isNull()) {
                return urlNode.asText();
            }
            JsonNode resultUrl = root.path("result").path("url");
            if (!resultUrl.isMissingNode() && !resultUrl.isNull()) {
                return resultUrl.asText();
            }
        } catch (IOException ignored) {
            if (response.startsWith("http")) {
                return response.trim();
            }
        }

        return null;
    }

    private ExtracaoZipResultado extrairPublicacoesDoZip(byte[] zip, String tribunal, LocalDate dataFallback) {
        List<DjenPublicacaoCapturada> publicacoes = new ArrayList<>();
        int arquivosProcessados = 0;
        int arquivosInvalidos = 0;

        try (ZipInputStream zin = new ZipInputStream(new ByteArrayInputStream(zip))) {
            ZipEntry entry;
            while ((entry = zin.getNextEntry()) != null) {
                if (entry.isDirectory()) {
                    continue;
                }

                String nome = entry.getName().toLowerCase(Locale.ROOT);
                if (!nome.endsWith(".json") && !nome.endsWith(".txt")) {
                    continue;
                }

                String content = new String(zin.readAllBytes(), StandardCharsets.UTF_8);
                if (nome.endsWith(".json")) {
                    try {
                        extrairJson(content, tribunal, dataFallback, publicacoes);
                        arquivosProcessados++;
                    } catch (IOException ex) {
                        arquivosInvalidos++;
                        log.warn("[DJEN] JSON invalido no caderno tribunal={} data={} arquivo={}: {}",
                                tribunal, dataFallback, entry.getName(), ex.getMessage());
                    }
                } else if (!content.isBlank()) {
                    publicacoes.add(DjenPublicacaoCapturada.builder()
                            .tribunal(tribunal)
                            .dataPublicacao(dataFallback)
                            .teor(content)
                            .identificadorExterno(entry.getName())
                            .textoBusca(content)
                            .build());
                    arquivosProcessados++;
                }
            }
        } catch (IOException ex) {
            throw new BusinessException("ZIP DJEN invalido ou ilegivel.");
        }

        return new ExtracaoZipResultado(publicacoes, arquivosProcessados, arquivosInvalidos);
    }

    private void extrairJson(String content, String tribunal, LocalDate dataFallback, List<DjenPublicacaoCapturada> publicacoes) throws IOException {
        JsonNode root = objectMapper.readTree(content);
        List<JsonNode> objetos = new ArrayList<>();
        coletarObjetos(root, objetos);

        for (JsonNode node : objetos) {
            String teor = firstText(node, "conteudo", "texto", "teor", "descricao", "inteiroTeor", "textoComunicacao");
            if (teor == null || teor.isBlank()) {
                continue;
            }

            publicacoes.add(DjenPublicacaoCapturada.builder()
                    .tribunal(firstText(node, "siglaTribunal", "tribunal", "sigla") != null
                            ? firstText(node, "siglaTribunal", "tribunal", "sigla")
                            : tribunal)
                    .numeroProcesso(firstText(node, "numeroProcesso", "numero", "processo"))
                    .dataPublicacao(parseDate(firstText(node, "dataPublicacao", "dataDisponibilizacao", "data"), dataFallback))
                    .teor(teor)
                    .identificadorExterno(firstText(node, "id", "idComunicacao", "codigo", "codigoComunicacao", "hash"))
                    .textoBusca(node.toString())
                    .build());
        }
    }

    private void coletarObjetos(JsonNode node, List<JsonNode> result) {
        if (node == null || node.isNull()) {
            return;
        }
        if (node.isObject()) {
            result.add(node);
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                coletarObjetos(fields.next().getValue(), result);
            }
            return;
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                coletarObjetos(child, result);
            }
        }
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
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return LocalDate.parse(value.length() >= 10 ? value.substring(0, 10) : value);
        } catch (Exception ignored) {
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
                log.warn("[DJEN] Falha temporaria em {} tentativa {}/{}: HTTP {}",
                        contexto, tentativa, tentativas, ex.getStatusCode().value());
            } catch (RestClientException ex) {
                ultimaFalha = ex;
                log.warn("[DJEN] Falha temporaria em {} tentativa {}/{}: {}",
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
        throw new DjenCadernoException(
                "Falha temporaria ao acessar DJEN apos " + tentativas + " tentativa(s): " + detalhe,
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

    private record ExtracaoZipResultado(
            List<DjenPublicacaoCapturada> publicacoes,
            int arquivosProcessados,
            int arquivosInvalidos
    ) {
    }

    @Builder
    public record DjenCadernoResultado(
            boolean cadernoEncontrado,
            boolean zipBaixado,
            int arquivosProcessados,
            int arquivosInvalidos,
            List<DjenPublicacaoCapturada> publicacoes,
            String mensagem
    ) {
    }

    @Builder
    public record DjenPublicacaoCapturada(
            String tribunal,
            String numeroProcesso,
            LocalDate dataPublicacao,
            String teor,
            String identificadorExterno,
            String textoBusca
    ) {
    }

    public static class DjenCadernoException extends BusinessException {
        private final String tipo;
        private final Integer codigoHttp;
        private final String detalhe;

        public DjenCadernoException(String message, String tipo, Integer codigoHttp, String detalhe) {
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
