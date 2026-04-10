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
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PrazoRepository extends JpaRepository<Prazo, UUID> {

    @Query("""
        SELECT p FROM Prazo p
        WHERE p.advogado.id = :advogadoId
        AND p.data BETWEEN :inicio AND :fim
        AND (:unidadeId IS NULL OR p.unidade.id = :unidadeId)
        ORDER BY p.data ASC, p.hora ASC
    """)
    List<Prazo> findCalendario(
            @Param("inicio") LocalDate inicio,
            @Param("fim") LocalDate fim,
            @Param("advogadoId") UUID advogadoId,
            @Param("unidadeId") UUID unidadeId);

    @Query(value = """
        SELECT p FROM Prazo p
        WHERE p.advogado.id = :advogadoId
        AND (:unidadeId IS NULL OR p.unidade.id = :unidadeId)
        AND (:tipo IS NULL OR p.tipo = :tipo)
        AND (:concluido IS NULL OR p.concluido = :concluido)
        ORDER BY p.data ASC
    """, countQuery = """
        SELECT count(p) FROM Prazo p
        WHERE p.advogado.id = :advogadoId
        AND (:unidadeId IS NULL OR p.unidade.id = :unidadeId)
        AND (:tipo IS NULL OR p.tipo = :tipo)
        AND (:concluido IS NULL OR p.concluido = :concluido)
    """)
    Page<Prazo> findAllWithFilters(
            @Param("unidadeId") UUID unidadeId,
            @Param("tipo") com.viana.model.enums.TipoPrazo tipo,
            @Param("concluido") Boolean concluido,
            @Param("advogadoId") UUID advogadoId,
            Pageable pageable);

    List<Prazo> findTop5ByAdvogadoIdAndConcluidoFalseAndDataGreaterThanEqualOrderByDataAsc(UUID advogadoId, LocalDate data);

    long countByAdvogadoIdAndConcluidoFalseAndDataBetween(UUID advogadoId, LocalDate inicio, LocalDate fim);

    Optional<Prazo> findFirstByProcessoIdAndConcluidoFalseOrderByDataAscHoraAsc(UUID processoId);

    boolean existsByEventoJuridicoIdAndTipo(UUID eventoJuridicoId, com.viana.model.enums.TipoPrazo tipo);
}
