package com.viana.model;

import com.viana.model.enums.LadoProcessualPublicacao;
import com.viana.model.enums.StatusFluxoPublicacao;
import com.viana.model.enums.StatusTratamento;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "publicacoes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Publicacao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(length = 30)
    private String npu;

    @Column(name = "tribunal_origem", nullable = false, length = 150)
    private String tribunalOrigem;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String teor;

    @Column(name = "data_publicacao", nullable = false)
    private LocalDateTime dataPublicacao;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_tratamento", nullable = false, length = 20)
    private StatusTratamento statusTratamento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processo_id")
    private Processo processo;

    @Column(length = 30)
    private String fonte;

    @Column(name = "identificador_externo", length = 180)
    private String identificadorExterno;

    @Column(name = "captada_em_nome", length = 180)
    private String captadaEmNome;

    @Column(name = "oab_monitorada", length = 30)
    private String oabMonitorada;

    @Column(name = "hash_deduplicacao", length = 120)
    private String hashDeduplicacao;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_fluxo", nullable = false, length = 30)
    @Builder.Default
    private StatusFluxoPublicacao statusFluxo = StatusFluxoPublicacao.RECEBIDA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsavel_processo_id")
    private Usuario responsavelProcesso;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atribuida_para_usuario_id")
    private Usuario atribuidaPara;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assumida_por_usuario_id")
    private Usuario assumidaPor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tratada_por_usuario_id")
    private Usuario tratadaPor;

    @Column(name = "data_atribuicao")
    private LocalDateTime dataAtribuicao;

    @Column(name = "data_assuncao")
    private LocalDateTime dataAssuncao;

    @Column(name = "data_tratamento")
    private LocalDateTime dataTratamento;

    @Column(name = "motivo_descarte", length = 255)
    private String motivoDescarte;

    @Column(name = "data_criacao", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime dataCriacao = LocalDateTime.now();

    @Column(name = "data_atualizacao", nullable = false)
    @Builder.Default
    private LocalDateTime dataAtualizacao = LocalDateTime.now();

    @Column(name = "ia_acao_sugerida", length = 120)
    private String iaAcaoSugerida;

    @Column(name = "ia_prazo_sugerido_dias")
    private Integer iaPrazoSugeridoDias;

    @Column(name = "resumo_operacional", columnDefinition = "TEXT")
    private String resumoOperacional;

    @Column(name = "risco_prazo", nullable = false)
    @Builder.Default
    private boolean riscoPrazo = false;

    @Column(name = "score_prioridade", nullable = false)
    @Builder.Default
    private Integer scorePrioridade = 0;

    @Column(name = "justificativa_prioridade", length = 255)
    private String justificativaPrioridade;

    @Column(name = "ia_confianca")
    private Integer iaConfianca;

    @Column(name = "ia_trechos_relevantes", columnDefinition = "TEXT")
    private String iaTrechosRelevantes;

    @Enumerated(EnumType.STRING)
    @Column(name = "lado_processual_estimado", length = 30)
    private LadoProcessualPublicacao ladoProcessualEstimado;

    @PrePersist
    protected void onCreate() {
        LocalDateTime agora = LocalDateTime.now();
        if (dataCriacao == null) {
            dataCriacao = agora;
        }
        if (dataAtualizacao == null) {
            dataAtualizacao = agora;
        }
        if (statusFluxo == null) {
            statusFluxo = StatusFluxoPublicacao.RECEBIDA;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        dataAtualizacao = LocalDateTime.now();
    }
}
