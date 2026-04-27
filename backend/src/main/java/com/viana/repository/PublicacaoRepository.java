package com.viana.repository;

import com.viana.model.Publicacao;
import com.viana.model.enums.StatusTratamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PublicacaoRepository extends JpaRepository<Publicacao, UUID> {

    List<Publicacao> findByStatusTratamentoOrderByDataPublicacaoDesc(StatusTratamento status);

    @Query("""
        SELECT p
        FROM Publicacao p
        LEFT JOIN p.processo proc
        WHERE (:status IS NULL OR p.statusTratamento = :status)
          AND (:somenteRiscoPrazo IS NULL OR p.riscoPrazo = :somenteRiscoPrazo)
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
            @Param("somenteRiscoPrazo") Boolean somenteRiscoPrazo
    );

    long countByStatusTratamento(StatusTratamento status);

    long countByStatusTratamentoAndDataPublicacaoBetween(
            StatusTratamento status,
            LocalDateTime inicio,
            LocalDateTime fim
    );

    long countByRiscoPrazoTrueAndStatusTratamento(StatusTratamento status);

    long countByProcessoIsNullAndStatusTratamento(StatusTratamento status);
}
