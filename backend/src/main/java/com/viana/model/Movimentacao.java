package com.viana.model;

import com.viana.model.enums.OrigemMovimentacao;
import com.viana.model.enums.TipoMovimentacao;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "movimentacoes")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Movimentacao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processo_id", nullable = false)
    private Processo processo;

    @Column(nullable = false)
    private LocalDate data;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMovimentacao tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrigemMovimentacao origem = OrigemMovimentacao.MANUAL;

    @Column
    private Integer codigoExterno;

    @Column(length = 255)
    private String chaveExterna;

    @Column(length = 255)
    private String orgaoJulgador;

    private LocalDateTime dataHoraOriginal;
}
