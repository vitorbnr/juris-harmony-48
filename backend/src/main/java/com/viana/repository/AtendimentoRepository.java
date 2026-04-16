package com.viana.repository;

import com.viana.model.Atendimento;
import com.viana.model.enums.StatusAtendimento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AtendimentoRepository extends JpaRepository<Atendimento, UUID> {

    @EntityGraph(attributePaths = {"cliente", "usuario", "unidade", "processo"})
    Page<Atendimento> findByClienteId(UUID clienteId, Pageable pageable);

    @EntityGraph(attributePaths = {"cliente", "usuario", "unidade", "processo"})
    Page<Atendimento> findByStatus(StatusAtendimento status, Pageable pageable);

    @EntityGraph(attributePaths = {"cliente", "usuario", "unidade", "processo"})
    Page<Atendimento> findByUnidadeId(UUID unidadeId, Pageable pageable);

    @EntityGraph(attributePaths = {"cliente", "usuario", "unidade", "processo"})
    Optional<Atendimento> findById(UUID id);

    @EntityGraph(attributePaths = {"cliente", "usuario", "unidade", "processo"})
    @Query(
            value = """
                SELECT a
                FROM Atendimento a
                JOIN a.cliente c
                LEFT JOIN a.unidade un
                WHERE (:unidadeId IS NULL OR un.id = :unidadeId)
                  AND (:clienteId IS NULL OR c.id = :clienteId)
                  AND (:filtrarStatus = false OR a.status IN :statuses)
                  AND (
                    '' = :busca
                    OR LOWER(a.assunto) LIKE LOWER(CONCAT('%', :busca, '%'))
                    OR LOWER(COALESCE(a.descricao, '')) LIKE LOWER(CONCAT('%', :busca, '%'))
                    OR LOWER(c.nome) LIKE LOWER(CONCAT('%', :busca, '%'))
                  )
                """,
            countQuery = """
                SELECT COUNT(a)
                FROM Atendimento a
                JOIN a.cliente c
                LEFT JOIN a.unidade un
                WHERE (:unidadeId IS NULL OR un.id = :unidadeId)
                  AND (:clienteId IS NULL OR c.id = :clienteId)
                  AND (:filtrarStatus = false OR a.status IN :statuses)
                  AND (
                    '' = :busca
                    OR LOWER(a.assunto) LIKE LOWER(CONCAT('%', :busca, '%'))
                    OR LOWER(COALESCE(a.descricao, '')) LIKE LOWER(CONCAT('%', :busca, '%'))
                    OR LOWER(c.nome) LIKE LOWER(CONCAT('%', :busca, '%'))
                  )
                """
    )
    Page<Atendimento> findAllWithFilters(
            @Param("unidadeId") UUID unidadeId,
            @Param("clienteId") UUID clienteId,
            @Param("statuses") List<StatusAtendimento> statuses,
            @Param("filtrarStatus") boolean filtrarStatus,
            @Param("busca") String busca,
            Pageable pageable
    );
}
