package com.viana.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CriarAtendimentoRequest {

    @NotNull(message = "Cliente e obrigatorio")
    private UUID clienteId;

    @NotNull(message = "Responsavel e obrigatorio")
    private UUID usuarioId;

    private UUID unidadeId;
    private UUID processoId;
    private String tipoVinculo;
    private UUID vinculoReferenciaId;

    @NotBlank(message = "Assunto e obrigatorio")
    @Size(max = 255, message = "Assunto deve ter no maximo 255 caracteres")
    private String assunto;

    private String descricao;

    private List<String> etiquetas;
}
