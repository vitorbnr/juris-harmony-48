package com.viana.repository;

import com.viana.model.Publicacao;
import com.viana.model.enums.StatusFluxoPublicacao;
import com.viana.model.enums.StatusTratamento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PublicacaoRepository extends JpaRepository<Publicacao, UUID> {

    List<Publicacao> findByStatusTratamentoOrderByDataPublicacaoDesc(StatusTratamento status);

    Optional<Publicacao> findByHashDeduplicacao(String hashDeduplicacao);

    boolean existsByHashDeduplicacao(String hashDeduplicacao);

    @Query("""
        SELECT p
        FROM Publicacao p
        LEFT JOIN p.processo proc
        LEFT JOIN p.atribuidaPara atribuida
        LEFT JOIN p.assumidaPor assumida
        LEFT JOIN p.responsavelProcesso responsavel
        WHERE (:status IS NULL OR p.statusTratamento = :status)
          AND (:somenteRiscoPrazo IS NULL OR p.riscoPrazo = :somenteRiscoPrazo)
          AND (:statusFluxo IS NULL OR p.statusFluxo = :statusFluxo)
          AND (:dataInicio IS NULL OR p.dataPublicacao >= :dataInicio)
          AND (:dataFim IS NULL OR p.dataPublicacao < :dataFim)
          AND (
              :usuarioResponsavelId IS NULL
              OR atribuida.id = :usuarioResponsavelId
              OR assumida.id = :usuarioResponsavelId
              OR responsavel.id = :usuarioResponsavelId
          )
          AND (
              :busca IS NULL
              OR UPPER(COALESCE(p.npu, '')) LIKE UPPER(CONCAT('%', :busca, '%'))
              OR UPPER(COALESCE(p.tribunalOrigem, '')) LIKE UPPER(CONCAT('%', :busca, '%'))
              OR UPPER(COALESCE(p.teor, '')) LIKE UPPER(CONCAT('%', :busca, '%'))
              OR UPPER(COALESCE(proc.numero, '')) LIKE UPPER(CONCAT('%', :busca, '%'))
          )
        ORDER BY p.scorePrioridade DESC, p.dataPublicacao DESC
    """)
    List<Publicacao> buscarParaTriagem(
            @Param("status") StatusTratamento status,
            @Param("busca") String busca,
            @Param("somenteRiscoPrazo") Boolean somenteRiscoPrazo,
            @Param("statusFluxo") StatusFluxoPublicacao statusFluxo,
            @Param("dataInicio") LocalDateTime dataInicio,
            @Param("dataFim") LocalDateTime dataFim,
            @Param("usuarioResponsavelId") UUID usuarioResponsavelId
    );

    @Query(value = """
        SELECT p
        FROM Publicacao p
        LEFT JOIN p.processo proc
        LEFT JOIN p.atribuidaPara atribuida
        LEFT JOIN p.assumidaPor assumida
        LEFT JOIN p.responsavelProcesso responsavel
        WHERE (:status IS NULL OR p.statusTratamento = :status)
          AND (:somenteRiscoPrazo IS NULL OR p.riscoPrazo = :somenteRiscoPrazo)
          AND (:statusFluxo IS NULL OR p.statusFluxo = :statusFluxo)
          AND (:dataInicio IS NULL OR p.dataPublicacao >= :dataInicio)
          AND (:dataFim IS NULL OR p.dataPublicacao < :dataFim)
          AND (
              :usuarioResponsavelId IS NULL
              OR atribuida.id = :usuarioResponsavelId
              OR assumida.id = :usuarioResponsavelId
              OR responsavel.id = :usuarioResponsavelId
          )
          AND (
              :busca IS NULL
              OR UPPER(COALESCE(p.npu, '')) LIKE UPPER(CONCAT('%', :busca, '%'))
              OR UPPER(COALESCE(p.tribunalOrigem, '')) LIKE UPPER(CONCAT('%', :busca, '%'))
              OR UPPER(COALESCE(p.teor, '')) LIKE UPPER(CONCAT('%', :busca, '%'))
              OR UPPER(COALESCE(proc.numero, '')) LIKE UPPER(CONCAT('%', :busca, '%'))
          )
        ORDER BY p.scorePrioridade DESC, p.dataPublicacao DESC
    """, countQuery = """
        SELECT COUNT(p)
        FROM Publicacao p
        LEFT JOIN p.processo proc
        LEFT JOIN p.atribuidaPara atribuida
        LEFT JOIN p.assumidaPor assumida
        LEFT JOIN p.responsavelProcesso responsavel
        WHERE (:status IS NULL OR p.statusTratamento = :status)
          AND (:somenteRiscoPrazo IS NULL OR p.riscoPrazo = :somenteRiscoPrazo)
          AND (:statusFluxo IS NULL OR p.statusFluxo = :statusFluxo)
          AND (:dataInicio IS NULL OR p.dataPublicacao >= :dataInicio)
          AND (:dataFim IS NULL OR p.dataPublicacao < :dataFim)
          AND (
              :usuarioResponsavelId IS NULL
              OR atribuida.id = :usuarioResponsavelId
              OR assumida.id = :usuarioResponsavelId
              OR responsavel.id = :usuarioResponsavelId
          )
          AND (
              :busca IS NULL
              OR UPPER(COALESCE(p.npu, '')) LIKE UPPER(CONCAT('%', :busca, '%'))
              OR UPPER(COALESCE(p.tribunalOrigem, '')) LIKE UPPER(CONCAT('%', :busca, '%'))
              OR UPPER(COALESCE(p.teor, '')) LIKE UPPER(CONCAT('%', :busca, '%'))
              OR UPPER(COALESCE(proc.numero, '')) LIKE UPPER(CONCAT('%', :busca, '%'))
          )
    """)
    Page<Publicacao> buscarParaTriagemPaginada(
            @Param("status") StatusTratamento status,
            @Param("busca") String busca,
            @Param("somenteRiscoPrazo") Boolean somenteRiscoPrazo,
            @Param("statusFluxo") StatusFluxoPublicacao statusFluxo,
            @Param("dataInicio") LocalDateTime dataInicio,
            @Param("dataFim") LocalDateTime dataFim,
            @Param("usuarioResponsavelId") UUID usuarioResponsavelId,
            Pageable pageable
    );

    long countByStatusTratamento(StatusTratamento status);

    long countByStatusTratamentoAndDataPublicacaoBetween(
            StatusTratamento status,
            LocalDateTime inicio,
            LocalDateTime fim
    );

    long countByRiscoPrazoTrueAndStatusTratamento(StatusTratamento status);

    long countByProcessoIsNullAndStatusTratamento(StatusTratamento status);

    long countByStatusFluxoAndStatusTratamento(StatusFluxoPublicacao statusFluxo, StatusTratamento status);
}
