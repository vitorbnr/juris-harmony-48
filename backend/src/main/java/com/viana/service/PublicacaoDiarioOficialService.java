package com.viana.service;

import com.viana.dto.response.PublicacaoDiarioOficialResponse;
import com.viana.model.PublicacaoDiarioOficial;
import com.viana.model.enums.EstrategiaColetaPublicacao;
import com.viana.model.enums.GrupoDiarioOficialPublicacao;
import com.viana.model.enums.StatusDiarioOficialPublicacao;
import com.viana.repository.PublicacaoDiarioOficialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PublicacaoDiarioOficialService {

    private final PublicacaoDiarioOficialRepository repository;

    @Value("${api.inlabs.email:}")
    private String inlabsEmail;

    @Value("${api.inlabs.password:}")
    private String inlabsPassword;

    @Transactional(readOnly = true)
    public List<PublicacaoDiarioOficialResponse> listar(Boolean apenasSemScraping, String uf) {
        String ufNormalizada = normalizarUf(uf);
        List<PublicacaoDiarioOficial> diarios = Boolean.TRUE.equals(apenasSemScraping)
                ? repository.findByAtivoTrueAndRequerScrapingFalseOrderByGrupoAscUfAscNomeAsc()
                : repository.findByAtivoTrueOrderByGrupoAscUfAscNomeAsc();

        return diarios.stream()
                .filter(diario -> ufNormalizada == null || ufNormalizada.equals(diario.getUf()) || diario.getUf() == null)
                .sorted(Comparator
                        .comparing((PublicacaoDiarioOficial diario) -> diario.getGrupo().name())
                        .thenComparing(diario -> diario.getUf() == null ? "ZZ" : diario.getUf())
                        .thenComparing(PublicacaoDiarioOficial::getNome))
                .map(this::toResponse)
                .toList();
    }

    public PublicacaoDiarioOficialResponse toResponse(PublicacaoDiarioOficial diario) {
        return PublicacaoDiarioOficialResponse.builder()
                .id(diario.getId() != null ? diario.getId().toString() : null)
                .codigo(diario.getCodigo())
                .nome(diario.getNome())
                .uf(diario.getUf())
                .grupo(diario.getGrupo() != null ? diario.getGrupo().name() : null)
                .estrategiaColeta(diario.getEstrategiaColeta() != null ? diario.getEstrategiaColeta().name() : null)
                .status(diario.getStatus() != null ? diario.getStatus().name() : null)
                .coletavelAgora(isColetavelAgora(diario))
                .statusCaptura(resolverStatusCaptura(diario))
                .requerScraping(Boolean.TRUE.equals(diario.getRequerScraping()))
                .custoEstimado(diario.getCustoEstimado())
                .observacao(diario.getObservacao())
                .ativo(diario.getAtivo())
                .build();
    }

    public boolean isColetavelAgora(PublicacaoDiarioOficial diario) {
        return Boolean.TRUE.equals(diario.getAtivo())
                && !Boolean.TRUE.equals(diario.getRequerScraping())
                && diario.getStatus() != StatusDiarioOficialPublicacao.NAO_SUPORTADO
                && (diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.CADERNO_DJEN
                || isDouInlabsColetavel(diario));
    }

    public String resolverStatusCaptura(PublicacaoDiarioOficial diario) {
        if (!Boolean.TRUE.equals(diario.getAtivo())) {
            return "INATIVO";
        }
        if (Boolean.TRUE.equals(diario.getRequerScraping())) {
            return "EXIGE_SCRAPING";
        }
        if (diario.getStatus() == StatusDiarioOficialPublicacao.NAO_SUPORTADO) {
            return "NAO_SUPORTADO";
        }
        if (diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.CADERNO_DJEN) {
            return "COLETOR_ATIVO";
        }
        if (isDouInlabsColetavel(diario)) {
            return "COLETOR_ATIVO";
        }
        if (diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.DADOS_ABERTOS) {
            return "PREPARADO_PARA_CONECTOR";
        }
        return "SOMENTE_CATALOGO";
    }

    private boolean isDouInlabsColetavel(PublicacaoDiarioOficial diario) {
        return diario.getGrupo() == GrupoDiarioOficialPublicacao.DOU
                && diario.getEstrategiaColeta() == EstrategiaColetaPublicacao.DADOS_ABERTOS
                && isConfigured(inlabsEmail)
                && isConfigured(inlabsPassword);
    }

    private boolean isConfigured(String value) {
        return value != null && !value.isBlank();
    }

    private String normalizarUf(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String uf = value.trim().toUpperCase(Locale.ROOT);
        return uf.length() == 2 ? uf : null;
    }
}
