package com.viana.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IngestarPublicacaoRequest {

    private String npu;

    @NotBlank
    private String tribunalOrigem;

    @NotBlank
    private String teor;

    @NotNull
    private LocalDateTime dataPublicacao;

    private String fonte;
    private String identificadorExterno;
    private String captadaEmNome;
    private String oabMonitorada;
    private String hashDeduplicacao;
    private UUID atribuidaParaUsuarioId;
    private List<UUID> destinatariosNotificacaoIds;
}
