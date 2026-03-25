package com.viana.repository;

import com.viana.model.Prazo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface PrazoRepository extends JpaRepository<Prazo, UUID> {

    // Calendário do advogado (só vê o próprio)
    List<Prazo> findByAdvogadoIdAndDataBetween(UUID advogadoId, LocalDate inicio, LocalDate fim);

    // Calendário do admin/secretária (vê todos, opcionalmente filtrado por advogado)
    @Query("""
        SELECT p FROM Prazo p
        WHERE p.data BETWEEN :inicio AND :fim
        AND (:advogadoId IS NULL OR p.advogado.id = :advogadoId)
        AND (:unidadeId IS NULL OR p.unidade.id = :unidadeId)
        ORDER BY p.data ASC, p.hora ASC
    """)
    List<Prazo> findCalendario(
            @Param("inicio") LocalDate inicio,
            @Param("fim") LocalDate fim,
            @Param("advogadoId") UUID advogadoId,
            @Param("unidadeId") UUID unidadeId);

    // Lista com filtros
    @Query("""
        SELECT p FROM Prazo p
        WHERE (:unidadeId IS NULL OR p.unidade.id = :unidadeId)
        AND (:tipo IS NULL OR p.tipo = :tipo)
        AND (:concluido IS NULL OR p.concluido = :concluido)
        AND (:advogadoId IS NULL OR p.advogado.id = :advogadoId)
        ORDER BY p.data ASC
    """)
    Page<Prazo> findAllWithFilters(
            @Param("unidadeId") UUID unidadeId,
            @Param("tipo") com.viana.model.enums.TipoPrazo tipo,
            @Param("concluido") Boolean concluido,
            @Param("advogadoId") UUID advogadoId,
            Pageable pageable);

    // Próximos prazos não concluídos (dashboard)
    List<Prazo> findTop5ByConcluidoFalseAndDataGreaterThanEqualOrderByDataAsc(LocalDate data);

    // Contagem de prazos da semana
    long countByConcluidoFalseAndDataBetween(LocalDate inicio, LocalDate fim);
}
