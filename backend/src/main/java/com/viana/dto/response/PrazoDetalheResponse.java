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
public class PrazoDetalheResponse {

    private PrazoResponse prazo;
    private String criadoEm;
    private String criadoPorNome;
    private String unidadeNome;
    private ProcessoInfo processo;
    private EventoJuridicoInfo eventoJuridico;
    private List<ComentarioInfo> comentarios;
    private List<HistoricoInfo> historico;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProcessoInfo {
        private String id;
        private String numero;
        private String clienteNome;
        private String tribunal;
        private String vara;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EventoJuridicoInfo {
        private String id;
        private String fonte;
        private String tipo;
        private String status;
        private String titulo;
        private String descricao;
        private String orgaoJulgador;
        private String referenciaExterna;
        private String linkOficial;
        private String destinatario;
        private String parteRelacionada;
        private String dataEvento;
        private String responsavelId;
        private String responsavelNome;
        private String criadoEm;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComentarioInfo {
        private String id;
        private String conteudo;
        private String criadoEm;
        private String autorId;
        private String autorNome;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoricoInfo {
        private String id;
        private String descricao;
        private String acao;
        private String usuarioNome;
        private String dataHora;
    }
}
