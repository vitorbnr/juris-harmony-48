package com.viana.service;

import com.viana.dto.request.IngestarPublicacaoRequest;
import com.viana.dto.response.PublicacaoDouSyncResponse;
import com.viana.model.PublicacaoFonteMonitorada;
import com.viana.model.Usuario;
import com.viana.model.enums.EstrategiaColetaPublicacao;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.GrupoDiarioOficialPublicacao;
import com.viana.repository.PublicacaoFonteMonitoradaRepository;
import com.viana.repository.PublicacaoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PublicacaoDouColetaService {

    private final InlabsClientService inlabsClientService;
    private final PublicacaoFonteMonitoradaRepository fonteMonitoradaRepository;
    private final PublicacaoRepository publicacaoRepository;
    private final PublicacaoService publicacaoService;
    private final FonteSyncService fonteSyncService;
    private final PublicacaoCapturaExecucaoService capturaExecucaoService;

    @Value("${app.sync.dou.enabled:false}")
    private boolean enabled;

    @Value("${app.sync.dou.lookback-days:3}")
    private int lookbackDays;

    @Value("${app.sync.dou.secoes:DO1,DO2,DO3}")
    private String secoesConfig;

    public PublicacaoDouSyncResponse sincronizar(boolean ignorarEnabled) {
        List<PublicacaoFonteMonitorada> fontes = fonteMonitoradaRepository.findByAtivoTrueOrderByNomeExibicaoAsc()
                .stream()
                .filter(this::fonteMonitoraDou)
                .toList();
        List<String> secoes = parseSecoes();

        if (!enabled && !ignorarEnabled) {
            return PublicacaoDouSyncResponse.builder()
                    .enabled(false)
                    .configurada(inlabsClientService.isConfigurado())
                    .secoes(secoes)
                    .mensagem("Coleta DOU/INLABS desabilitada por configuracao.")
                    .build();
        }

        if (!inlabsClientService.isConfigurado()) {
            return PublicacaoDouSyncResponse.builder()
                    .enabled(enabled)
                    .configurada(false)
                    .secoes(secoes)
                    .mensagem("INLABS nao configurado. Informe credenciais para habilitar a captura do DOU.")
                    .build();
        }

        if (fontes.isEmpty() || secoes.isEmpty()) {
            return PublicacaoDouSyncResponse.builder()
                    .enabled(enabled)
                    .configurada(true)
                    .secoes(secoes)
                    .mensagem("Configure ao menos uma fonte monitorada vinculada ao DOU/INLABS.")
                    .build();
        }

        int diasAvaliados = Math.max(1, lookbackDays);
        int cadernosConsultados = 0;
        int cadernosBaixados = 0;
        int publicacoesLidas = 0;
        int publicacoesImportadas = 0;
        int falhas = 0;

        for (String secao : secoes) {
            int importadasSecao = 0;
            for (int dayOffset = 0; dayOffset < diasAvaliados; dayOffset++) {
                LocalDate data = LocalDate.now().minusDays(dayOffset);
                UUID execucaoId = capturaExecucaoService.iniciar(FonteIntegracao.DOU, secao, data);
                cadernosConsultados++;
                try {
                    List<InlabsClientService.DouPublicacaoCapturada> publicacoes = inlabsClientService.baixarSecao(data, secao);
                    cadernosBaixados++;
                    publicacoesLidas += publicacoes.size();

                    int importadasCaderno = 0;
                    for (InlabsClientService.DouPublicacaoCapturada publicacao : publicacoes) {
                        PublicacaoFonteMonitorada fonteEncontrada = findMatchingFonte(publicacao, fontes);
                        if (fonteEncontrada == null) {
                            continue;
                        }
                        if (ingestarPublicacaoDou(publicacao, fonteEncontrada)) {
                            publicacoesImportadas++;
                            importadasSecao++;
                            importadasCaderno++;
                        }
                    }

                    capturaExecucaoService.concluirSucesso(
                            execucaoId,
                            1,
                            publicacoes.size(),
                            importadasCaderno,
                            "Coleta DOU/INLABS executada"
                    );
                } catch (Exception ex) {
                    falhas++;
                    capturaExecucaoService.concluirErro(execucaoId, ex.getMessage());
                    fonteSyncService.registrarErroDou(secao, ex.getMessage());
                    log.warn("[DOU_SYNC] Falha ao coletar secao={} data={}: {}", secao, data, ex.getMessage());
                }
            }
            fonteSyncService.registrarSucessoDou(secao, importadasSecao, "Coleta DOU/INLABS executada");
        }

        return PublicacaoDouSyncResponse.builder()
                .enabled(enabled)
                .configurada(true)
                .secoes(secoes)
                .diasAvaliados(diasAvaliados)
                .cadernosConsultados(cadernosConsultados)
                .cadernosBaixados(cadernosBaixados)
                .publicacoesLidas(publicacoesLidas)
                .publicacoesImportadas(publicacoesImportadas)
                .falhas(falhas)
                .mensagem("Coleta DOU/INLABS finalizada.")
                .build();
    }

    private boolean ingestarPublicacaoDou(
            InlabsClientService.DouPublicacaoCapturada publicacao,
            PublicacaoFonteMonitorada fonteMonitorada
    ) {
        String idExterno = publicacao.identificadorExterno() != null && !publicacao.identificadorExterno().isBlank()
                ? publicacao.identificadorExterno()
                : String.valueOf(publicacao.teor().hashCode());
        String hash = DigestUtils.md5DigestAsHex(
                ("dou|" + publicacao.secao() + "|" + publicacao.dataPublicacao() + "|" + idExterno)
                        .getBytes(StandardCharsets.UTF_8)
        );
        if (publicacaoRepository.existsByHashDeduplicacao(hash)) {
            return false;
        }

        IngestarPublicacaoRequest request = new IngestarPublicacaoRequest();
        request.setTribunalOrigem("DOU/INLABS - " + publicacao.secao());
        request.setTeor(publicacao.teor());
        request.setDataPublicacao(publicacao.dataPublicacao().atStartOfDay());
        request.setFonte("DOU");
        request.setIdentificadorExterno(idExterno);
        request.setHashDeduplicacao(hash);
        request.setCaptadaEmNome(fonteMonitorada.getNomeExibicao());

        Usuario destinatario = fonteMonitorada.getDestinatarios() == null
                ? null
                : fonteMonitorada.getDestinatarios().stream()
                .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                .findFirst()
                .orElse(null);
        if (destinatario != null) {
            request.setAtribuidaParaUsuarioId(destinatario.getId());
        }

        publicacaoService.ingestarSistema(request, "Publicacao capturada automaticamente do DOU/INLABS.");
        return true;
    }

    private PublicacaoFonteMonitorada findMatchingFonte(
            InlabsClientService.DouPublicacaoCapturada publicacao,
            List<PublicacaoFonteMonitorada> fontes
    ) {
        String texto = normalize(publicacao.textoBusca() + " " + publicacao.teor());
        for (PublicacaoFonteMonitorada fonte : fontes) {
            if (matchesFonte(texto, fonte)) {
                return fonte;
            }
        }
        return null;
    }

    private boolean matchesFonte(String texto, PublicacaoFonteMonitorada fonte) {
        String valor = normalize(fonte.getValorMonitorado());
        if (texto == null || valor == null || valor.length() < 3) {
            return false;
        }
        return texto.contains(valor);
    }

    private boolean fonteMonitoraDou(PublicacaoFonteMonitorada fonte) {
        if (fonte.getDiariosMonitorados() == null || fonte.getDiariosMonitorados().isEmpty()) {
            return false;
        }
        return fonte.getDiariosMonitorados().stream()
                .filter(diario -> diario.getGrupo() == GrupoDiarioOficialPublicacao.DOU)
                .anyMatch(diario -> diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.DADOS_ABERTOS
                        || "DOU".equalsIgnoreCase(diario.getCodigo())
                        || "DOU_INLABS".equalsIgnoreCase(diario.getCodigo()));
    }

    private List<String> parseSecoes() {
        return Arrays.stream(secoesConfig.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toUpperCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
        return normalized.isBlank() ? null : normalized;
    }
}
