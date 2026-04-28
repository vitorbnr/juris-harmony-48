package com.viana.service;

import com.viana.model.FonteSync;
import com.viana.model.Processo;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.StatusIntegracao;
import com.viana.model.enums.TipoReferenciaIntegracao;
import com.viana.repository.FonteSyncRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FonteSyncService {

    private final FonteSyncRepository fonteSyncRepository;

    @Transactional
    public void registrarSucessoDatajud(Processo processo, int novasMovimentacoes, String mensagem) {
        FonteSync fonteSync = getOrCreateDatajudProcesso(processo);
        LocalDateTime now = LocalDateTime.now();

        fonteSync.setStatus(StatusIntegracao.SUCESSO);
        fonteSync.setUltimoSyncEm(now);
        fonteSync.setUltimoSucessoEm(now);
        fonteSync.setProximoSyncEm(now.plusDays(1));
        fonteSync.setTentativas(0);
        fonteSync.setUltimaMensagem(buildMensagem(mensagem, novasMovimentacoes));

        fonteSyncRepository.save(fonteSync);
    }

    @Transactional
    public void registrarErroDatajud(Processo processo, String mensagem) {
        FonteSync fonteSync = getOrCreateDatajudProcesso(processo);
        LocalDateTime now = LocalDateTime.now();

        fonteSync.setStatus(StatusIntegracao.ERRO);
        fonteSync.setUltimoSyncEm(now);
        fonteSync.setProximoSyncEm(now.plusHours(12));
        fonteSync.setTentativas(fonteSync.getTentativas() + 1);
        fonteSync.setUltimaMensagem(mensagem);

        fonteSyncRepository.save(fonteSync);
    }

    @Transactional
    public void registrarSucessoDomicilio(String referencia, int novasComunicacoes, String mensagem) {
        FonteSync fonteSync = getOrCreateDomicilioInstituicao(referencia);
        LocalDateTime now = LocalDateTime.now();

        fonteSync.setStatus(StatusIntegracao.SUCESSO);
        fonteSync.setUltimoSyncEm(now);
        fonteSync.setUltimoSucessoEm(now);
        fonteSync.setProximoSyncEm(now.plusHours(2));
        fonteSync.setTentativas(0);
        fonteSync.setUltimaMensagem(buildMensagem(mensagem, novasComunicacoes).replace("movimentacoes", "comunicacoes"));

        fonteSyncRepository.save(fonteSync);
    }

    @Transactional
    public void registrarErroDomicilio(String referencia, String mensagem) {
        FonteSync fonteSync = getOrCreateDomicilioInstituicao(referencia);
        LocalDateTime now = LocalDateTime.now();

        fonteSync.setStatus(StatusIntegracao.ERRO);
        fonteSync.setUltimoSyncEm(now);
        fonteSync.setProximoSyncEm(now.plusHours(4));
        fonteSync.setTentativas(fonteSync.getTentativas() + 1);
        fonteSync.setUltimaMensagem(mensagem);

        fonteSyncRepository.save(fonteSync);
    }

    @Transactional
    public void registrarSucessoDjen(String tribunal, int publicacoesImportadas, String mensagem) {
        FonteSync fonteSync = getOrCreateDjenTribunal(tribunal);
        LocalDateTime now = LocalDateTime.now();

        fonteSync.setStatus(StatusIntegracao.SUCESSO);
        fonteSync.setUltimoSyncEm(now);
        fonteSync.setUltimoSucessoEm(now);
        fonteSync.setProximoSyncEm(now.plusDays(1));
        fonteSync.setTentativas(0);
        fonteSync.setUltimaMensagem(buildMensagem(mensagem, publicacoesImportadas).replace("movimentacoes", "publicacoes"));

        fonteSyncRepository.save(fonteSync);
    }

    @Transactional
    public void registrarErroDjen(String tribunal, String mensagem) {
        FonteSync fonteSync = getOrCreateDjenTribunal(tribunal);
        LocalDateTime now = LocalDateTime.now();

        fonteSync.setStatus(StatusIntegracao.ERRO);
        fonteSync.setUltimoSyncEm(now);
        fonteSync.setProximoSyncEm(now.plusHours(12));
        fonteSync.setTentativas(fonteSync.getTentativas() + 1);
        fonteSync.setUltimaMensagem(mensagem);

        fonteSyncRepository.save(fonteSync);
    }

    @Transactional
    public void registrarSucessoDou(String secao, int publicacoesImportadas, String mensagem) {
        FonteSync fonteSync = getOrCreateDouSecao(secao);
        LocalDateTime now = LocalDateTime.now();

        fonteSync.setStatus(StatusIntegracao.SUCESSO);
        fonteSync.setUltimoSyncEm(now);
        fonteSync.setUltimoSucessoEm(now);
        fonteSync.setProximoSyncEm(now.plusDays(1));
        fonteSync.setTentativas(0);
        fonteSync.setUltimaMensagem(buildMensagem(mensagem, publicacoesImportadas).replace("movimentacoes", "publicacoes"));

        fonteSyncRepository.save(fonteSync);
    }

    @Transactional
    public void registrarErroDou(String secao, String mensagem) {
        FonteSync fonteSync = getOrCreateDouSecao(secao);
        LocalDateTime now = LocalDateTime.now();

        fonteSync.setStatus(StatusIntegracao.ERRO);
        fonteSync.setUltimoSyncEm(now);
        fonteSync.setProximoSyncEm(now.plusHours(12));
        fonteSync.setTentativas(fonteSync.getTentativas() + 1);
        fonteSync.setUltimaMensagem(mensagem);

        fonteSyncRepository.save(fonteSync);
    }

    private FonteSync getOrCreateDatajudProcesso(Processo processo) {
        return fonteSyncRepository
                .findByFonteAndReferenciaTipoAndReferenciaId(
                        FonteIntegracao.DATAJUD,
                        TipoReferenciaIntegracao.PROCESSO,
                        processo.getId()
                )
                .orElseGet(() -> FonteSync.builder()
                        .fonte(FonteIntegracao.DATAJUD)
                        .referenciaTipo(TipoReferenciaIntegracao.PROCESSO)
                        .referenciaId(processo.getId())
                        .referenciaExterna(processo.getNumero())
                        .build());
    }

    private FonteSync getOrCreateDomicilioInstituicao(String referencia) {
        UUID referenciaId = UUID.nameUUIDFromBytes(referencia.getBytes(StandardCharsets.UTF_8));
        return fonteSyncRepository
                .findByFonteAndReferenciaTipoAndReferenciaId(
                        FonteIntegracao.DOMICILIO,
                        TipoReferenciaIntegracao.INSTITUICAO,
                        referenciaId
                )
                .orElseGet(() -> FonteSync.builder()
                        .fonte(FonteIntegracao.DOMICILIO)
                        .referenciaTipo(TipoReferenciaIntegracao.INSTITUICAO)
                        .referenciaId(referenciaId)
                        .referenciaExterna(referencia)
                        .build());
    }

    private FonteSync getOrCreateDjenTribunal(String tribunal) {
        String referencia = tribunal == null || tribunal.isBlank() ? "DJEN" : tribunal.trim().toUpperCase();
        UUID referenciaId = UUID.nameUUIDFromBytes(("DJEN:" + referencia).getBytes(StandardCharsets.UTF_8));
        return fonteSyncRepository
                .findByFonteAndReferenciaTipoAndReferenciaId(
                        FonteIntegracao.DJEN,
                        TipoReferenciaIntegracao.INSTITUICAO,
                        referenciaId
                )
                .orElseGet(() -> FonteSync.builder()
                        .fonte(FonteIntegracao.DJEN)
                        .referenciaTipo(TipoReferenciaIntegracao.INSTITUICAO)
                        .referenciaId(referenciaId)
                        .referenciaExterna(referencia)
                        .build());
    }

    private FonteSync getOrCreateDouSecao(String secao) {
        String referencia = secao == null || secao.isBlank() ? "DOU" : secao.trim().toUpperCase();
        UUID referenciaId = UUID.nameUUIDFromBytes(("DOU:" + referencia).getBytes(StandardCharsets.UTF_8));
        return fonteSyncRepository
                .findByFonteAndReferenciaTipoAndReferenciaId(
                        FonteIntegracao.DOU,
                        TipoReferenciaIntegracao.INSTITUICAO,
                        referenciaId
                )
                .orElseGet(() -> FonteSync.builder()
                        .fonte(FonteIntegracao.DOU)
                        .referenciaTipo(TipoReferenciaIntegracao.INSTITUICAO)
                        .referenciaId(referenciaId)
                        .referenciaExterna(referencia)
                        .build());
    }

    private String buildMensagem(String mensagem, int novasMovimentacoes) {
        String resumo = "Sincronizacao concluida";
        if (mensagem != null && !mensagem.isBlank()) {
            resumo = mensagem.trim();
        }

        return resumo + ". Novas movimentacoes: " + novasMovimentacoes + ".";
    }
}
