package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentoResponse {
    private String id;
    private String nome;
    private String tipo;
    private String categoria;
    private long tamanhoBytes;
    private String clienteId;
    private String processoId;
    private String pastaId;
    private String dataUpload;
    private String uploadedPor;
}
