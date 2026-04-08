package com.viana.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.viana.dto.response.DatajudCapaResponse;
import com.viana.dto.response.DatajudMovimentacaoResponse;
import com.viana.exception.BusinessException;
import com.viana.exception.ResourceNotFoundException;
import com.viana.util.CnjUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class DatajudClientService {

    private final RestClient restClient;
    private final String baseUrl;
    private final String apiKey;

    public DatajudClientService(
            RestClient.Builder restClientBuilder,
            @Value("${api.datajud.base-url}") String baseUrl,
            @Value("${api.datajud.api-key}") String apiKey
    ) {
        this.restClient = restClientBuilder.build();
        this.baseUrl = normalizeBaseUrl(baseUrl);
        this.apiKey = apiKey;
    }

    public DatajudCapaResponse buscarCapaProcesso(String numeroCnj) {
        String numeroCnjLimpo = limparNumeroCnj(numeroCnj);
        String url = CnjUtils.buildDatajudSearchUrl(baseUrl, numeroCnjLimpo);

        try {
            JsonNode response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.AUTHORIZATION, buildAuthorizationHeader())
                    .body(buildPayload(numeroCnjLimpo))
                    .retrieve()
                    .body(JsonNode.class);

            JsonNode source = extractSource(response);

            return DatajudCapaResponse.builder()
                    .numeroCnj(formatarNumeroCnj(textOrNull(source, "numeroProcesso"), numeroCnjLimpo))
                    .classe(textOrNull(source.path("classe"), "nome"))
                    .assunto(extractAssunto(source))
                    .tribunal(extractTribunal(source, numeroCnjLimpo))
                    .orgaoJulgador(extractOrgaoJulgador(source))
                    .dataDistribuicao(parseDataDistribuicao(textOrNull(source, "dataAjuizamento")))
                    .valorCausa(extractValorCausa(source))
                    .movimentacoes(extractMovimentacoes(source, numeroCnjLimpo))
                    .build();
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(ex.getMessage());
        } catch (RestClientResponseException ex) {
            throw new BusinessException("Falha ao consultar o Datajud. Status: " + ex.getStatusCode().value());
        } catch (RestClientException ex) {
            throw new BusinessException("Não foi possível consultar o Datajud no momento.");
        }
    }

    private Object buildPayload(String numeroCnjLimpo) {
        return Map.of(
                "query", Map.of(
                        "match", Map.of(
                                "numeroProcesso", numeroCnjLimpo
                        )
                )
        );
    }

    private JsonNode extractSource(JsonNode response) {
        if (response == null) {
            throw new BusinessException("Resposta vazia ao consultar o Datajud.");
        }

        JsonNode hits = response.path("hits").path("hits");
        if (!hits.isArray() || hits.isEmpty()) {
            throw new ResourceNotFoundException("Processo não encontrado no Datajud.");
        }

        JsonNode source = hits.get(0).path("_source");
        if (source.isMissingNode() || source.isNull()) {
            throw new BusinessException("Resposta do Datajud sem dados do processo em hits.hits[0]._source.");
        }

        return source;
    }

    private List<DatajudMovimentacaoResponse> extractMovimentacoes(JsonNode source, String numeroCnjLimpo) {
        JsonNode movimentos = source.path("movimentos");
        if (!movimentos.isArray() || movimentos.isEmpty()) {
            return List.of();
        }

        List<DatajudMovimentacaoResponse> result = new ArrayList<>();
        for (JsonNode movimento : movimentos) {
            String nome = textOrNull(movimento, "nome");
            String dataHora = normalizeDateTime(textOrNull(movimento, "dataHora"));
            String orgaoJulgador = textOrNull(movimento.path("orgaoJulgador"), "nome");
            Integer codigo = movimento.path("codigo").isNumber() ? movimento.path("codigo").asInt() : null;

            result.add(DatajudMovimentacaoResponse.builder()
                    .codigo(codigo)
                    .nome(nome)
                    .descricao(buildMovimentacaoDescricao(movimento, nome))
                    .data(extractDate(dataHora))
                    .dataHora(dataHora)
                    .orgaoJulgador(orgaoJulgador)
                    .tipo(inferTipoMovimentacao(nome))
                    .chaveExterna(buildMovimentacaoKey(numeroCnjLimpo, codigo, nome, dataHora, orgaoJulgador))
                    .build());
        }

        return result;
    }

    private String buildMovimentacaoDescricao(JsonNode movimento, String nomeBase) {
        String nome = nomeBase != null ? nomeBase : "Movimentação";
        JsonNode complementos = movimento.path("complementosTabelados");
        if (!complementos.isArray() || complementos.isEmpty()) {
            return nome;
        }

        List<String> labels = new ArrayList<>();
        for (JsonNode complemento : complementos) {
            String nomeComplemento = textOrNull(complemento, "nome");
            if (nomeComplemento != null) {
                labels.add(nomeComplemento);
            }
        }

        if (labels.isEmpty()) {
            return nome;
        }

        return nome + " - " + String.join(", ", labels);
    }

    private String inferTipoMovimentacao(String nome) {
        if (nome == null || nome.isBlank()) {
            return "OUTRO";
        }

        String normalized = nome.toLowerCase();
        if (normalized.contains("senten")) return "SENTENCA";
        if (normalized.contains("audi")) return "AUDIENCIA";
        if (normalized.contains("peti")) return "PETICAO";
        if (normalized.contains("publica")
                || normalized.contains("diário")
                || normalized.contains("diario")
                || normalized.contains("disponibiliza")) {
            return "PUBLICACAO";
        }
        if (normalized.contains("despacho")
                || normalized.contains("decis")
                || normalized.contains("conclus")
                || normalized.contains("mero expediente")
                || normalized.contains("ato ordinat")) {
            return "DESPACHO";
        }

        return "OUTRO";
    }

    private String buildMovimentacaoKey(String numeroCnjLimpo, Integer codigo, String nome, String dataHora, String orgaoJulgador) {
        String raw = String.join("|",
                numeroCnjLimpo,
                codigo != null ? String.valueOf(codigo) : "",
                nome != null ? nome : "",
                dataHora != null ? dataHora : "",
                orgaoJulgador != null ? orgaoJulgador : "");
        return DigestUtils.md5DigestAsHex(raw.getBytes(StandardCharsets.UTF_8));
    }

    private String extractAssunto(JsonNode source) {
        JsonNode assuntos = source.path("assuntos");
        if (!assuntos.isArray() || assuntos.isEmpty()) {
            return null;
        }

        for (JsonNode assunto : assuntos) {
            if (assunto.path("principal").asBoolean(false)) {
                String nomePrincipal = textOrNull(assunto, "nome");
                if (nomePrincipal != null) {
                    return nomePrincipal;
                }
            }
        }

        for (JsonNode assunto : assuntos) {
            String nome = textOrNull(assunto, "nome");
            if (nome != null) {
                return nome;
            }
        }

        return null;
    }

    private String extractTribunal(JsonNode source, String numeroCnjLimpo) {
        String tribunal = textOrNull(source, "tribunal");
        if (tribunal != null) {
            return tribunal;
        }

        return CnjUtils.getSiglaDatajud(numeroCnjLimpo).toUpperCase();
    }

    private String extractOrgaoJulgador(JsonNode source) {
        String orgaoPrincipal = textOrNull(source.path("orgaoJulgador"), "nome");
        String orgaoDistribuicao = extractOrgaoJulgadorDistribuicao(source.path("movimentos"));

        if (orgaoDistribuicao != null && (orgaoPrincipal == null || orgaoDistribuicao.length() > orgaoPrincipal.length())) {
            return orgaoDistribuicao;
        }

        return orgaoPrincipal;
    }

    private String extractOrgaoJulgadorDistribuicao(JsonNode movimentos) {
        if (!movimentos.isArray()) {
            return null;
        }

        for (JsonNode movimento : movimentos) {
            if (movimento.path("codigo").asInt() == 26) {
                String nome = textOrNull(movimento.path("orgaoJulgador"), "nome");
                if (nome != null) {
                    return nome;
                }
            }
        }

        for (JsonNode movimento : movimentos) {
            String nome = textOrNull(movimento.path("orgaoJulgador"), "nome");
            if (nome != null) {
                return nome;
            }
        }

        return null;
    }

    private String extractValorCausa(JsonNode source) {
        List<JsonNode> candidates = List.of(
                source.path("valorCausa"),
                source.path("valorAcao"),
                source.path("dadosBasicos").path("valorCausa"),
                source.path("dadosBasicos").path("valorAcao")
        );

        for (JsonNode valorNode : candidates) {
            String valor = normalizeValorNode(valorNode);
            if (valor != null) {
                return valor;
            }
        }

        return null;
    }

    private String normalizeValorNode(JsonNode valorNode) {
        if (valorNode.isMissingNode() || valorNode.isNull()) {
            return null;
        }

        if (valorNode.isNumber()) {
            return valorNode.decimalValue().stripTrailingZeros().toPlainString();
        }

        String valor = valorNode.asText();
        return valor == null || valor.isBlank() ? null : valor;
    }

    private String parseDataDistribuicao(String dataAjuizamento) {
        if (dataAjuizamento == null || dataAjuizamento.isBlank()) {
            return null;
        }

        LocalDateTime dateTime = parseDateTimeValue(dataAjuizamento);
        if (dateTime != null) {
            return dateTime.toLocalDate().toString();
        }

        try {
            return LocalDate.parse(dataAjuizamento, DateTimeFormatter.BASIC_ISO_DATE).toString();
        } catch (DateTimeParseException ignored) {
        }

        try {
            return LocalDate.parse(dataAjuizamento).toString();
        } catch (DateTimeParseException ignored) {
            return dataAjuizamento;
        }
    }

    private String normalizeDateTime(String value) {
        LocalDateTime dateTime = parseDateTimeValue(value);
        return dateTime != null ? dateTime.toString() : value;
    }

    private String extractDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        LocalDateTime dateTime = parseDateTimeValue(value);
        if (dateTime != null) {
            return dateTime.toLocalDate().toString();
        }

        try {
            return LocalDate.parse(value).toString();
        } catch (DateTimeParseException ignored) {
            return value;
        }
    }

    private LocalDateTime parseDateTimeValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return OffsetDateTime.parse(value).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
        }

        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
        }

        try {
            return LocalDateTime.parse(value, DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private String limparNumeroCnj(String numeroCnj) {
        if (numeroCnj == null || numeroCnj.isBlank()) {
            throw new BusinessException("Número CNJ é obrigatório para consultar o Datajud.");
        }

        String numeroCnjLimpo = numeroCnj.replaceAll("\\D", "");
        if (numeroCnjLimpo.length() != 20) {
            throw new BusinessException("O número CNJ deve conter 20 dígitos.");
        }

        return numeroCnjLimpo;
    }

    private String formatarNumeroCnj(String numeroProcesso, String fallback) {
        String numero = numeroProcesso != null && !numeroProcesso.isBlank() ? numeroProcesso : fallback;
        String limpo = numero.replaceAll("\\D", "");

        if (limpo.length() != 20) {
            return numero;
        }

        return "%s-%s.%s.%s.%s.%s".formatted(
                limpo.substring(0, 7),
                limpo.substring(7, 9),
                limpo.substring(9, 13),
                limpo.substring(13, 14),
                limpo.substring(14, 16),
                limpo.substring(16, 20)
        );
    }

    private String textOrNull(JsonNode node, String fieldName) {
        return textOrNull(node.path(fieldName));
    }

    private String textOrNull(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        String value = node.asText();
        return value == null || value.isBlank() ? null : value;
    }

    private String buildAuthorizationHeader() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new BusinessException("DATAJUD_API_KEY não configurada.");
        }

        return apiKey.regionMatches(true, 0, "APIKey ", 0, 7)
                ? apiKey
                : "APIKey " + apiKey;
    }

    private String normalizeBaseUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new BusinessException("A base URL do Datajud não está configurada.");
        }

        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
