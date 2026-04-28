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
public class PublicacaoDouSyncResponse {
    private boolean enabled;
    private boolean configurada;
    private List<String> secoes;
    private int diasAvaliados;
    private int cadernosConsultados;
    private int cadernosBaixados;
    private int publicacoesLidas;
    private int publicacoesImportadas;
    private int falhas;
    private String mensagem;
}
