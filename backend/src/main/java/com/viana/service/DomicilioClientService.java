package com.viana.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.viana.config.DomicilioApiProperties;
import com.viana.dto.response.DomicilioComunicacaoResponse;
import com.viana.exception.BusinessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Service
public class DomicilioClientService {

    private static final String HEADER_ON_BEHALF_OF = "On-behalf-Of";
    private static final String HEADER_TENANT_ID = "tenantId";

    private final RestClient restClient;
    private final DomicilioApiProperties properties;
    private final DomicilioOperadorResolver domicilioOperadorResolver;

    public DomicilioClientService(
            RestClient.Builder restClientBuilder,
            DomicilioApiProperties properties,
            DomicilioOperadorResolver domicilioOperadorResolver
    ) {
        this.restClient = restClientBuilder.build();
        this.properties = properties;
        this.domicilioOperadorResolver = domicilioOperadorResolver;
    }

    public boolean isEnabled() {
        return properties.isEnabled();
    }

    public List<DomicilioComunicacaoResponse> listarComunicacoes(LocalDate dataInicio, LocalDate dataFim, String numeroProcesso) {
        validarConfiguracao();
        DomicilioOperadorResolver.DomicilioOperadorContext operadorContext = domicilioOperadorResolver.resolveRequiredContext();

        String token = obterAccessToken();
        String tenantId = resolveTenantId(token, operadorContext.cpf());
        String baseUrl = normalizeBaseUrl(properties.getBaseUrl());
        String numeroFiltro = limparNumeroProcesso(numeroProcesso);

        try {
            JsonNode response = restClient.get()
                    .uri(uriBuilder -> {
                        uriBuilder.path(baseUrl + normalizePath(properties.getComunicacoesPath()));
                        if (dataInicio != null) {
                            uriBuilder.queryParam("dataInicio", dataInicio);
                        }
                        if (dataFim != null) {
                            uriBuilder.queryParam("dataFim", dataFim);
                        }
                        if (numeroFiltro != null) {
                            uriBuilder.queryParam("numeroProcesso", numeroFiltro);
                        }
                        return uriBuilder.build();
                    })
                    .accept(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header(HEADER_ON_BEHALF_OF, operadorContext.cpf())
                    .header(HEADER_TENANT_ID, tenantId)
                    .retrieve()
                    .body(JsonNode.class);

            return extractComunicacoes(response);
        } catch (RestClientResponseException ex) {
            throw new BusinessException("Falha ao consultar o Domicilio. Status: " + ex.getStatusCode().value());
        } catch (RestClientException ex) {
            throw new BusinessException("Nao foi possivel consultar o Domicilio no momento.");
        }
    }

    private String obterAccessToken() {
        try {
            JsonNode response = restClient.post()
                    .uri(normalizeAbsoluteUrl(properties.getTokenUrl(), "token-url"))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(buildTokenPayload())
                    .retrieve()
                    .body(JsonNode.class);

            String accessToken = textOrNull(response, "access_token");
            if (accessToken == null) {
                throw new BusinessException("Resposta do Domicilio sem access_token.");
            }
            return accessToken;
        } catch (RestClientResponseException ex) {
            throw new BusinessException("Falha ao autenticar no Domicilio. Status: " + ex.getStatusCode().value());
        } catch (RestClientException ex) {
            throw new BusinessException("Nao foi possivel autenticar no Domicilio.");
        }
    }

    private String resolveTenantId(String accessToken, String onBehalfOf) {
        if (properties.getTenantId() != null && !properties.getTenantId().isBlank()) {
            return properties.getTenantId().trim();
        }

        try {
            JsonNode response = restClient.get()
                    .uri(normalizeBaseUrl(properties.getBaseUrl()) + normalizePath(properties.getEuPath()))
                    .accept(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header(HEADER_ON_BEHALF_OF, onBehalfOf)
                    .retrieve()
                    .body(JsonNode.class);

            String tenantId = extractTenantId(response);
            if (tenantId == null) {
                throw new BusinessException("Nao foi possivel identificar o tenantId do Domicilio.");
            }
            return tenantId;
        } catch (RestClientResponseException ex) {
            throw new BusinessException("Falha ao consultar o tenantId do Domicilio. Status: " + ex.getStatusCode().value());
        } catch (RestClientException ex) {
            throw new BusinessException("Nao foi possivel consultar os dados institucionais do Domicilio.");
        }
    }

    private List<DomicilioComunicacaoResponse> extractComunicacoes(JsonNode response) {
        JsonNode items = resolveCollectionNode(response);
        List<DomicilioComunicacaoResponse> comunicacoes = new ArrayList<>();

        if (items == null || !items.isArray()) {
            return comunicacoes;
        }

        for (JsonNode item : items) {
            comunicacoes.add(DomicilioComunicacaoResponse.builder()
                    .idExterno(firstText(item, "id", "idComunicacao", "uuid"))
                    .numeroProcesso(normalizeNumeroProcesso(firstText(item, "numeroProcesso", "processoNumero")))
                    .tipoComunicacao(firstText(item, "tipoComunicacao", "tipo"))
                    .assunto(firstText(item, "assunto", "titulo", "descricao"))
                    .orgaoOrigem(extractNestedText(item, "orgaoOrigem", "nome", "tribunal", "orgaoJulgador"))
                    .statusCiente(firstText(item, "statusCiente", "situacaoCiencia", "status"))
                    .destinatario(extractNestedText(item, "destinatario", "nome", "parteInteressada", "usuario"))
                    .dataDisponibilizacao(normalizeDateTime(firstText(item, "dataDisponibilizacao", "dataCriacao", "criadoEm")))
                    .dataCiencia(normalizeDateTime(firstText(item, "dataCiencia", "cienteEm")))
                    .linkConsultaOficial(firstText(item, "urlConsulta", "urlInteiroTeor", "linkConsultaOficial"))
                    .build());
        }

        return comunicacoes;
    }

    private JsonNode resolveCollectionNode(JsonNode response) {
        if (response == null || response.isNull()) {
            return null;
        }
        if (response.isArray()) {
            return response;
        }

        List<String> candidates = List.of("content", "items", "data", "results", "comunicacoes");
        for (String candidate : candidates) {
            JsonNode node = response.path(candidate);
            if (node.isArray()) {
                return node;
            }
        }

        return null;
    }

    private MultiValueMap<String, String> buildTokenPayload() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        form.add("client_id", properties.getClientId());
        form.add("client_secret", properties.getClientSecret());
        return form;
    }

    private String extractTenantId(JsonNode response) {
        if (response == null || response.isNull()) {
            return null;
        }

        List<String> candidates = List.of("tenantId", "id", "tenant", "tenant_id");
        for (String candidate : candidates) {
            String value = textOrNull(response, candidate);
            if (value != null) {
                return value;
            }
        }

        JsonNode content = resolveCollectionNode(response);
        if (content != null && content.isArray() && !content.isEmpty()) {
            for (JsonNode item : content) {
                String value = extractTenantId(item);
                if (value != null) {
                    return value;
                }
            }
        }

        return null;
    }

    private String extractNestedText(JsonNode node, String... candidates) {
        for (String candidate : candidates) {
            JsonNode direct = node.path(candidate);
            if (direct.isTextual()) {
                return textOrNull(direct);
            }
            if (direct.isObject()) {
                String nested = firstText(direct, "nome", "descricao", "titulo");
                if (nested != null) {
                    return nested;
                }
            }
        }
        return null;
    }

    private String firstText(JsonNode node, String... fields) {
        for (String field : fields) {
            String value = textOrNull(node, field);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String normalizeNumeroProcesso(String numeroProcesso) {
        if (numeroProcesso == null) {
            return null;
        }

        String clean = numeroProcesso.replaceAll("\\D", "");
        if (clean.length() == 20) {
            return clean;
        }
        return numeroProcesso.trim();
    }

    private String limparNumeroProcesso(String numeroProcesso) {
        if (numeroProcesso == null || numeroProcesso.isBlank()) {
            return null;
        }
        return numeroProcesso.replaceAll("\\D", "");
    }

    private String normalizeDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return OffsetDateTime.parse(value).toLocalDateTime().toString();
        } catch (DateTimeParseException ignored) {
        }

        try {
            return LocalDateTime.parse(value).toString();
        } catch (DateTimeParseException ignored) {
            return value;
        }
    }

    private void validarConfiguracao() {
        if (!properties.isEnabled()) {
            throw new BusinessException("Integracao com Domicilio desabilitada.");
        }
        ensureConfigured(properties.getBaseUrl(), "api.domicilio.base-url");
        ensureConfigured(properties.getTokenUrl(), "api.domicilio.token-url");
        ensureConfigured(properties.getClientId(), "api.domicilio.client-id");
        ensureConfigured(properties.getClientSecret(), "api.domicilio.client-secret");
        domicilioOperadorResolver.resolveRequiredContext();
    }

    private void ensureConfigured(String value, String property) {
        if (value == null || value.isBlank()) {
            throw new BusinessException("Propriedade obrigatoria nao configurada: " + property);
        }
    }

    private String normalizeAbsoluteUrl(String value, String property) {
        ensureConfigured(value, "api.domicilio." + property);
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String normalizeBaseUrl(String value) {
        return normalizeAbsoluteUrl(value, "base-url");
    }

    private String normalizePath(String path) {
        if (path == null || path.isBlank()) {
            return "";
        }
        return path.startsWith("/") ? path : "/" + path;
    }

    private String textOrNull(JsonNode node, String fieldName) {
        return textOrNull(node.path(fieldName));
    }

    private String textOrNull(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        String value = node.asText();
        if (value == null) {
            return null;
        }

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFC).trim();
        return normalized.isBlank() ? null : normalized;
    }
}
