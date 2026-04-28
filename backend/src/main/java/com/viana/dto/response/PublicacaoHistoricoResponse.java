package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicacaoHistoricoResponse {
    private String id;
    private String acao;
    private String usuarioId;
    private String usuarioNome;
    private String usuarioDestinoId;
    private String usuarioDestinoNome;
    private String observacao;
    private String criadoEm;
}
