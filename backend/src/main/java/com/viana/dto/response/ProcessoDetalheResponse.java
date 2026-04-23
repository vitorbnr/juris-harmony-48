package com.viana.dto.response;

import com.viana.model.enums.StatusProcessoDossie;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessoDetalheResponse {

    private String id;
    private String npu;
    private String numero;
    private String clienteId;
    private String clienteNome;
    private String casoId;
    private String casoTitulo;
    private String titulo;
    private String tipo;
    private String tipoAcao;
    private String foro;
    private String vara;
    private String tribunal;
    private StatusProcessoDossie status;
    private String statusOriginal;
    private LocalDate dataDistribuicao;
    private LocalDateTime dataUltimaMovimentacao;
    private LocalDate proximoPrazo;
    private BigDecimal valorCausa;
    private String descricao;
    private List<String> etiquetas;
    private List<AdvogadoInfo> advogados;
    private String advogadoId;
    private String advogadoNome;
    private List<ParteEnvolvidaInfo> partesEnvolvidas;
    private List<PrazoVinculadoInfo> prazosVinculados;
    private List<ParteInfo> partes;
    private List<MovimentacaoInfo> movimentacoes;
    private String unidadeId;
    private String unidadeNome;

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
    public static class ParteEnvolvidaInfo {
        private String id;
        private String nome;
        private String polo;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrazoVinculadoInfo {
        private String id;
        private String titulo;
        private LocalDate dataFatal;
        private String statusKanban;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MovimentacaoInfo {
        private String id;
        private LocalDate data;
        private LocalDateTime dataHora;
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
