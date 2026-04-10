package com.viana.model;

import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.StatusIntegracao;
import com.viana.model.enums.TipoReferenciaIntegracao;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
@Table(name = "fontes_sync")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FonteSync {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FonteIntegracao fonte;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoReferenciaIntegracao referenciaTipo;

    @Column(nullable = false)
    private UUID referenciaId;

    @Column(length = 255)
    private String referenciaExterna;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusIntegracao status = StatusIntegracao.PENDENTE;

    private LocalDateTime ultimoSyncEm;

    private LocalDateTime ultimoSucessoEm;

    private LocalDateTime proximoSyncEm;

    @Column(nullable = false)
    @Builder.Default
    private Integer tentativas = 0;

    @Column(columnDefinition = "TEXT")
    private String ultimaMensagem;

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
