package com.viana.service;

import com.viana.exception.BusinessException;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
public class InlabsClientService {

    private final RestClient.Builder restClientBuilder;

    @Value("${api.inlabs.base-url:https://inlabs.in.gov.br}")
    private String baseUrl;

    @Value("${api.inlabs.email:}")
    private String email;

    @Value("${api.inlabs.password:}")
    private String password;

    @Value("${api.inlabs.login-path:/logar.php}")
    private String loginPath;

    @Value("${api.inlabs.download-path:/index.php}")
    private String downloadPath;

    @Value("${api.inlabs.user-agent:JurisHarmonyPublicacoes/1.0}")
    private String userAgent;

    public boolean isConfigurado() {
        return isConfigured(baseUrl) && isConfigured(email) && isConfigured(password);
    }

    public List<DouPublicacaoCapturada> baixarSecao(LocalDate data, String secao) {
        if (!isConfigurado()) {
            throw new BusinessException("INLABS nao configurado. Informe INLABS_EMAIL e INLABS_PASSWORD.");
        }

        String cookie = autenticar();
        byte[] zip = restClientBuilder.build()
                .get()
                .uri(buildDownloadUrl(data, secao))
                .header(HttpHeaders.USER_AGENT, userAgent)
                .header(HttpHeaders.COOKIE, cookie)
                .accept(MediaType.APPLICATION_OCTET_STREAM, MediaType.APPLICATION_XML, MediaType.TEXT_PLAIN)
                .retrieve()
                .body(byte[].class);

        if (zip == null || zip.length == 0) {
            return List.of();
        }
        if (!isZip(zip)) {
            throw new BusinessException("INLABS retornou um arquivo invalido para download do DOU.");
        }

        return extrairPublicacoes(zip, data, secao);
    }

    private String autenticar() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("email", email);
        form.add("password", password);

        ResponseEntity<String> response = restClientBuilder.build()
                .post()
                .uri(buildUrl(loginPath))
                .header(HttpHeaders.USER_AGENT, userAgent)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .toEntity(String.class);

        List<String> setCookies = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        if (setCookies != null && !setCookies.isEmpty()) {
            return String.join("; ", setCookies.stream()
                    .map(cookie -> cookie.split(";", 2)[0])
                    .toList());
        }

        String token = response.getBody();
        if (token != null && !token.isBlank()) {
            return "inlabs_session_cookie=" + token.trim();
        }

        throw new BusinessException("Nao foi possivel autenticar no INLABS.");
    }

    private List<DouPublicacaoCapturada> extrairPublicacoes(byte[] zip, LocalDate data, String secao) {
        List<DouPublicacaoCapturada> publicacoes = new ArrayList<>();

        try (ZipInputStream zin = new ZipInputStream(new ByteArrayInputStream(zip))) {
            ZipEntry entry;
            while ((entry = zin.getNextEntry()) != null) {
                if (entry.isDirectory()) {
                    continue;
                }

                String nome = entry.getName();
                String lower = nome.toLowerCase(Locale.ROOT);
                if (!lower.endsWith(".xml") && !lower.endsWith(".txt")) {
                    continue;
                }

                String content = new String(zin.readAllBytes(), StandardCharsets.UTF_8);
                String texto = lower.endsWith(".xml") ? xmlToText(content) : content;
                if (texto == null || texto.isBlank()) {
                    continue;
                }

                publicacoes.add(DouPublicacaoCapturada.builder()
                        .secao(secao)
                        .dataPublicacao(data)
                        .teor(texto)
                        .identificadorExterno(nome)
                        .textoBusca(content + " " + texto)
                        .build());
            }
        } catch (IOException ex) {
            throw new BusinessException("Nao foi possivel processar o arquivo INLABS baixado.");
        }

        return publicacoes;
    }

    private String xmlToText(String value) {
        if (value == null) {
            return null;
        }
        return value
                .replaceAll("(?s)<script.*?</script>", " ")
                .replaceAll("(?s)<style.*?</style>", " ")
                .replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String buildDownloadUrl(LocalDate data, String secao) {
        return UriComponentsBuilder
                .fromHttpUrl(buildUrl(downloadPath))
                .queryParam("p", data)
                .queryParam("dl", secao)
                .toUriString();
    }

    private String buildUrl(String path) {
        String normalizedBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        String normalizedPath = path == null || path.isBlank() ? "/" : path;
        if (!normalizedPath.startsWith("/")) {
            normalizedPath = "/" + normalizedPath;
        }
        return normalizedBase + normalizedPath;
    }

    private boolean isConfigured(String value) {
        return value != null && !value.isBlank();
    }

    private boolean isZip(byte[] value) {
        return value.length >= 2 && value[0] == 'P' && value[1] == 'K';
    }

    @Builder
    public record DouPublicacaoCapturada(
            String secao,
            LocalDate dataPublicacao,
            String teor,
            String identificadorExterno,
            String textoBusca
    ) {
    }
}
