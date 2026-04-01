package com.viana.repository;

import com.viana.model.Cliente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, UUID> {

    boolean existsByCpfCnpj(String cpfCnpj);

    /**
     * Lista clientes com filtros opcionais.
     * Usa @EntityGraph para eager-load de relacionamentos sem colidir com a paginação
     * (evita o HHH90003004 do Hibernate que paginava em memória causando lista vazia).
     */
    @EntityGraph(attributePaths = {"unidade", "advogadoResponsavel"})
    @Query("""
        SELECT c FROM Cliente c
        WHERE c.ativo = true
        AND (:unidadeId IS NULL OR c.unidade.id = :unidadeId)
        AND (
            COALESCE(:busca, '') = ''
            OR LOWER(c.nome) LIKE LOWER(CONCAT('%', :busca, '%'))
            OR LOWER(COALESCE(c.email, '')) LIKE LOWER(CONCAT('%', :busca, '%'))
            OR COALESCE(c.cpfCnpj, '') LIKE CONCAT('%', :busca, '%')
        )
    """)
    Page<Cliente> findAllWithFilters(
            @Param("unidadeId") UUID unidadeId,
            @Param("busca") String busca,
            Pageable pageable);


    long countByAtivoTrue();
}
