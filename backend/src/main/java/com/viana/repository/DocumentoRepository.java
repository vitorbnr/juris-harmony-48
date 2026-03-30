package com.viana.repository;

import com.viana.model.Documento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentoRepository extends JpaRepository<Documento, UUID> {

    Page<Documento> findByPastaId(UUID pastaId, Pageable pageable);
    Page<Documento> findByClienteId(UUID clienteId, Pageable pageable);
    Page<Documento> findByProcessoId(UUID processoId, Pageable pageable);
    List<Documento> findByPastaIdIsNull();

    @Query("""
        SELECT d FROM Documento d
        LEFT JOIN FETCH d.cliente
        LEFT JOIN FETCH d.processo
        LEFT JOIN FETCH d.uploadedPor
        WHERE (:clienteId IS NULL OR d.cliente.id = :clienteId)
        AND (:processoId IS NULL OR d.processo.id = :processoId)
        AND (:busca IS NULL OR :busca = ''
             OR LOWER(d.nome) LIKE LOWER(CONCAT('%', :busca, '%')))
        ORDER BY d.dataUpload DESC
    """)
    Page<Documento> findAllWithFilters(
            @Param("clienteId") UUID clienteId,
            @Param("processoId") UUID processoId,
            @Param("busca") String busca,
            Pageable pageable);
}
