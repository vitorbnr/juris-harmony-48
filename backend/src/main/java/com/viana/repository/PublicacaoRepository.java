package com.viana.repository;

import com.viana.model.Publicacao;
import com.viana.model.enums.StatusTratamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PublicacaoRepository extends JpaRepository<Publicacao, UUID> {

    List<Publicacao> findByStatusTratamentoOrderByDataPublicacaoDesc(StatusTratamento status);
}
