package com.viana.service;

import com.viana.config.DomicilioApiProperties;
import com.viana.exception.BusinessException;
import com.viana.model.IntegracaoConfiguracao;
import com.viana.model.Usuario;
import com.viana.model.enums.CodigoIntegracao;
import com.viana.repository.IntegracaoConfiguracaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DomicilioOperadorResolver {

    private final IntegracaoConfiguracaoRepository integracaoConfiguracaoRepository;
    private final DomicilioApiProperties properties;

    public Optional<DomicilioOperadorContext> findContext() {
        Optional<IntegracaoConfiguracao> configuracao = integracaoConfiguracaoRepository.findByCodigo(CodigoIntegracao.DOMICILIO);
        if (configuracao.isPresent()) {
            Usuario usuario = configuracao.get().getUsuarioOperador();
            if (isUsuarioOperadorValido(usuario)) {
                return Optional.of(new DomicilioOperadorContext(
                        usuario.getCpf(),
                        "OPERADOR_INSTITUCIONAL",
                        usuario
                ));
            }
        }

        String fallback = sanitizeCpf(properties.getOnBehalfOf());
        if (fallback != null) {
            return Optional.of(new DomicilioOperadorContext(
                    fallback,
                    "AMBIENTE",
                    null
            ));
        }

        return Optional.empty();
    }

    public DomicilioOperadorContext resolveRequiredContext() {
        Optional<IntegracaoConfiguracao> configuracao = integracaoConfiguracaoRepository.findByCodigo(CodigoIntegracao.DOMICILIO);
        Usuario usuario = configuracao.map(IntegracaoConfiguracao::getUsuarioOperador).orElse(null);

        if (isUsuarioOperadorValido(usuario)) {
            return new DomicilioOperadorContext(usuario.getCpf(), "OPERADOR_INSTITUCIONAL", usuario);
        }

        String fallback = sanitizeCpf(properties.getOnBehalfOf());
        if (fallback != null) {
            return new DomicilioOperadorContext(fallback, "AMBIENTE", null);
        }

        if (usuario != null) {
            throw new BusinessException(explainInvalidUsuarioOperador(usuario));
        }
        throw new BusinessException("Nenhum CPF operador do Domicilio foi configurado.");
    }

    public boolean hasFallbackOnBehalfOfConfigured() {
        return sanitizeCpf(properties.getOnBehalfOf()) != null;
    }

    public String maskCpf(String cpf) {
        String clean = sanitizeCpf(cpf);
        if (clean == null) {
            return null;
        }
        return clean.substring(0, 3) + ".***.***-" + clean.substring(9);
    }

    public boolean isUsuarioOperadorValido(Usuario usuario) {
        if (usuario == null) {
            return false;
        }
        return Boolean.TRUE.equals(usuario.getAtivo())
                && Boolean.TRUE.equals(usuario.getHabilitadoDomicilio())
                && sanitizeCpf(usuario.getCpf()) != null;
    }

    public String explainInvalidUsuarioOperador(Usuario usuario) {
        if (usuario == null) {
            return "Nenhum usuario operador foi selecionado para o Domicilio.";
        }
        if (!Boolean.TRUE.equals(usuario.getAtivo())) {
            return "O usuario operador do Domicilio esta inativo.";
        }
        if (!Boolean.TRUE.equals(usuario.getHabilitadoDomicilio())) {
            return "O usuario operador selecionado nao esta habilitado para o Domicilio.";
        }

        String cpf = sanitizeCpf(usuario.getCpf());
        if (cpf == null) {
            return "O usuario operador do Domicilio precisa ter CPF valido.";
        }
        return null;
    }

    private String sanitizeCpf(String cpf) {
        if (cpf == null || cpf.isBlank()) {
            return null;
        }

        String clean = cpf.replaceAll("\\D", "");
        return clean.length() == 11 ? clean : null;
    }

    public record DomicilioOperadorContext(String cpf, String origem, Usuario usuario) {
    }
}
