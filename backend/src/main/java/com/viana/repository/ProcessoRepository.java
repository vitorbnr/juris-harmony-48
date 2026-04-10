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
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProcessoRepository extends JpaRepository<Processo, UUID> {

    boolean existsByNumero(String numero);

    Optional<Processo> findByNumero(String numero);

    long countByClienteId(UUID clienteId);

    long countByStatusIn(List<StatusProcesso> statuses);

    @Query("SELECT p.id FROM Processo p WHERE p.status IN :statuses")
    List<UUID> findIdsByStatusIn(@Param("statuses") List<StatusProcesso> statuses);

    /**
     * Lista processos com filtros + paginação.
     * Usa native query (nativeQuery=true) para evitar o SemanticException do Hibernate 6,
     * que infere parâmetros usados em IS NULL + LIKE como java.lang.Object.
     * O countQuery separado é obrigatório para paginação funcionar.
     */
    @Query(value = """
        SELECT p.* FROM processos p
        JOIN clientes c ON p.cliente_id = c.id
        WHERE (:unidadeId IS NULL OR p.unidade_id = CAST(:unidadeId AS uuid))
        AND (:status IS NULL OR p.status = :status)
        AND (:tipo IS NULL OR p.tipo = :tipo)
        AND (:etiqueta IS NULL OR EXISTS (
            SELECT 1 FROM processo_etiquetas pe
            WHERE pe.processo_id = p.id AND pe.nome_normalizado = :etiqueta
        ))
        AND (
            :busca = ''
            OR LOWER(p.numero) LIKE LOWER(CONCAT('%', :busca, '%'))
            OR (:buscaNumero <> '' AND
                REPLACE(REPLACE(REPLACE(REPLACE(LOWER(p.numero), '.', ''), '-', ''), '/', ''), ' ', '')
                LIKE CONCAT('%', :buscaNumero, '%'))
            OR LOWER(c.nome) LIKE LOWER(CONCAT('%', :busca, '%'))
        )
        GROUP BY p.id
        """, countQuery = """
        SELECT COUNT(DISTINCT p.id) FROM processos p
        JOIN clientes c ON p.cliente_id = c.id
        WHERE (:unidadeId IS NULL OR p.unidade_id = CAST(:unidadeId AS uuid))
        AND (:status IS NULL OR p.status = :status)
        AND (:tipo IS NULL OR p.tipo = :tipo)
        AND (:etiqueta IS NULL OR EXISTS (
            SELECT 1 FROM processo_etiquetas pe
            WHERE pe.processo_id = p.id AND pe.nome_normalizado = :etiqueta
        ))
        AND (
            :busca = ''
            OR LOWER(p.numero) LIKE LOWER(CONCAT('%', :busca, '%'))
            OR (:buscaNumero <> '' AND
                REPLACE(REPLACE(REPLACE(REPLACE(LOWER(p.numero), '.', ''), '-', ''), '/', ''), ' ', '')
                LIKE CONCAT('%', :buscaNumero, '%'))
            OR LOWER(c.nome) LIKE LOWER(CONCAT('%', :busca, '%'))
        )
        """, nativeQuery = true)
    Page<Processo> findAllWithFilters(
            @Param("unidadeId") UUID unidadeId,
            @Param("status") String status,
            @Param("tipo") String tipo,
            @Param("etiqueta") String etiqueta,
            @Param("busca") String busca,
            @Param("buscaNumero") String buscaNumero,
            Pageable pageable);


    /**
     * Conta processos em que o usuário é um dos advogados responsáveis.
     */
    @Query("SELECT count(p) FROM Processo p JOIN p.advogados a WHERE a.id = :advogadoId")
    long countByAdvogadoId(@Param("advogadoId") UUID advogadoId);

    /**
     * Últimos 5 processos cadastrados para o dashboard.
     */
    @Query("""
        SELECT DISTINCT p FROM Processo p
        LEFT JOIN FETCH p.cliente
        LEFT JOIN FETCH p.unidade
        ORDER BY p.criadoEm DESC
    """)
    List<Processo> findTop5ByOrderByCriadoEmDesc(Pageable pageable);

    default List<Processo> findTop5ByOrderByCriadoEmDesc() {
        return findTop5ByOrderByCriadoEmDesc(org.springframework.data.domain.PageRequest.of(0, 5));
    }
}
