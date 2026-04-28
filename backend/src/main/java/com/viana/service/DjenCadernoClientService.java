package com.viana.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.viana.exception.BusinessException;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
public class DjenCadernoClientService {

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${api.djen.base-url:https://comunicaapi.pje.jus.br/api/v1}")
    private String baseUrl;

    @Value("${api.djen.user-agent:JurisHarmonyPublicacoes/1.0}")
    private String userAgent;

    public List<DjenPublicacaoCapturada> baixarCaderno(String tribunal, LocalDate data, String tipoCaderno) {
        String urlZip = buscarUrlCaderno(tribunal, data, tipoCaderno);
        if (urlZip == null || urlZip.isBlank()) {
            return List.of();
        }

        byte[] zip = restClientBuilder.build()
                .get()
                .uri(urlZip)
                .header(HttpHeaders.USER_AGENT, userAgent)
                .accept(MediaType.APPLICATION_OCTET_STREAM, MediaType.APPLICATION_JSON)
                .retrieve()
                .body(byte[].class);

        if (zip == null || zip.length == 0) {
            return List.of();
        }

        return extrairPublicacoesDoZip(zip, tribunal, data);
    }

    private String buscarUrlCaderno(String tribunal, LocalDate data, String tipoCaderno) {
        String url = UriComponentsBuilder
                .fromHttpUrl(normalizeBaseUrl(baseUrl))
                .pathSegment("caderno", tribunal.toUpperCase(Locale.ROOT), data.toString(), tipoCaderno)
                .toUriString();

        String response = restClientBuilder.build()
                .get()
                .uri(url)
                .header(HttpHeaders.USER_AGENT, userAgent)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(String.class);

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

    private List<DjenPublicacaoCapturada> extrairPublicacoesDoZip(byte[] zip, String tribunal, LocalDate dataFallback) {
        List<DjenPublicacaoCapturada> publicacoes = new ArrayList<>();

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
                    extrairJson(content, tribunal, dataFallback, publicacoes);
                } else if (!content.isBlank()) {
                    publicacoes.add(DjenPublicacaoCapturada.builder()
                            .tribunal(tribunal)
                            .dataPublicacao(dataFallback)
                            .teor(content)
                            .identificadorExterno(entry.getName())
                            .textoBusca(content)
                            .build());
                }
            }
        } catch (IOException ex) {
            throw new BusinessException("Nao foi possivel processar o caderno DJEN baixado.");
        }

        return publicacoes;
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
}
