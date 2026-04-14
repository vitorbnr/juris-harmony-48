package com.viana.repository;

import com.viana.model.Documento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentoRepository extends JpaRepository<Documento, UUID> {

    Page<Documento> findByPastaId(UUID pastaId, Pageable pageable);
    Page<Documento> findByClienteId(UUID clienteId, Pageable pageable);
    Page<Documento> findByProcessoId(UUID processoId, Pageable pageable);
    List<Documento> findByPastaIdIsNull();
    Optional<Documento> findByStorageKey(String storageKey);

    @Query("""
        SELECT d FROM Documento d
        LEFT JOIN FETCH d.cliente
        LEFT JOIN FETCH d.processo
        LEFT JOIN FETCH d.uploadedPor
        WHERE (:clienteId IS NULL OR d.cliente.id = :clienteId)
        AND (:processoId IS NULL OR d.processo.id = :processoId)
        AND (:unidadeId IS NULL
             OR (d.processo IS NOT NULL AND d.processo.unidade.id = :unidadeId)
             OR (d.processo IS NULL AND d.cliente IS NOT NULL AND d.cliente.unidade.id = :unidadeId)
             OR (d.processo IS NULL AND d.cliente IS NULL AND d.pasta IS NOT NULL AND d.pasta.unidade.id = :unidadeId)
             OR (d.processo IS NULL AND d.cliente IS NULL AND d.uploadedPor.unidade.id = :unidadeId))
        AND (:busca IS NULL OR :busca = ''
             OR LOWER(d.nome) LIKE LOWER(CONCAT('%', :busca, '%')))
        ORDER BY d.dataUpload DESC
    """)
    Page<Documento> findAllWithFilters(
            @Param("clienteId") UUID clienteId,
            @Param("processoId") UUID processoId,
            @Param("unidadeId") UUID unidadeId,
            @Param("busca") String busca,
            Pageable pageable);

    @Query("""
        SELECT d FROM Documento d
        LEFT JOIN FETCH d.cliente
        LEFT JOIN FETCH d.processo
        LEFT JOIN FETCH d.uploadedPor
        WHERE d.cliente.id = :clienteId
        AND (:unidadeId IS NULL OR d.cliente.unidade.id = :unidadeId)
        ORDER BY d.dataUpload DESC
    """)
    Page<Documento> findByClienteIdWithScope(
            @Param("clienteId") UUID clienteId,
            @Param("unidadeId") UUID unidadeId,
            Pageable pageable);

    @Query("""
        SELECT d FROM Documento d
        LEFT JOIN FETCH d.cliente
        LEFT JOIN FETCH d.processo
        LEFT JOIN FETCH d.uploadedPor
        WHERE d.processo.id = :processoId
        AND (:unidadeId IS NULL OR d.processo.unidade.id = :unidadeId)
        ORDER BY d.dataUpload DESC
    """)
    Page<Documento> findByProcessoIdWithScope(
            @Param("processoId") UUID processoId,
            @Param("unidadeId") UUID unidadeId,
            Pageable pageable);

    @Query("""
        SELECT d FROM Documento d
        LEFT JOIN FETCH d.cliente
        LEFT JOIN FETCH d.processo
        LEFT JOIN FETCH d.uploadedPor
        LEFT JOIN d.pasta p
        WHERE p.id = :pastaId
        AND (:unidadeId IS NULL
             OR (p.processo IS NOT NULL AND p.processo.unidade.id = :unidadeId)
             OR (p.processo IS NULL AND p.cliente IS NOT NULL AND p.cliente.unidade.id = :unidadeId)
             OR (p.processo IS NULL AND p.cliente IS NULL AND p.unidade.id = :unidadeId)
             OR (p.processo IS NULL AND p.cliente IS NULL AND d.uploadedPor.unidade.id = :unidadeId))
        ORDER BY d.dataUpload DESC
    """)
    Page<Documento> findByPastaIdWithScope(
            @Param("pastaId") UUID pastaId,
            @Param("unidadeId") UUID unidadeId,
            Pageable pageable);

    @Query("""
        SELECT DISTINCT new map(
            CAST(d.cliente.id AS string) as id,
            d.cliente.nome as nome
        )
        FROM Documento d
        WHERE d.cliente IS NOT NULL
        AND (:unidadeId IS NULL OR d.cliente.unidade.id = :unidadeId)
        ORDER BY d.cliente.nome ASC
    """)
    List<Map<String, String>> findDistinctClientes(@Param("unidadeId") UUID unidadeId);
}
