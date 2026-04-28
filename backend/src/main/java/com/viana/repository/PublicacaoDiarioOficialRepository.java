package com.viana.repository;

import com.viana.model.PublicacaoDiarioOficial;
import com.viana.model.enums.GrupoDiarioOficialPublicacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface PublicacaoDiarioOficialRepository extends JpaRepository<PublicacaoDiarioOficial, UUID> {

    List<PublicacaoDiarioOficial> findAllByOrderByGrupoAscUfAscNomeAsc();

    List<PublicacaoDiarioOficial> findByAtivoTrueOrderByGrupoAscUfAscNomeAsc();

    List<PublicacaoDiarioOficial> findByAtivoTrueAndRequerScrapingFalseOrderByGrupoAscUfAscNomeAsc();

    List<PublicacaoDiarioOficial> findByCodigoIn(Collection<String> codigos);

    List<PublicacaoDiarioOficial> findByGrupoAndRequerScrapingFalseAndAtivoTrueOrderByUfAscNomeAsc(
            GrupoDiarioOficialPublicacao grupo
    );
}
