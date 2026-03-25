package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificacaoResponse {
    private String id;
    private String titulo;
    private String descricao;
    private String tipo;
    private boolean lida;
    private String criadaEm;
    private String link;
}
