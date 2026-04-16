package com.viana.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notas_pessoais")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotaPessoal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    private Usuario usuario;

    @Column(columnDefinition = "TEXT")
    private String conteudo;

    @Column(name = "data_atualizacao", nullable = false)
    @Builder.Default
    private LocalDateTime dataAtualizacao = LocalDateTime.now();

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.dataAtualizacao = LocalDateTime.now();
    }
}
