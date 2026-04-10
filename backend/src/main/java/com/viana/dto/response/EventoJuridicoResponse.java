package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventoJuridicoResponse {
    private String id;
    private String processoId;
    private String processoNumero;
    private String clienteNome;
    private String fonte;
    private String tipo;
    private String status;
    private String titulo;
    private String descricao;
    private String orgaoJulgador;
    private String referenciaExterna;
    private String destinatario;
    private String parteRelacionada;
    private String dataEvento;
    private String responsavelId;
    private String responsavelNome;
    private String criadoEm;
}
