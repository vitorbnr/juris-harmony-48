package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicacaoAtividadeResponse {
    private String id;
    private String titulo;
    private String tipo;
    private String data;
    private String hora;
    private String prioridade;
    private String etapa;
    private Boolean concluido;
    private String advogadoId;
    private String advogadoNome;
    private String eventoJuridicoId;
}
