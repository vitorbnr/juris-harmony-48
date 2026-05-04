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
public class PublicacaoFonteMonitoradaResponse {
    private String id;
    private String tipo;
    private String nomeExibicao;
    private String valorMonitorado;
    private String uf;
    private String observacao;
    private Boolean ativo;
    private List<PublicacaoDestinatarioResponse> destinatarios;
    private List<PublicacaoDiarioOficialResponse> diariosMonitorados;
    private String abrangenciaResumo;
    private String criadoPorUsuarioId;
    private String criadoPorUsuarioNome;
    private String dataCriacao;
    private String dataAtualizacao;
    private PublicacaoFonteSyncExecucaoResponse ultimaCapturaDjen;
    private PublicacaoFonteSyncExecucaoResponse ultimoBackfillDjen;
}
