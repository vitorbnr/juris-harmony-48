package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrazoResponse {
    private String id;
    private String titulo;
    private String processoId;
    private String processoNumero;
    private String clienteNome;
    private String data;
    private String hora;
    private String tipo;
    private String prioridade;
    private boolean concluido;
    private String advogadoId;
    private String advogadoNome;
    private String descricao;
    private String unidadeId;
}
