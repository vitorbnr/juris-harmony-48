package com.viana.repository;

import com.viana.model.IntegracaoConfiguracao;
import com.viana.model.enums.CodigoIntegracao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface IntegracaoConfiguracaoRepository extends JpaRepository<IntegracaoConfiguracao, UUID> {

    Optional<IntegracaoConfiguracao> findByCodigo(CodigoIntegracao codigo);
}
