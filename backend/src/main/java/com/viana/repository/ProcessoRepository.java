package com.viana.repository;

import com.viana.model.Processo;
import com.viana.model.enums.StatusProcesso;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProcessoRepository extends JpaRepository<Processo, UUID> {

    long countByClienteId(UUID clienteId);

    long countByStatusIn(List<StatusProcesso> statuses);

    /**
     * Lista com filtros + paginação.
     * NOTA: countQuery separada para evitar MultipleBagFetchException com LEFT JOIN FETCH.
     */
    @Query(value = """
        SELECT p FROM Processo p
        LEFT JOIN FETCH p.cliente
        LEFT JOIN FETCH p.advogado
        LEFT JOIN FETCH p.unidade
        WHERE (:unidadeId IS NULL OR p.unidade.id = :unidadeId)
        AND (:status IS NULL OR p.status = :status)
        AND (:tipo IS NULL OR p.tipo = :tipo)
        AND (:busca IS NULL OR :busca = '' OR LOWER(p.numero) LIKE LOWER(CONCAT('%', :busca, '%'))
             OR LOWER(p.cliente.nome) LIKE LOWER(CONCAT('%', :busca, '%')))
    """, countQuery = """
        SELECT count(p) FROM Processo p
        WHERE (:unidadeId IS NULL OR p.unidade.id = :unidadeId)
        AND (:status IS NULL OR p.status = :status)
        AND (:tipo IS NULL OR p.tipo = :tipo)
        AND (:busca IS NULL OR :busca = '' OR LOWER(p.numero) LIKE LOWER(CONCAT('%', :busca, '%'))
             OR LOWER(p.cliente.nome) LIKE LOWER(CONCAT('%', :busca, '%')))
    """)
    Page<Processo> findAllWithFilters(
            @Param("unidadeId") UUID unidadeId,
            @Param("status") StatusProcesso status,
            @Param("tipo") com.viana.model.enums.TipoProcesso tipo,
            @Param("busca") String busca,
            Pageable pageable);

    long countByAdvogadoId(UUID advogadoId);

    /**
     * Últimos 5 processos cadastrados para o dashboard.
     */
    @Query("""
        SELECT p FROM Processo p
        LEFT JOIN FETCH p.cliente
        LEFT JOIN FETCH p.advogado
        LEFT JOIN FETCH p.unidade
        ORDER BY p.criadoEm DESC
    """)
    List<Processo> findTop5ByOrderByCriadoEmDesc(Pageable pageable);

    default List<Processo> findTop5ByOrderByCriadoEmDesc() {
        return findTop5ByOrderByCriadoEmDesc(org.springframework.data.domain.PageRequest.of(0, 5));
    }
}
