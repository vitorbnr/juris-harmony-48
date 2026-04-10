package com.viana.repository;

import com.viana.model.FonteSync;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.TipoReferenciaIntegracao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FonteSyncRepository extends JpaRepository<FonteSync, UUID> {

    Optional<FonteSync> findByFonteAndReferenciaTipoAndReferenciaId(
            FonteIntegracao fonte,
            TipoReferenciaIntegracao referenciaTipo,
            UUID referenciaId
    );

    Optional<FonteSync> findFirstByFonteAndReferenciaTipoOrderByAtualizadoEmDesc(
            FonteIntegracao fonte,
            TipoReferenciaIntegracao referenciaTipo
    );
}
