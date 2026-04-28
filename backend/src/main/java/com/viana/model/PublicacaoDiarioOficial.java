package com.viana.model;

import com.viana.model.enums.EstrategiaColetaPublicacao;
import com.viana.model.enums.GrupoDiarioOficialPublicacao;
import com.viana.model.enums.StatusDiarioOficialPublicacao;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
@Table(name = "publicacoes_diarios_oficiais")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicacaoDiarioOficial {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 40)
    private String codigo;

    @Column(nullable = false, length = 180)
    private String nome;

    @Column(length = 2)
    private String uf;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private GrupoDiarioOficialPublicacao grupo;

    @Enumerated(EnumType.STRING)
    @Column(name = "estrategia_coleta", nullable = false, length = 40)
    private EstrategiaColetaPublicacao estrategiaColeta;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private StatusDiarioOficialPublicacao status;

    @Column(name = "requer_scraping", nullable = false)
    @Builder.Default
    private Boolean requerScraping = false;

    @Column(name = "custo_estimado", nullable = false, length = 20)
    @Builder.Default
    private String custoEstimado = "ZERO";

    @Column(columnDefinition = "TEXT")
    private String observacao;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;

    @Column(name = "data_criacao", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime dataCriacao = LocalDateTime.now();

    @Column(name = "data_atualizacao", nullable = false)
    @Builder.Default
    private LocalDateTime dataAtualizacao = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        LocalDateTime agora = LocalDateTime.now();
        if (dataCriacao == null) {
            dataCriacao = agora;
        }
        if (dataAtualizacao == null) {
            dataAtualizacao = agora;
        }
        if (ativo == null) {
            ativo = true;
        }
        if (requerScraping == null) {
            requerScraping = false;
        }
        if (custoEstimado == null || custoEstimado.isBlank()) {
            custoEstimado = "ZERO";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        dataAtualizacao = LocalDateTime.now();
    }
}
