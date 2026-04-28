package com.viana.repository;

import com.viana.model.PublicacaoFonteMonitorada;
import com.viana.model.enums.TipoFontePublicacaoMonitorada;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PublicacaoFonteMonitoradaRepository extends JpaRepository<PublicacaoFonteMonitorada, UUID> {

    @EntityGraph(attributePaths = {"destinatarios", "diariosMonitorados"})
    List<PublicacaoFonteMonitorada> findAllByOrderByNomeExibicaoAsc();

    @EntityGraph(attributePaths = {"destinatarios", "diariosMonitorados"})
    List<PublicacaoFonteMonitorada> findByAtivoTrueOrderByNomeExibicaoAsc();

    long countByAtivoTrue();

    @Query("""
        SELECT COUNT(f) > 0
        FROM PublicacaoFonteMonitorada f
        WHERE f.tipo = :tipo
          AND f.ativo = true
          AND UPPER(f.valorMonitorado) = UPPER(:valor)
          AND COALESCE(UPPER(f.uf), '') = COALESCE(UPPER(:uf), '')
    """)
    boolean existsAtiva(
            @Param("tipo") TipoFontePublicacaoMonitorada tipo,
            @Param("valor") String valor,
            @Param("uf") String uf
    );

    @Query("""
        SELECT COUNT(f) > 0
        FROM PublicacaoFonteMonitorada f
        WHERE f.id <> :id
          AND f.tipo = :tipo
          AND f.ativo = true
          AND UPPER(f.valorMonitorado) = UPPER(:valor)
          AND COALESCE(UPPER(f.uf), '') = COALESCE(UPPER(:uf), '')
    """)
    boolean existsAtivaDiferenteDe(
            @Param("id") UUID id,
            @Param("tipo") TipoFontePublicacaoMonitorada tipo,
            @Param("valor") String valor,
            @Param("uf") String uf
    );
}
