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
public class CasoResponse {
    private String id;
    private String clienteId;
    private String clienteNome;
    private String unidadeId;
    private String unidadeNome;
    private String responsavelId;
    private String responsavelNome;
    private String titulo;
    private String descricao;
    private String observacoes;
    private List<String> etiquetas;
    private String acesso;
    private List<EnvolvidoInfo> envolvidos;
    private String dataCriacao;
    private String dataAtualizacao;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EnvolvidoInfo {
        private String id;
        private String nome;
        private String qualificacao;
    }
}
