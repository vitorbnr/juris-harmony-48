package com.viana.repository;

import com.viana.model.LogAuditoria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LogAuditoriaRepository extends JpaRepository<LogAuditoria, UUID> {

    Page<LogAuditoria> findAllByOrderByDataHoraDesc(Pageable pageable);

    Page<LogAuditoria> findByUsuarioIdOrderByDataHoraDesc(UUID usuarioId, Pageable pageable);
}
