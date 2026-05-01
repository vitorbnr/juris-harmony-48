package com.viana.repository;

import com.viana.model.PublicacaoCapturaExecucao;
import com.viana.model.enums.FonteIntegracao;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface PublicacaoCapturaExecucaoRepository extends JpaRepository<PublicacaoCapturaExecucao, UUID> {

    List<PublicacaoCapturaExecucao> findAllByOrderByIniciadoEmDesc(Pageable pageable);

    List<PublicacaoCapturaExecucao> findByFonteAndDiarioCodigoInOrderByIniciadoEmDesc(
            FonteIntegracao fonte,
            Collection<String> diarioCodigos,
            Pageable pageable
    );

    List<PublicacaoCapturaExecucao> findByFonteAndIniciadoEmGreaterThanEqualOrderByIniciadoEmAsc(
            FonteIntegracao fonte,
            LocalDateTime iniciadoEm
    );
}
