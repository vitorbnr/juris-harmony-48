package com.viana.repository;

import com.viana.model.enums.StatusProcesso;
import com.viana.model.Movimentacao;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MovimentacaoRepository extends JpaRepository<Movimentacao, UUID> {

    @Query(value = """
            SELECT *
            FROM movimentacoes
            WHERE processo_id = :processoId
            ORDER BY COALESCE(data_hora_original, data::timestamp) DESC, id DESC
            """, nativeQuery = true)
    List<Movimentacao> findTimelineByProcessoId(@Param("processoId") UUID processoId);

    @Query("select m.chaveExterna from Movimentacao m where m.processo.id = :processoId and m.chaveExterna is not null")
    List<String> findChavesExternasByProcessoId(@Param("processoId") UUID processoId);

    long countByProcessoId(UUID processoId);

    @EntityGraph(attributePaths = {"processo", "processo.cliente"})
    @Query("""
        SELECT m
        FROM Movimentacao m
        JOIN m.processo p
        WHERE p.status IN :statuses
          AND NOT (
              UPPER(p.numero) LIKE 'ATD-%'
              AND p.status = com.viana.model.enums.StatusProcesso.AGUARDANDO
              AND p.dataDistribuicao IS NULL
          )
        ORDER BY m.data DESC, m.dataHoraOriginal DESC, m.id DESC
    """)
    List<Movimentacao> findRecentesDashboard(
            @Param("statuses") List<StatusProcesso> statuses,
            Pageable pageable
    );
}
