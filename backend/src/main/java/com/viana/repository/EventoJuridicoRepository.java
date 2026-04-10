package com.viana.repository;

import com.viana.model.EventoJuridico;
import com.viana.model.enums.FonteIntegracao;
import com.viana.model.enums.StatusEventoJuridico;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EventoJuridicoRepository extends JpaRepository<EventoJuridico, UUID> {

    boolean existsByHashDeduplicacao(String hashDeduplicacao);

    @Query("""
        SELECT e FROM EventoJuridico e
        LEFT JOIN FETCH e.processo p
        LEFT JOIN FETCH p.cliente
        LEFT JOIN FETCH e.responsavel r
        WHERE (:status IS NULL OR e.status = :status)
        AND (:fonte IS NULL OR e.fonte = :fonte)
        AND (:processoId IS NULL OR p.id = :processoId)
        AND (:responsavelId IS NULL OR r.id = :responsavelId)
        ORDER BY COALESCE(e.dataEvento, e.criadoEm) DESC, e.criadoEm DESC
    """)
    Page<EventoJuridico> findAllWithFilters(
            @Param("status") StatusEventoJuridico status,
            @Param("fonte") FonteIntegracao fonte,
            @Param("processoId") UUID processoId,
            @Param("responsavelId") UUID responsavelId,
            Pageable pageable
    );

    List<EventoJuridico> findTop5ByOrderByCriadoEmDesc();
}
