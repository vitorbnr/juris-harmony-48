package com.viana.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "publicacoes_fontes_sync_execucoes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicacaoFonteSyncExecucao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fonte_monitorada_id", nullable = false)
    private PublicacaoFonteMonitorada fonteMonitorada;

    @Column(name = "tipo_execucao", nullable = false, length = 30)
    private String tipoExecucao;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDENTE";

    @Column(name = "data_inicio")
    private LocalDate dataInicio;

    @Column(name = "data_fim")
    private LocalDate dataFim;

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

    @Column(name = "proxima_execucao_em")
    private LocalDateTime proximaExecucaoEm;

    @Column(name = "duracao_ms")
    private Long duracaoMs;

    @PrePersist
    protected void onCreate() {
        if (iniciadoEm == null) {
            iniciadoEm = LocalDateTime.now();
        }
        if (status == null || status.isBlank()) {
            status = "PENDENTE";
        }
        if (cadernosConsultados == null) {
            cadernosConsultados = 0;
        }
        if (cadernosBaixados == null) {
            cadernosBaixados = 0;
        }
        if (publicacoesLidas == null) {
            publicacoesLidas = 0;
        }
        if (publicacoesImportadas == null) {
            publicacoesImportadas = 0;
        }
        if (falhas == null) {
            falhas = 0;
        }
    }
}
