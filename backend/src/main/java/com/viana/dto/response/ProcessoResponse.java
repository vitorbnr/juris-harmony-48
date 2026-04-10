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
    private List<AdvogadoInfo> advogados;
    private String advogadoId;
    private String advogadoNome;
    private String status;
    private String dataDistribuicao;
    private String ultimaMovimentacao;
    private String proximoPrazo;
    private String valorCausa;
    private String descricao;
    private List<String> etiquetas;
    private List<ParteInfo> partes;
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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParteInfo {
        private String id;
        private String nome;
        private String documento;
        private String tipo;
        private String polo;
        private Boolean principal;
        private String observacao;
        private List<RepresentanteInfo> representantes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RepresentanteInfo {
        private String id;
        private String nome;
        private String cpf;
        private String oab;
        private Boolean principal;
        private String usuarioInternoId;
        private String usuarioInternoNome;
    }
}
