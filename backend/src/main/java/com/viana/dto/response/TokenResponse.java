package com.viana.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenResponse {

    private String accessToken;
    private String refreshToken;
    private String tipo;
    private long expiresIn;
    private UsuarioResumoResponse usuario;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsuarioResumoResponse {
        private String id;
        private String nome;
        private String email;
        private String papel;
        private String cargo;
        private String oab;
        private String cpf;
        private Boolean habilitadoDomicilio;
        private String initials;
        private String unidadeId;
        private String unidadeNome;
    }
}
