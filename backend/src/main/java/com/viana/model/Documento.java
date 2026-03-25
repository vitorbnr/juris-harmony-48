package com.viana.model;

import com.viana.model.enums.CategoriaDocumento;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "documentos")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Documento {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 300)
    private String nome;

    @Column(nullable = false, length = 20)
    private String tipo; // extensão: pdf, docx, mp4, etc.

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CategoriaDocumento categoria;

    @Column(nullable = false)
    private Long tamanhoBytes;

    @Column(nullable = false, length = 500)
    private String storageKey; // chave no Cloudflare R2

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processo_id")
    private Processo processo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pasta_id")
    private Pasta pasta;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime dataUpload = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_por", nullable = false)
    private Usuario uploadedPor;
}
