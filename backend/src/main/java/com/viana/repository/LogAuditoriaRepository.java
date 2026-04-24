package com.viana.repository;

import com.viana.model.LogAuditoria;
import com.viana.model.enums.ModuloLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LogAuditoriaRepository extends JpaRepository<LogAuditoria, UUID> {

    Page<LogAuditoria> findAllByOrderByDataHoraDesc(Pageable pageable);
    Page<LogAuditoria> findByModuloOrderByDataHoraDesc(ModuloLog modulo, Pageable pageable);
    Page<LogAuditoria> findByModuloAndUsuarioUnidadeIdOrderByDataHoraDesc(ModuloLog modulo, UUID unidadeId, Pageable pageable);

    Page<LogAuditoria> findByUsuarioIdOrderByDataHoraDesc(UUID usuarioId, Pageable pageable);

    List<LogAuditoria> findByReferenciaTipoAndReferenciaIdOrderByDataHoraDesc(String referenciaTipo, UUID referenciaId);
    Page<LogAuditoria> findByReferenciaTipoAndReferenciaIdOrderByDataHoraDesc(String referenciaTipo, UUID referenciaId, Pageable pageable);
}
