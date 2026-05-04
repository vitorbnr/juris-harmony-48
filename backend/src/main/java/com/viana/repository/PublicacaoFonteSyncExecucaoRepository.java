package com.viana.repository;

import com.viana.model.PublicacaoFonteSyncExecucao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PublicacaoFonteSyncExecucaoRepository extends JpaRepository<PublicacaoFonteSyncExecucao, UUID> {

    Optional<PublicacaoFonteSyncExecucao> findTopByFonteMonitoradaIdAndTipoExecucaoOrderByIniciadoEmDesc(
            UUID fonteMonitoradaId,
            String tipoExecucao
    );

    @Query("""
        SELECT execucao
        FROM PublicacaoFonteSyncExecucao execucao
        WHERE execucao.fonteMonitorada.id IN :fonteIds
          AND execucao.tipoExecucao = :tipoExecucao
          AND execucao.iniciadoEm = (
              SELECT MAX(ultima.iniciadoEm)
              FROM PublicacaoFonteSyncExecucao ultima
              WHERE ultima.fonteMonitorada.id = execucao.fonteMonitorada.id
                AND ultima.tipoExecucao = execucao.tipoExecucao
          )
    """)
    List<PublicacaoFonteSyncExecucao> findUltimasPorFonteAndTipoExecucao(
            @Param("fonteIds") Collection<UUID> fonteIds,
            @Param("tipoExecucao") String tipoExecucao
    );
}
