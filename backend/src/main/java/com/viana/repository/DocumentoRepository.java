package com.viana.repository;

import com.viana.model.Documento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentoRepository extends JpaRepository<Documento, UUID> {

    Page<Documento> findByPastaId(UUID pastaId, Pageable pageable);

    Page<Documento> findByClienteId(UUID clienteId, Pageable pageable);

    Page<Documento> findByProcessoId(UUID processoId, Pageable pageable);

    List<Documento> findByPastaIdIsNull();
}
