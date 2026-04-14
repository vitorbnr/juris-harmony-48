package com.viana.repository;

import com.viana.model.Pasta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PastaRepository extends JpaRepository<Pasta, UUID> {

    List<Pasta> findByParentIdIsNull();

    List<Pasta> findByParentId(UUID parentId);

    List<Pasta> findByClienteId(UUID clienteId);

    @Query("""
        SELECT p FROM Pasta p
        LEFT JOIN FETCH p.parent
        WHERE p.cliente IS NULL
        AND p.processo IS NULL
        AND (:unidadeId IS NULL OR p.unidade.id = :unidadeId)
    """)
    List<Pasta> findInternalFolders(@Param("unidadeId") UUID unidadeId);

    Optional<Pasta> findByIdAndUnidadeId(UUID id, UUID unidadeId);

    boolean existsByParentIsNullAndClienteIsNullAndProcessoIsNullAndUnidadeIdAndNomeIgnoreCase(UUID unidadeId, String nome);

    boolean existsByParentIdAndClienteIsNullAndProcessoIsNullAndUnidadeIdAndNomeIgnoreCase(UUID parentId, UUID unidadeId, String nome);
}
