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
public class AtendimentoResponse {
    private String id;
    private String clienteId;
    private String clienteNome;
    private String usuarioId;
    private String usuarioNome;
    private String unidadeId;
    private String unidadeNome;
    private String processoId;
    private String processoNumero;
    private String vinculoTipo;
    private String vinculoReferenciaId;
    private String assunto;
    private String descricao;
    private String status;
    private List<String> etiquetas;
    private String dataCriacao;
    private String dataAtualizacao;
}
