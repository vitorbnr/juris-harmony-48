package com.viana.model;

import com.viana.model.enums.TipoCliente;
import com.viana.model.enums.TipoContaBancaria;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "clientes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoCliente tipo;

    @Column(unique = true, length = 20)
    private String cpfCnpj;

    @Column(length = 200)
    private String email;

    @Column(length = 20)
    private String telefone;

    @Column(length = 100)
    private String cidade;

    @Column(length = 2)
    private String estado;

    @Column(length = 30)
    private String rg;

    @Column(length = 30)
    private String ctps;

    @Column(length = 20)
    private String pis;

    @Column(length = 20)
    private String tituloEleitorNumero;

    @Column(length = 10)
    private String tituloEleitorZona;

    @Column(length = 10)
    private String tituloEleitorSessao;

    @Column(length = 20)
    private String cnhNumero;

    @Column(length = 5)
    private String cnhCategoria;

    private LocalDate cnhVencimento;

    @Column(length = 30)
    private String passaporteNumero;

    @Column(length = 30)
    private String certidaoReservistaNumero;

    private LocalDate dataNascimento;

    @Column(length = 200)
    private String nomePai;

    @Column(length = 200)
    private String nomeMae;

    @Column(length = 150)
    private String naturalidade;

    @Column(length = 100)
    private String nacionalidade;

    @Column(length = 50)
    private String estadoCivil;

    @Column(length = 100)
    private String profissao;

    @Column(length = 150)
    private String empresa;

    @Column(length = 150)
    private String atividadeEconomica;

    @Column(columnDefinition = "TEXT")
    private String comentarios;

    @Column(length = 100)
    private String bancoNome;

    @Column(length = 20)
    private String bancoAgencia;

    @Column(length = 30)
    private String bancoConta;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TipoContaBancaria bancoTipo;

    @Column(length = 100)
    private String chavePix;

    @Column(name = "is_falecido", nullable = false)
    @Builder.Default
    private Boolean falecido = false;

    @Column(columnDefinition = "TEXT")
    private String detalhesObito;

    @Column(nullable = false)
    @Builder.Default
    private LocalDate dataCadastro = LocalDate.now();

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @JoinColumn(name = "advogado_id")
    private Usuario advogadoResponsavel;

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @JoinColumn(name = "unidade_id", nullable = false)
    private Unidade unidade;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime criadoEm = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime atualizadoEm = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        this.atualizadoEm = LocalDateTime.now();
    }

    public String getInitials() {
        if (nome == null || nome.isBlank()) {
            return "??";
        }
        String[] parts = nome.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
        }
        return (parts[0].charAt(0) + "" + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
}
