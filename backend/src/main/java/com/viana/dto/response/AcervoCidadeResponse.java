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
public class AcervoCidadeResponse {
    private String chave;
    private String cidade;
    private String estado;
    private String label;
    private long totalClientes;
    private List<AcervoClienteResponse> clientes;
}
