package com.viana.repository;

import com.viana.model.Caso;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CasoRepository extends JpaRepository<Caso, UUID> {

    @EntityGraph(attributePaths = {"cliente", "unidade", "responsavel"})
    @Query("""
        SELECT c
        FROM Caso c
        JOIN c.cliente cliente
        JOIN c.unidade unidade
        JOIN c.responsavel responsavel
        WHERE (:unidadeId IS NULL OR unidade.id = :unidadeId)
          AND (:clienteId IS NULL OR cliente.id = :clienteId)
          AND (:responsavelId IS NULL OR responsavel.id = :responsavelId)
          AND (
              '' = :busca
              OR LOWER(c.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))
              OR LOWER(COALESCE(c.descricao, '')) LIKE LOWER(CONCAT('%', :busca, '%'))
              OR LOWER(cliente.nome) LIKE LOWER(CONCAT('%', :busca, '%'))
          )
        """)
    Page<Caso> findAllWithFilters(
            @Param("unidadeId") UUID unidadeId,
            @Param("clienteId") UUID clienteId,
            @Param("responsavelId") UUID responsavelId,
            @Param("busca") String busca,
            Pageable pageable
    );

    @Query("""
        SELECT DISTINCT c
        FROM Caso c
        LEFT JOIN FETCH c.cliente
        LEFT JOIN FETCH c.unidade
        LEFT JOIN FETCH c.responsavel
        LEFT JOIN FETCH c.envolvidos
        WHERE c.id = :id
        """)
    Optional<Caso> findDetalheById(@Param("id") UUID id);
}
