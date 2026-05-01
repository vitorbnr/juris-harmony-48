package com.viana.service;

import com.viana.model.Processo;
import com.viana.model.Publicacao;
import com.viana.model.enums.LadoProcessualPublicacao;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PublicacaoTriagemInteligenteServiceTest {

    private final PublicacaoTriagemInteligenteService service = new PublicacaoTriagemInteligenteService();

    @Test
    void detectaPrazoExpressoComAcentosNormalizados() {
        Publicacao publicacao = Publicacao.builder()
                .processo(Processo.builder().numero("0000000-00.2026.8.26.0100").build())
                .teor("Intimem-se as partes para manifestarem-se no prazo comum de 15 dias.")
                .build();

        service.enriquecer(publicacao);

        assertThat(publicacao.isRiscoPrazo()).isTrue();
        assertThat(publicacao.getIaPrazoSugeridoDias()).isEqualTo(15);
        assertThat(publicacao.getIaAcaoSugerida()).isEqualTo("CRIAR_PRAZO");
        assertThat(publicacao.getIaConfianca()).isGreaterThanOrEqualTo(75);
    }

    @Test
    void priorizaAudienciaAntesDePrazoGenerico() {
        Publicacao publicacao = Publicacao.builder()
                .processo(Processo.builder().numero("0000000-00.2026.8.26.0100").build())
                .teor("Designada audiência de instrução para o dia 10/06/2026. Intimem-se.")
                .build();

        service.enriquecer(publicacao);

        assertThat(publicacao.isRiscoPrazo()).isTrue();
        assertThat(publicacao.getIaAcaoSugerida()).isEqualTo("CRIAR_AUDIENCIA");
        assertThat(publicacao.getResumoOperacional()).contains("audiencia");
    }

    @Test
    void exigeVinculoDeProcessoAntesDeCriarAtividade() {
        Publicacao publicacao = Publicacao.builder()
                .teor("Intime-se a parte autora para apresentar contestacao no prazo de 5 dias.")
                .build();

        service.enriquecer(publicacao);

        assertThat(publicacao.getIaAcaoSugerida()).isEqualTo("VINCULAR_PROCESSO");
        assertThat(publicacao.getResumoOperacional()).contains("sem processo vinculado");
        assertThat(publicacao.getIaPrazoSugeridoDias()).isEqualTo(5);
    }

    @Test
    void mantemPublicacaoSemTermosFortesComoRevisaoSegura() {
        Publicacao publicacao = Publicacao.builder()
                .processo(Processo.builder().numero("0000000-00.2026.8.26.0100").build())
                .teor("Certifico a remessa dos autos ao arquivo definitivo.")
                .build();

        service.enriquecer(publicacao);

        assertThat(publicacao.getIaAcaoSugerida()).isEqualTo("REVISAR_ARQUIVAR");
        assertThat(publicacao.isRiscoPrazo()).isFalse();
        assertThat(publicacao.getLadoProcessualEstimado()).isEqualTo(LadoProcessualPublicacao.INDEFINIDO);
    }

    @Test
    void trataDecursoDePrazoComoTarefaENaoComoNovoPrazo() {
        Publicacao publicacao = Publicacao.builder()
                .processo(Processo.builder().numero("0000000-00.2026.8.26.0100").build())
                .teor("Certifico o decurso de prazo sem manifestacao da parte interessada.")
                .build();

        service.enriquecer(publicacao);

        assertThat(publicacao.isRiscoPrazo()).isTrue();
        assertThat(publicacao.getIaAcaoSugerida()).isEqualTo("CRIAR_TAREFA");
        assertThat(publicacao.getIaPrazoSugeridoDias()).isNull();
        assertThat(publicacao.getResumoOperacional()).contains("decurso de prazo");
    }
}
