package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DomicilioComunicacaoResponse {
    private String idExterno;
    private String numeroProcesso;
    private String tipoComunicacao;
    private String assunto;
    private String orgaoOrigem;
    private String statusCiente;
    private String destinatario;
    private String dataDisponibilizacao;
    private String dataCiencia;
    private String linkConsultaOficial;
}
