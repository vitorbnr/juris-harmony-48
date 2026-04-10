package com.viana.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "api.domicilio")
public class DomicilioApiProperties {

    private boolean enabled;
    private String baseUrl;
    private String tokenUrl;
    private String clientId;
    private String clientSecret;
    private String onBehalfOf;
    private String tenantId;
    private String euPath = "/api/v1/eu";
    private String comunicacoesPath = "/comunicacoes";
    private Integer lookbackDays = 1;
    private Integer pageSize = 100;
}
