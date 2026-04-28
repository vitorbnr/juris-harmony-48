package com.viana.model;

import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.StatusIntegracao;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "publicacoes_capturas_execucoes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicacaoCapturaExecucao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FonteIntegracao fonte;

    @Column(name = "diario_codigo", nullable = false, length = 40)
    private String diarioCodigo;

    @Column(name = "data_referencia", nullable = false)
    private LocalDate dataReferencia;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusIntegracao status = StatusIntegracao.PENDENTE;

    @Column(name = "cadernos_consultados", nullable = false)
    @Builder.Default
    private Integer cadernosConsultados = 0;

    @Column(name = "cadernos_baixados", nullable = false)
    @Builder.Default
    private Integer cadernosBaixados = 0;

    @Column(name = "publicacoes_lidas", nullable = false)
    @Builder.Default
    private Integer publicacoesLidas = 0;

    @Column(name = "publicacoes_importadas", nullable = false)
    @Builder.Default
    private Integer publicacoesImportadas = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer falhas = 0;

    @Column(columnDefinition = "TEXT")
    private String mensagem;

    @Column(name = "iniciado_em", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime iniciadoEm = LocalDateTime.now();

    @Column(name = "finalizado_em")
    private LocalDateTime finalizadoEm;

    @Column(name = "duracao_ms")
    private Long duracaoMs;

    @PrePersist
    protected void onCreate() {
        if (iniciadoEm == null) {
            iniciadoEm = LocalDateTime.now();
        }
        if (status == null) {
            status = StatusIntegracao.PENDENTE;
        }
        if (cadernosConsultados == null) cadernosConsultados = 0;
        if (cadernosBaixados == null) cadernosBaixados = 0;
        if (publicacoesLidas == null) publicacoesLidas = 0;
        if (publicacoesImportadas == null) publicacoesImportadas = 0;
        if (falhas == null) falhas = 0;
    }

    public void finalizar(StatusIntegracao novoStatus) {
        LocalDateTime agora = LocalDateTime.now();
        this.status = novoStatus;
        this.finalizadoEm = agora;
        this.duracaoMs = Duration.between(this.iniciadoEm, agora).toMillis();
    }
}
