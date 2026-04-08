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
public class ProcessoResponse {
    private String id;
    private String numero;
    private String clienteId;
    private String clienteNome;
    private String tipo;
    private String vara;
    private String tribunal;

    /** Lista completa de advogados responsáveis. */
    private List<AdvogadoInfo> advogados;

    /**
     * Compatibilidade: ID do primeiro advogado da lista (pode ser null se não houver nenhum).
     */
    private String advogadoId;

    /**
     * Compatibilidade: nome do primeiro advogado da lista (pode ser null).
     */
    private String advogadoNome;

    private String status;
    private String dataDistribuicao;
    private String ultimaMovimentacao;
    private String proximoPrazo;
    private String valorCausa;
    private String descricao;
    private String unidadeId;
    private String unidadeNome;
    private List<MovimentacaoResponse> movimentacoes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdvogadoInfo {
        private String id;
        private String nome;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MovimentacaoResponse {
        private String id;
        private String data;
        private String dataHora;
        private String descricao;
        private String tipo;
        private String origem;
        private String orgaoJulgador;
    }
}
