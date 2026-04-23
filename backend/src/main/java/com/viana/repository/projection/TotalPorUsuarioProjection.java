package com.viana.repository.projection;

import java.util.UUID;

public interface TotalPorUsuarioProjection {
    UUID getUsuarioId();
    Long getTotal();
}
