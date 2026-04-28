package com.viana.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarFontePublicacaoMonitoradaRequest {

    @NotBlank
    private String tipo;

    @NotBlank
    private String nomeExibicao;

    @NotBlank
    private String valorMonitorado;

    private String uf;
    private String observacao;
    private List<UUID> destinatariosIds;
    private List<String> diariosCodigos;
}
