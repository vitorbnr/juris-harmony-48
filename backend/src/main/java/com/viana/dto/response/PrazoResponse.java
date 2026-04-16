package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrazoResponse {
    private String id;
    private String titulo;
    private String processoId;
    private String eventoJuridicoId;
    private String processoNumero;
    private String clienteNome;
    private String data;
    private String hora;
    private String dataFim;
    private String horaFim;
    private boolean diaInteiro;
    private String tipo;
    private String prioridade;
    private String etapa;
    private boolean concluido;
    private String advogadoId;
    private String advogadoNome;
    private List<ParticipanteInfo> participantes;
    private String etiqueta;
    private String descricao;
    private String local;
    private String modalidade;
    private String sala;
    private Integer alertaValor;
    private String alertaUnidade;
    private String vinculoTipo;
    private String vinculoReferenciaId;
    private String quadroKanban;
    private String unidadeId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipanteInfo {
        private String id;
        private String nome;
    }
}
