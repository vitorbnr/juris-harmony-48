package com.viana.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CriarPublicacaoDjenRequest {
    private UUID processoId;
    private UUID responsavelId;
    private String titulo;
    private String descricao;
    private String orgaoJulgador;
    private String referenciaExterna;
    private String linkOficial;
    private String destinatario;
    private String parteRelacionada;
    private LocalDate dataEvento;
    private LocalTime horaEvento;
}
