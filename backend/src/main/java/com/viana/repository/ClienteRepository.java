package com.viana.repository;

import com.viana.model.Cliente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, UUID> {

    boolean existsByCpfCnpj(String cpfCnpj);

    @Query("""
        SELECT c FROM Cliente c
        WHERE c.ativo = true
        AND (:unidadeId IS NULL OR c.unidade.id = :unidadeId)
        AND (:busca IS NULL OR LOWER(c.nome) LIKE LOWER(CONCAT('%', :busca, '%'))
             OR LOWER(c.email) LIKE LOWER(CONCAT('%', :busca, '%'))
             OR c.cpfCnpj LIKE CONCAT('%', :busca, '%'))
    """)
    Page<Cliente> findAllWithFilters(
            @Param("unidadeId") UUID unidadeId,
            @Param("busca") String busca,
            Pageable pageable);

    long countByAtivoTrue();
}
