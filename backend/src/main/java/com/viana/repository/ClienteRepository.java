package com.viana.repository;

import com.viana.model.Cliente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, UUID> {

    boolean existsByCpfCnpj(String cpfCnpj);

    /**
     * Lista clientes com filtros opcionais.
     * Usa '' = :busca em vez de :busca IS NULL para forçar o Hibernate 6 a tipar
     * o parâmetro como String (evita SemanticException com LIKE predicates).
     */
    @Query("""
        SELECT c FROM Cliente c
        LEFT JOIN FETCH c.unidade
        LEFT JOIN FETCH c.advogadoResponsavel
        WHERE c.ativo = true
        AND (:unidadeId IS NULL OR c.unidade.id = :unidadeId)
        AND (
            '' = :busca
            OR LOWER(c.nome) LIKE LOWER(CONCAT('%', :busca, '%'))
            OR LOWER(COALESCE(c.email, '')) LIKE LOWER(CONCAT('%', :busca, '%'))
            OR COALESCE(c.cpfCnpj, '') LIKE CONCAT('%', :busca, '%')
        )
    """)
    Page<Cliente> findAllWithFilters(
            @Param("unidadeId") UUID unidadeId,
            @Param("busca") String busca,
            Pageable pageable);

    @Query("""
        SELECT c FROM Cliente c
        LEFT JOIN FETCH c.unidade
        WHERE c.ativo = true
        AND (:unidadeId IS NULL OR c.unidade.id = :unidadeId)
        ORDER BY
            CASE WHEN c.estado IS NULL OR TRIM(c.estado) = '' THEN 1 ELSE 0 END,
            LOWER(COALESCE(c.estado, '')),
            CASE WHEN c.cidade IS NULL OR TRIM(c.cidade) = '' THEN 1 ELSE 0 END,
            LOWER(COALESCE(c.cidade, '')),
            LOWER(c.nome)
    """)
    List<Cliente> findAtivosParaAcervo(@Param("unidadeId") UUID unidadeId);


    long countByAtivoTrue();
}
