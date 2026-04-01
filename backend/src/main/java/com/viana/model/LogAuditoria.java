package com.viana.model;

import com.viana.model.enums.ModuloLog;
import com.viana.model.enums.TipoAcao;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "logs_auditoria")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class LogAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoAcao acao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ModuloLog modulo;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String descricao;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime dataHora = LocalDateTime.now();
}
