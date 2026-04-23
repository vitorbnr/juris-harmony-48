package com.viana.model;

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

    @PrePersist
    protected void onCreate() {
        LocalDateTime agora = LocalDateTime.now();
        if (dataCriacao == null) {
            dataCriacao = agora;
        }
        if (dataAtualizacao == null) {
            dataAtualizacao = agora;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        dataAtualizacao = LocalDateTime.now();
    }
}
