package com.viana.model;

import com.viana.model.enums.StatusProcesso;
import com.viana.model.enums.TipoProcesso;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "processos")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Processo {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 30)
    private String numero;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoProcesso tipo;

    @Column(length = 100)
    private String vara;

    @Column(length = 50)
    private String tribunal;

    /**
     * Advogados responsáveis pelo processo (zero ou mais).
     * Substituiu o antigo campo advogado (ManyToOne).
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "processo_advogados",
        joinColumns = @JoinColumn(name = "processo_id"),
        inverseJoinColumns = @JoinColumn(name = "usuario_id")
    )
    @Builder.Default
    private Set<Usuario> advogados = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusProcesso status;

    private LocalDate dataDistribuicao;

    private LocalDate ultimaMovimentacao;

    private LocalDate proximoPrazo;

    @Column(precision = 15, scale = 2)
    private BigDecimal valorCausa;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidade_id", nullable = false)
    private Unidade unidade;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "caso_id")
    private Caso caso;

    @OneToMany(mappedBy = "processo", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("data DESC")
    @Builder.Default
    private List<Movimentacao> movimentacoes = new ArrayList<>();

    @OneToMany(mappedBy = "processo", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("nome ASC")
    @BatchSize(size = 50)
    @Builder.Default
    private List<ProcessoEtiqueta> etiquetas = new ArrayList<>();

    @OneToMany(mappedBy = "processo", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("principal DESC, nome ASC")
    @BatchSize(size = 50)
    @Builder.Default
    private List<ProcessoParte> partes = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime criadoEm = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime atualizadoEm = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        this.atualizadoEm = LocalDateTime.now();
    }
}
