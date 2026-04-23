package com.viana.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CriarCasoRequest {

    @NotNull(message = "Cliente e obrigatorio")
    private UUID clienteId;

    private UUID unidadeId;

    @NotNull(message = "Responsavel e obrigatorio")
    private UUID responsavelId;

    @NotBlank(message = "Titulo e obrigatorio")
    private String titulo;

    private String descricao;
    private String observacoes;
    private List<String> etiquetas;

    @NotBlank(message = "Acesso e obrigatorio")
    private String acesso;

    private List<CasoEnvolvidoRequest> envolvidos;
}
