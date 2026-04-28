package com.viana.repository;

import com.viana.model.PublicacaoHistorico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PublicacaoHistoricoRepository extends JpaRepository<PublicacaoHistorico, UUID> {

    List<PublicacaoHistorico> findByPublicacaoIdOrderByCriadoEmDesc(UUID publicacaoId);
}
