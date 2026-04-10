package com.viana.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class AtualizarIntegracaoDomicilioRequest {
    private UUID usuarioOperadorId;
}
