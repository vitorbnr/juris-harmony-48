package com.viana.model;

import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.StatusEventoJuridico;
import com.viana.model.enums.TipoEventoJuridico;
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
@Table(name = "eventos_juridicos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventoJuridico {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processo_id")
    private Processo processo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsavel_id")
    private Usuario responsavel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FonteIntegracao fonte;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoEventoJuridico tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusEventoJuridico status = StatusEventoJuridico.NOVO;

    @Column(nullable = false, length = 255)
    private String titulo;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String descricao;

    @Column(length = 255)
    private String orgaoJulgador;

    @Column(length = 255)
    private String referenciaExterna;

    @Column(length = 500)
    private String linkOficial;

    @Column(length = 255)
    private String destinatario;

    @Column(length = 200)
    private String parteRelacionada;

    @Column(nullable = false, length = 255, unique = true)
    private String hashDeduplicacao;

    private LocalDateTime dataEvento;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime criadoEm = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime atualizadoEm = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        this.atualizadoEm = LocalDateTime.now();
    }
}
