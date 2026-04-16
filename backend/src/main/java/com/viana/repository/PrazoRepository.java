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
        SELECT DISTINCT p FROM Prazo p
        LEFT JOIN p.participantes participante
        WHERE (p.advogado.id = :usuarioEscopoId OR participante.id = :usuarioEscopoId)
        AND p.data BETWEEN :inicio AND :fim
        AND (:unidadeId IS NULL OR p.unidade.id = :unidadeId)
        AND (:responsavelId IS NULL OR p.advogado.id = :responsavelId)
        ORDER BY p.data ASC, p.hora ASC
    """)
    List<Prazo> findCalendario(
            @Param("inicio") LocalDate inicio,
            @Param("fim") LocalDate fim,
            @Param("usuarioEscopoId") UUID usuarioEscopoId,
            @Param("unidadeId") UUID unidadeId,
            @Param("responsavelId") UUID responsavelId);

    @Query(value = """
        SELECT DISTINCT p FROM Prazo p
        LEFT JOIN p.participantes participante
        WHERE (p.advogado.id = :usuarioEscopoId OR participante.id = :usuarioEscopoId)
        AND (:unidadeId IS NULL OR p.unidade.id = :unidadeId)
        AND (:responsavelId IS NULL OR p.advogado.id = :responsavelId)
        AND (:tipo IS NULL OR p.tipo = :tipo)
        AND (:concluido IS NULL OR p.concluido = :concluido)
        ORDER BY p.data ASC
    """, countQuery = """
        SELECT count(DISTINCT p) FROM Prazo p
        LEFT JOIN p.participantes participante
        WHERE (p.advogado.id = :usuarioEscopoId OR participante.id = :usuarioEscopoId)
        AND (:unidadeId IS NULL OR p.unidade.id = :unidadeId)
        AND (:responsavelId IS NULL OR p.advogado.id = :responsavelId)
        AND (:tipo IS NULL OR p.tipo = :tipo)
        AND (:concluido IS NULL OR p.concluido = :concluido)
    """)
    Page<Prazo> findAllWithFilters(
            @Param("unidadeId") UUID unidadeId,
            @Param("tipo") com.viana.model.enums.TipoPrazo tipo,
            @Param("concluido") Boolean concluido,
            @Param("usuarioEscopoId") UUID usuarioEscopoId,
            @Param("responsavelId") UUID responsavelId,
            Pageable pageable);

    List<Prazo> findTop5ByAdvogadoIdAndConcluidoFalseAndDataGreaterThanEqualOrderByDataAsc(UUID advogadoId, LocalDate data);

    long countByAdvogadoIdAndConcluidoFalseAndDataBetween(UUID advogadoId, LocalDate inicio, LocalDate fim);

    long countByAdvogadoIdAndConcluidoFalseAndDataLessThan(UUID advogadoId, LocalDate data);

    long countByAdvogadoIdAndConcluidoFalseAndData(UUID advogadoId, LocalDate data);

    long countByAdvogadoIdAndTipoAndConcluidoFalse(UUID advogadoId, com.viana.model.enums.TipoPrazo tipo);

    Optional<Prazo> findFirstByProcessoIdAndConcluidoFalseOrderByDataAscHoraAsc(UUID processoId);

    boolean existsByEventoJuridicoIdAndTipo(UUID eventoJuridicoId, com.viana.model.enums.TipoPrazo tipo);

    @Query("""
        SELECT DISTINCT p FROM Prazo p
        LEFT JOIN FETCH p.participantes
        WHERE p.concluido = false
          AND p.advogado IS NOT NULL
          AND p.data <= :data
    """)
    List<Prazo> findAlertaveis(@Param("data") LocalDate data);
}
