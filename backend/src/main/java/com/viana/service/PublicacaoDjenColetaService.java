package com.viana.service;

import com.viana.dto.request.IngestarPublicacaoRequest;
import com.viana.dto.response.PublicacaoDjenSyncResponse;
import com.viana.model.PublicacaoFonteMonitorada;
import com.viana.model.Usuario;
import com.viana.model.enums.EstrategiaColetaPublicacao;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.TipoFontePublicacaoMonitorada;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PublicacaoDjenColetaService {

    private final DjenCadernoClientService djenCadernoClientService;
    private final PublicacaoFonteMonitoradaRepository fonteMonitoradaRepository;
    private final PublicacaoRepository publicacaoRepository;
    private final PublicacaoService publicacaoService;
    private final FonteSyncService fonteSyncService;
    private final PublicacaoCapturaExecucaoService capturaExecucaoService;

    @Value("${app.sync.djen.enabled:false}")
    private boolean enabled;

    @Value("${app.sync.djen.tribunais:}")
    private String tribunaisConfig;

    @Value("${app.sync.djen.lookback-days:3}")
    private int lookbackDays;

    @Value("${app.sync.djen.caderno-tipo:D}")
    private String cadernoTipo;

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

        int diasAvaliados = Math.max(1, lookbackDays);
        int cadernosConsultados = 0;
        int cadernosBaixados = 0;
        int publicacoesLidas = 0;
        int publicacoesImportadas = 0;
        int falhas = 0;

        for (String tribunal : tribunais) {
            int importadasTribunal = 0;
            for (int dayOffset = 0; dayOffset < diasAvaliados; dayOffset++) {
                LocalDate data = LocalDate.now().minusDays(dayOffset);
                UUID execucaoId = capturaExecucaoService.iniciar(FonteIntegracao.DJEN, tribunal, data);
                cadernosConsultados++;
                try {
                    List<DjenCadernoClientService.DjenPublicacaoCapturada> publicacoes =
                            djenCadernoClientService.baixarCaderno(tribunal, data, cadernoTipo);
                    cadernosBaixados++;
                    publicacoesLidas += publicacoes.size();

                    int importadasCaderno = 0;
                    for (DjenCadernoClientService.DjenPublicacaoCapturada publicacao : publicacoes) {
                        PublicacaoFonteMonitorada fonteEncontrada = findMatchingFonte(publicacao, tribunal, fontes);
                        if (fonteEncontrada == null) {
                            continue;
                        }
                        if (ingestarPublicacaoDjen(publicacao, tribunal, fonteEncontrada)) {
                            publicacoesImportadas++;
                            importadasTribunal++;
                            importadasCaderno++;
                        }
                    }
                    capturaExecucaoService.concluirSucesso(
                            execucaoId,
                            1,
                            publicacoes.size(),
                            importadasCaderno,
                            "Coleta DJEN executada"
                    );
                } catch (Exception ex) {
                    falhas++;
                    capturaExecucaoService.concluirErro(execucaoId, ex.getMessage());
                    fonteSyncService.registrarErroDjen(tribunal, ex.getMessage());
                    log.warn("[DJEN_SYNC] Falha ao coletar tribunal={} data={}: {}", tribunal, data, ex.getMessage());
                }
            }
            fonteSyncService.registrarSucessoDjen(tribunal, importadasTribunal, "Coleta DJEN executada");
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

    private boolean ingestarPublicacaoDjen(
            DjenCadernoClientService.DjenPublicacaoCapturada publicacao,
            String tribunalFallback,
            PublicacaoFonteMonitorada fonteMonitorada
    ) {
        String tribunal = publicacao.tribunal() != null && !publicacao.tribunal().isBlank()
                ? publicacao.tribunal()
                : tribunalFallback;
        String idExterno = publicacao.identificadorExterno() != null && !publicacao.identificadorExterno().isBlank()
                ? publicacao.identificadorExterno()
                : String.valueOf(publicacao.teor().hashCode());
        String hash = DigestUtils.md5DigestAsHex(
                ("djen|" + tribunal + "|" + publicacao.dataPublicacao() + "|" + idExterno + "|" + publicacao.numeroProcesso())
                        .getBytes(StandardCharsets.UTF_8)
        );
        if (publicacaoRepository.existsByHashDeduplicacao(hash)) {
            return false;
        }

        IngestarPublicacaoRequest request = new IngestarPublicacaoRequest();
        request.setNpu(publicacao.numeroProcesso());
        request.setTribunalOrigem("DJEN - " + tribunal);
        request.setTeor(publicacao.teor());
        request.setDataPublicacao(publicacao.dataPublicacao().atStartOfDay());
        request.setFonte("DJEN");
        request.setIdentificadorExterno(idExterno);
        request.setHashDeduplicacao(hash);
        request.setCaptadaEmNome(fonteMonitorada.getNomeExibicao());
        if (fonteMonitorada.getTipo() == TipoFontePublicacaoMonitorada.OAB) {
            request.setOabMonitorada((fonteMonitorada.getUf() != null ? fonteMonitorada.getUf() : "") + fonteMonitorada.getValorMonitorado());
        }
        Usuario destinatario = fonteMonitorada.getDestinatarios() == null
                ? null
                : fonteMonitorada.getDestinatarios().stream()
                .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                .findFirst()
                .orElse(null);
        if (destinatario != null) {
            request.setAtribuidaParaUsuarioId(destinatario.getId());
        }

        publicacaoService.ingestarSistema(request, "Publicacao capturada automaticamente do caderno DJEN.");
        return true;
    }

    private PublicacaoFonteMonitorada findMatchingFonte(
            DjenCadernoClientService.DjenPublicacaoCapturada publicacao,
            String tribunalFallback,
            List<PublicacaoFonteMonitorada> fontes
    ) {
        String tribunal = publicacao.tribunal() != null && !publicacao.tribunal().isBlank()
                ? publicacao.tribunal()
                : tribunalFallback;
        String texto = normalize(publicacao.textoBusca() + " " + publicacao.teor());
        for (PublicacaoFonteMonitorada fonte : fontes) {
            if (!fonteMonitoraTribunal(fonte, tribunal)) {
                continue;
            }
            if (matchesFonte(texto, fonte)) {
                return fonte;
            }
        }
        return null;
    }

    private boolean matchesFonte(String texto, PublicacaoFonteMonitorada fonte) {
        String valor = normalize(fonte.getValorMonitorado());
        if (valor == null || valor.length() < 3) {
            return false;
        }

        if (fonte.getTipo() == TipoFontePublicacaoMonitorada.NOME
                || fonte.getTipo() == TipoFontePublicacaoMonitorada.CPF
                || fonte.getTipo() == TipoFontePublicacaoMonitorada.CNPJ) {
            return texto.contains(valor);
        }

        if (fonte.getTipo() == TipoFontePublicacaoMonitorada.OAB) {
            String digits = valor.replaceAll("\\D", "");
            String uf = normalize(fonte.getUf());
            List<String> variantes = new ArrayList<>();
            variantes.add(valor);
            if (!digits.isBlank()) {
                variantes.add(digits);
            }
            if (uf != null && !uf.isBlank() && !digits.isBlank()) {
                variantes.add("oab" + uf + digits);
                variantes.add("oab" + digits + uf);
                variantes.add(uf + digits);
                variantes.add(digits + uf);
            }
            return variantes.stream().filter(v -> v.length() >= 4).anyMatch(texto::contains);
        }

        return false;
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
