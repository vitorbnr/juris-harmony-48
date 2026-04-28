package com.viana.repository;

import com.viana.model.PublicacaoCapturaExecucao;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PublicacaoCapturaExecucaoRepository extends JpaRepository<PublicacaoCapturaExecucao, UUID> {

    List<PublicacaoCapturaExecucao> findAllByOrderByIniciadoEmDesc(Pageable pageable);
}
