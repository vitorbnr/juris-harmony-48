package com.viana.model;

import com.viana.model.enums.PrioridadePrazo;
import com.viana.model.enums.EtapaPrazo;
import com.viana.model.enums.ModalidadeAtividade;
import com.viana.model.enums.TipoUnidadeAlertaPrazo;
import com.viana.model.enums.TipoPrazo;
import com.viana.model.enums.TipoVinculoPrazo;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "prazos")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Prazo {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String titulo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processo_id")
    private Processo processo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evento_juridico_id")
    private EventoJuridico eventoJuridico;

    @Column(nullable = false)
    private LocalDate data;

    private LocalTime hora;

    private LocalDate dataFim;

    private LocalTime horaFim;

    @Column(nullable = false)
    @Builder.Default
    private Boolean diaInteiro = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoPrazo tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PrioridadePrazo prioridade;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EtapaPrazo etapa = EtapaPrazo.A_FAZER;

    @Column(nullable = false)
    @Builder.Default
    private Boolean concluido = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "advogado_id")
    private Usuario advogado;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "prazos_participantes",
            joinColumns = @JoinColumn(name = "prazo_id"),
            inverseJoinColumns = @JoinColumn(name = "usuario_id")
    )
    @Builder.Default
    private Set<Usuario> participantes = new LinkedHashSet<>();

    @Column(length = 80)
    private String etiqueta;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(length = 255)
    private String local;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ModalidadeAtividade modalidade;

    @Column(length = 120)
    private String sala;

    private Integer alertaValor;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private TipoUnidadeAlertaPrazo alertaUnidade;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TipoVinculoPrazo vinculoTipo;

    private UUID vinculoReferenciaId;

    @Column(length = 80)
    @Builder.Default
    private String quadroKanban = "Operacional";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidade_id")
    private Unidade unidade;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime criadoEm = LocalDateTime.now();

    private LocalDateTime concluidoEm;
}
